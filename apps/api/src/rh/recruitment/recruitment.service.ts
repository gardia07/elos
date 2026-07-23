import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import {
  CreateJobDto,
  CreateCandidateDto,
  UpdateScorecardDto,
  UpdateCandidateDto,
  CreateJobCostDto,
  CreateRequisitionDto,
  ScheduleInterviewDto,
} from './dto/recruitment.dto';

const STAGE_ORDER = ['TRIAGEM', 'ENTREVISTA', 'PROPOSTA', 'CONTRATADO'] as const;

const DEPTO_TO_FILIAL: Record<string, string> = {
  TI: 'Matriz SP',
  'Gestão de Pessoas': 'Matriz SP',
  Comercial: 'Filial RJ',
  Financeiro: 'Filial MG',
};

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listJobs() {
    return this.db().recruitmentJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { candidates: true } } },
    });
  }

  createJob(dto: CreateJobDto) {
    return this.db().recruitmentJob.create({
      data: { ...dto, status: 'ABERTA', tenantId: getRequestContext().tenantId },
    });
  }

  async getJob(id: string) {
    const job = await this.db().recruitmentJob.findUnique({
      where: { id },
      include: {
        candidates: { orderBy: { createdAt: 'asc' } },
        costs: { orderBy: { createdAt: 'desc' } },
        scheduledInterviews: { include: { candidate: true } },
      },
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');

    const kanban: Record<string, typeof job.candidates> = {
      TRIAGEM: [], ENTREVISTA: [], PROPOSTA: [], CONTRATADO: [], REPROVADO: [],
    };
    for (const c of job.candidates) kanban[c.stage].push(c);

    const costTotal = job.costs.reduce((sum, c) => sum + Number(c.valor), 0);
    const hires = kanban.CONTRATADO.length || 1;
    const costPerHire = costTotal / hires;

    return { ...job, kanban, costTotal, costPerHire };
  }

  async addCandidate(jobId: string, dto: CreateCandidateDto) {
    await this.mustFindJob(jobId);
    return this.db().candidate.create({
      data: { jobId, nome: dto.nome, origem: dto.origem, stage: 'TRIAGEM', tenantId: getRequestContext().tenantId },
    });
  }

  async advanceCandidate(candidateId: string, salario?: number) {
    const db = this.db();
    const candidate = await db.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate) throw new NotFoundException('Candidato não encontrado.');

    const idx = STAGE_ORDER.indexOf(candidate.stage as (typeof STAGE_ORDER)[number]);
    if (idx === -1 || idx === STAGE_ORDER.length - 1) {
      throw new BadRequestException('Candidato já está na última etapa do pipeline.');
    }
    const nextStage = STAGE_ORDER[idx + 1];

    const updated = await db.candidate.update({ where: { id: candidateId }, data: { stage: nextStage } });

    if (nextStage === 'CONTRATADO') {
      await this.hireCandidate(candidate.job, candidate, salario);
    }

    return updated;
  }

  private async hireCandidate(
    job: { id: string; cargo: string; depto: string },
    candidate: { id: string; nome: string },
    salario?: number,
  ) {
    const db = this.db();
    const filial = DEPTO_TO_FILIAL[job.depto] ?? 'Matriz SP';
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() + 14);

    const checklistDefs = await db.checklistItemDef.findMany({
      where: { scope: 'ADMISSAO', filial, ativo: true },
    });
    const docs = Object.fromEntries(checklistDefs.map((d) => [d.key, false]));

    const admission = await db.admission.create({
      data: {
        tenantId: getRequestContext().tenantId,
        nome: candidate.nome,
        cargo: job.cargo,
        filial,
        dataInicio,
        status: 'PENDENTE_DOCUMENTO',
        origemVaga: `${job.cargo} — candidato aprovado no Recrutamento & Seleção`,
        salario: salario ?? 0,
        docs,
      },
    });

    await this.audit.log('candidate', candidate.id, 'hired', { jobId: job.id, admissionId: admission.id });
    return admission;
  }

  async rejectCandidate(candidateId: string) {
    await this.mustFindCandidate(candidateId);
    return this.db().candidate.update({ where: { id: candidateId }, data: { stage: 'REPROVADO' } });
  }

  async moveToTalentBank(candidateId: string) {
    const db = this.db();
    const candidate = await db.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate) throw new NotFoundException('Candidato não encontrado.');

    await db.candidatePoolEntry.create({
      data: {
        tenantId: getRequestContext().tenantId,
        type: 'TALENT_BANK',
        nome: candidate.nome,
        perfil: candidate.resumo ?? candidate.job.cargo,
        vagaAnterior: candidate.job.cargo,
      },
    });
    await db.candidate.delete({ where: { id: candidateId } });
    return { ok: true };
  }

  async blockCandidate(candidateId: string, motivo?: string) {
    const db = this.db();
    const candidate = await db.candidate.findUnique({ where: { id: candidateId }, include: { job: true } });
    if (!candidate) throw new NotFoundException('Candidato não encontrado.');

    await db.candidatePoolEntry.create({
      data: {
        tenantId: getRequestContext().tenantId,
        type: 'BLOCKED',
        nome: candidate.nome,
        vagaAnterior: candidate.job.cargo,
        motivo: motivo?.trim() || 'Não recomendado para futuras contratações',
      },
    });
    await db.candidate.delete({ where: { id: candidateId } });
    return { ok: true };
  }

  updateScorecard(candidateId: string, dto: UpdateScorecardDto) {
    return this.db().candidate.update({
      where: { id: candidateId },
      data: {
        scoreComunicacao: dto.comunicacao,
        scoreTecnica: dto.tecnica,
        scoreCultura: dto.cultura,
      },
    });
  }

  updateCandidate(candidateId: string, dto: UpdateCandidateDto) {
    return this.db().candidate.update({ where: { id: candidateId }, data: dto });
  }

  async addCost(jobId: string, dto: CreateJobCostDto) {
    await this.mustFindJob(jobId);
    return this.db().jobCost.create({
      data: { jobId, categoria: dto.categoria, descricao: dto.descricao, valor: dto.valor, tenantId: getRequestContext().tenantId },
    });
  }

  listRequisitions() {
    return this.db().jobRequisition.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createRequisition(dto: CreateRequisitionDto) {
    return this.db().jobRequisition.create({ data: { ...dto, tenantId: getRequestContext().tenantId } });
  }

  async approveRequisition(id: string) {
    const db = this.db();
    const requisition = await this.mustFindPendingRequisition(id);
    const job = await db.recruitmentJob.create({
      data: { tenantId: getRequestContext().tenantId, cargo: requisition.cargo, depto: requisition.depto, contrato: requisition.contrato },
    });
    const updated = await db.jobRequisition.update({
      where: { id },
      data: { status: 'APROVADA', respondidoEm: new Date() },
    });
    await this.audit.log('job_requisition', id, 'aprovada', { jobId: job.id });
    return { ...updated, jobId: job.id };
  }

  async rejectRequisition(id: string) {
    await this.mustFindPendingRequisition(id);
    const updated = await this.db().jobRequisition.update({
      where: { id },
      data: { status: 'RECUSADA', respondidoEm: new Date() },
    });
    await this.audit.log('job_requisition', id, 'recusada');
    return updated;
  }

  private async mustFindPendingRequisition(id: string) {
    const requisition = await this.db().jobRequisition.findUnique({ where: { id } });
    if (!requisition) throw new NotFoundException('Requisição não encontrada.');
    if (requisition.status !== 'PENDENTE') throw new BadRequestException('Requisição já foi respondida.');
    return requisition;
  }

  async scheduleInterview(jobId: string, dto: ScheduleInterviewDto) {
    await this.mustFindJob(jobId);
    return this.db().scheduledInterview.create({
      data: { jobId, candidateId: dto.candidateId, dataLabel: dto.dataLabel, hora: dto.hora, tenantId: getRequestContext().tenantId },
    });
  }

  listPool(type: 'TALENT_BANK' | 'BLOCKED') {
    return this.db().candidatePoolEntry.findMany({ where: { type }, orderBy: { createdAt: 'desc' } });
  }

  private async mustFindJob(id: string) {
    const job = await this.db().recruitmentJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  private async mustFindCandidate(id: string) {
    const candidate = await this.db().candidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidato não encontrado.');
    return candidate;
  }
}
