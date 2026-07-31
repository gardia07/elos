import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { matches } from '../documents/documents.service';
import { anosCompletos } from '../../dp/simulacoes/constantes-trabalhistas';
import { calcularRescisao } from '../../dp/simulacoes/calculo-rescisao';
import { computeFeriasStatus } from '../vacations/vacation-cycles.util';
import { buildTerminationAlerts } from './terminations-lembretes.util';
import { DocumentTemplatesService } from '../document-templates/document-templates.service';
import {
  CreateTerminationDto,
  ExitInterviewDto,
  SendEsocialDto,
  SetTerminationChecklistDto,
  ToggleTerminationDocDto,
  UpdateTerminationStatusDto,
} from './dto/terminations.dto';

export const TIPO_LABEL: Record<string, string> = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
  JUSTA_CAUSA: 'Justa causa',
  ACORDO_MUTUO: 'Acordo mútuo (art. 484-A)',
  FIM_CONTRATO_EXPERIENCIA: 'Fim de contrato de experiência',
  APOSENTADORIA: 'Aposentadoria',
  RESCISAO_INDIRETA: 'Rescisão indireta',
  OBITO: 'Óbito',
};

/** Estado atual → estados pra onde dá pra ir a partir dele (fora o CANCELADO, que tem regra própria abaixo). */
const TRANSICOES_PERMITIDAS: Record<string, string[]> = {
  RASCUNHO: ['EM_ANDAMENTO'],
  EM_ANDAMENTO: ['AGUARDANDO_EXAME', 'PRONTO_PARA_EFETIVAR'],
  AGUARDANDO_EXAME: ['EM_ANDAMENTO'],
  PRONTO_PARA_EFETIVAR: ['EFETIVADO', 'EM_ANDAMENTO'],
  EFETIVADO: ['EM_HOMOLOGACAO', 'CONCLUIDO'],
  EM_HOMOLOGACAO: ['CONCLUIDO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

/** Cancelamento só é permitido antes de efetivar — depois disso mexe com folha/eSocial e não tem volta. */
const STATUS_PRE_EFETIVADO = [
  'RASCUNHO',
  'EM_ANDAMENTO',
  'AGUARDANDO_EXAME',
  'PRONTO_PARA_EFETIVAR',
];

const MOTIVO_MIN_LENGTH = 30;

@Injectable()
export class TerminationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly documentTemplates: DocumentTemplatesService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().termination.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const termination = await this.mustFind(id);
    const allDefs = await this.listChecklistDefs();
    const checklist = allDefs.filter((d) =>
      matches(d.aplicaTipos, termination.tipo),
    );
    const auditLog = await this.audit.listForEntity('termination', id);
    const readiness = await this.checklistReadiness(
      termination.docs as Record<string, boolean>,
      termination.tipo,
    );
    const podeEfetivar = this.podeEfetivar(termination, readiness);
    return { ...termination, checklist, auditLog, readiness, podeEfetivar };
  }

  async create(dto: CreateTerminationDto) {
    const db = this.db();
    const employee = await db.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    if (
      (dto.tipo === 'JUSTA_CAUSA' || dto.tipo === 'RESCISAO_INDIRETA') &&
      !dto.motivo?.trim()
    ) {
      throw new BadRequestException(
        'Informe o motivo detalhado para este tipo de desligamento.',
      );
    }
    if (dto.tipo === 'APOSENTADORIA' && !dto.dataBeneficioInss) {
      throw new BadRequestException('Informe a data do benefício do INSS.');
    }

    const checklistDefs = await this.listChecklistDefs();
    const docs = Object.fromEntries(
      checklistDefs
        .filter((d) => d.ativo && matches(d.aplicaTipos, dto.tipo))
        .map((d) => [d.key, false]),
    );

    const dataDesligamento = new Date(dto.data);
    const exigeHomologacao =
      anosCompletos(employee.dataAdmissao, dataDesligamento) >= 1;

    // Cria já em EM_ANDAMENTO (não RASCUNHO): o formulário de criação já pede tipo/data/motivo numa
    // tacada só, então não existe hoje uma etapa de "rascunho editável" separada no frontend — RASCUNHO
    // fica disponível no enum pra fluxos futuros, mas o caminho normal começa direto no checklist.
    const termination = await db.termination.create({
      data: {
        tenantId: getRequestContext().tenantId,
        employeeId: dto.employeeId,
        nome: employee.nome,
        cargo: employee.cargo,
        data: dataDesligamento,
        tipo: dto.tipo,
        motivo: dto.motivo,
        docs,
        status: 'EM_ANDAMENTO',
        avisoPrevioInicio: dto.avisoPrevioInicio
          ? new Date(dto.avisoPrevioInicio)
          : undefined,
        avisoPrevioTipo: dto.avisoPrevioTipo,
        dataBeneficioInss: dto.dataBeneficioInss
          ? new Date(dto.dataBeneficioInss)
          : undefined,
        exigeHomologacao,
        esocialEvento:
          dto.tipo === 'FIM_CONTRATO_EXPERIENCIA' ? 'S-2399' : 'S-2299',
      },
    });

    await db.historicoEvento.create({
      data: {
        employeeId: dto.employeeId,
        evento: `Desligamento iniciado (${TIPO_LABEL[dto.tipo]})`,
        categoria: 'Desligamento',
        autor: getRequestContext().userName,
      },
    });
    await this.audit.log('termination', termination.id, 'criado', {
      tipo: dto.tipo,
    });

    return termination;
  }

  private async listChecklistDefs() {
    return this.db().terminationChecklistDef.findMany({
      orderBy: { ordem: 'asc' },
    });
  }

  /**
   * Only items marked `bloqueante` (e aplicáveis ao tipo deste desligamento) gate conclusion —
   * informational items can stay pending without blocking.
   */
  private async checklistReadiness(
    docs: Record<string, boolean>,
    tipo: string,
  ) {
    const activeDefs = await this.db().terminationChecklistDef.findMany({
      where: { ativo: true },
    });
    const aplicaveis = activeDefs.filter((d) => matches(d.aplicaTipos, tipo));
    const pendingBlocking = aplicaveis
      .filter((d) => d.bloqueante && docs[d.key] !== true)
      .map((d) => d.nome);
    const pendingInfo = aplicaveis
      .filter((d) => !d.bloqueante && docs[d.key] !== true)
      .map((d) => d.nome);
    return {
      ready: pendingBlocking.length === 0,
      pendingBlocking,
      pendingInfo,
    };
  }

  /** Espelha `pode_efetivar` da espec: checklist bloqueante completo + cálculo gerado + motivo detalhado quando exigido. */
  private podeEfetivar(
    t: { tipo: string; motivo: string | null; calculoRescisao: unknown },
    readiness: { ready: boolean; pendingBlocking: string[] },
  ): { ready: boolean; pendentes: string[] } {
    const pendentes = [...readiness.pendingBlocking];
    if (!t.calculoRescisao)
      pendentes.push('Cálculo da rescisão ainda não gerado');
    if (
      (t.tipo === 'JUSTA_CAUSA' || t.tipo === 'RESCISAO_INDIRETA') &&
      (t.motivo?.trim().length ?? 0) < MOTIVO_MIN_LENGTH
    ) {
      pendentes.push(
        `Motivo detalhado (mínimo ${MOTIVO_MIN_LENGTH} caracteres)`,
      );
    }
    return { ready: pendentes.length === 0, pendentes };
  }

  async toggleDoc(id: string, dto: ToggleTerminationDocDto) {
    const termination = await this.mustFind(id);
    const docs = {
      ...(termination.docs as Record<string, boolean>),
      [dto.key]: dto.checked,
    };
    const updated = await this.db().termination.update({
      where: { id },
      data: { docs },
    });
    await this.audit.log(
      'termination',
      id,
      dto.checked ? 'documento_recebido' : 'documento_desmarcado',
      { key: dto.key },
    );
    return updated;
  }

  async calcular(id: string) {
    const t = await this.mustFind(id);
    const employee = await this.db().employee.findUnique({
      where: { id: t.employeeId },
      select: {
        salario: true,
        dataAdmissao: true,
        vacationRequests: {
          where: { status: 'APROVADA' },
          select: { inicio: true, fim: true, diasAbono: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const feriasStatus = computeFeriasStatus(
      employee.dataAdmissao,
      new Date(),
      employee.vacationRequests,
    );
    const resultado = calcularRescisao({
      salario: Number(employee.salario),
      dataAdmissao: employee.dataAdmissao,
      feriasSaldo: feriasStatus.saldoDisponivel,
      tipo: t.tipo,
      dataPrevista: t.data,
    });

    const updated = await this.db().termination.update({
      where: { id },
      data: { calculoRescisao: resultado },
    });
    await this.audit.log('termination', id, 'calculo_rescisao_gerado', {
      totalBruto: resultado.totalBruto,
    });
    return updated;
  }

  async sendEsocial(id: string, dto: SendEsocialDto) {
    const t = await this.mustFind(id);
    const evento = dto.evento ?? t.esocialEvento ?? 'S-2299';
    const updated = await this.db().termination.update({
      where: { id },
      data: {
        esocialSent: true,
        esocialEvento: evento,
        esocialEnviadoEm: new Date(),
        esocialProtocolo: dto.protocolo,
      },
    });
    await this.audit.log(
      'termination',
      id,
      `esocial_${evento.toLowerCase().replace('-', '_')}_enviado`,
    );
    return updated;
  }

  async generateAvisoPrevio(id: string) {
    const t = await this.mustFind(id);
    const { texto } = await this.documentTemplates.renderTerminationDoc(
      id,
      'AVISO_PREVIO',
    );
    if (!t.avisoPrevioGerado) {
      await this.db().termination.update({
        where: { id },
        data: { avisoPrevioGerado: true },
      });
      await this.audit.log('termination', id, 'aviso_previo_gerado');
    }
    return { texto };
  }

  async generateTermo(id: string) {
    const t = await this.mustFind(id);
    const { texto } = await this.documentTemplates.renderTerminationDoc(
      id,
      'TERMO_RESCISAO',
    );
    if (!t.termoGerado) {
      await this.db().termination.update({
        where: { id },
        data: { termoGerado: true },
      });
      await this.audit.log('termination', id, 'termo_rescisao_gerado');
    }
    return { texto };
  }

  async generateCarta(id: string) {
    const t = await this.mustFind(id);
    const { texto } = await this.documentTemplates.renderTerminationDoc(
      id,
      'CARTA_REFERENCIA',
    );
    if (!t.cartaGerada) {
      await this.db().termination.update({
        where: { id },
        data: { cartaGerada: true },
      });
      await this.audit.log('termination', id, 'carta_referencia_gerada');
    }
    return { texto };
  }

  /** Transições explícitas do usuário, validadas contra a tabela de estados — nada de derivação automática. */
  async updateStatus(id: string, dto: UpdateTerminationStatusDto) {
    const t = await this.mustFind(id);
    const atual = t.status;
    const novoStatus = dto.status;

    const permitido =
      novoStatus === 'CANCELADO'
        ? STATUS_PRE_EFETIVADO.includes(atual)
        : (TRANSICOES_PERMITIDAS[atual] ?? []).includes(novoStatus);
    if (!permitido) {
      throw new BadRequestException(
        `Não é possível mudar de "${atual}" para "${novoStatus}".`,
      );
    }

    if (novoStatus === 'PRONTO_PARA_EFETIVAR' || novoStatus === 'EFETIVADO') {
      const readiness = await this.checklistReadiness(
        t.docs as Record<string, boolean>,
        t.tipo,
      );
      const { ready, pendentes } = this.podeEfetivar(t, readiness);
      if (!ready) {
        throw new BadRequestException(
          `Não é possível avançar: ${pendentes.join(', ')}`,
        );
      }
    }

    const updated = await this.db().termination.update({
      where: { id },
      data: { status: novoStatus },
    });

    // Employee só vira INATIVO ao efetivar — antes disso o processo é cancelável sem deixar rastro
    // no cadastro do colaborador.
    if (novoStatus === 'EFETIVADO') {
      await this.db().employee.update({
        where: { id: t.employeeId },
        data: { status: 'INATIVO' },
      });
      await this.db().historicoEvento.create({
        data: {
          employeeId: t.employeeId,
          evento: 'Desligamento efetivado',
          categoria: 'Desligamento',
          autor: getRequestContext().userName,
        },
      });
    }

    await this.audit.log(
      'termination',
      id,
      `status_${novoStatus.toLowerCase()}`,
    );
    return updated;
  }

  async updateExitInterview(id: string, dto: ExitInterviewDto) {
    await this.mustFind(id);
    return this.db().termination.update({
      where: { id },
      data: { entrevistaDesligamento: dto as unknown as Prisma.InputJsonValue },
    });
  }

  getChecklistConfig() {
    return this.listChecklistDefs();
  }

  async setChecklistConfig(dto: SetTerminationChecklistDto) {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const results: Awaited<
      ReturnType<typeof db.terminationChecklistDef.upsert>
    >[] = [];
    for (const [ordem, item] of dto.items.entries()) {
      results.push(
        await db.terminationChecklistDef.upsert({
          where: { tenantId_key: { tenantId, key: item.key } },
          create: {
            tenantId,
            key: item.key,
            nome: item.nome,
            ativo: item.ativo,
            bloqueante: item.bloqueante ?? true,
            categoria: item.categoria ?? 'PROCESSO',
            aplicaTipos: item.aplicaTipos ?? [],
            ordem,
          },
          update: {
            nome: item.nome,
            ativo: item.ativo,
            bloqueante: item.bloqueante ?? true,
            categoria: item.categoria ?? 'PROCESSO',
            aplicaTipos: item.aplicaTipos ?? [],
            ordem,
          },
        }),
      );
    }
    return results;
  }

  lembretes() {
    return buildTerminationAlerts(this.prisma, new Date());
  }

  private async mustFind(id: string) {
    const termination = await this.db().termination.findUnique({
      where: { id },
    });
    if (!termination)
      throw new NotFoundException('Desligamento não encontrado.');
    return termination;
  }
}
