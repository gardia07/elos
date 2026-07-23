import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VacationsService } from '../rh/vacations/vacations.service';
import { TimeclockService } from '../dp/timeclock/timeclock.service';
import { RecruitmentService } from '../rh/recruitment/recruitment.service';

export interface ApprovalItem {
  id: string;
  tipo: 'FERIAS' | 'PONTO' | 'VAGA';
  hub: string;
  titulo: string;
  solicitante: string;
  valor: string | null;
  prioridade: string;
  prazo: string | null;
  slaRisco: boolean;
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  createdAt: string;
}

function daysUntil(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 86_400_000);
}

function daysSince(date: Date): number {
  return Math.round((Date.now() - date.getTime()) / 86_400_000);
}

@Injectable()
export class AprovacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vacations: VacationsService,
    private readonly timeclock: TimeclockService,
    private readonly recruitment: RecruitmentService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list(): Promise<ApprovalItem[]> {
    const db = this.db();
    const [vacationRequests, justifications, requisitions] = await Promise.all([
      db.vacationRequest.findMany({ include: { employee: { select: { nome: true } } }, orderBy: { createdAt: 'desc' } }),
      db.timeJustification.findMany({ include: { employee: { select: { nome: true } } }, orderBy: { createdAt: 'desc' } }),
      db.jobRequisition.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const items: ApprovalItem[] = [];

    for (const v of vacationRequests) {
      items.push({
        id: v.id,
        tipo: 'FERIAS',
        hub: 'Gestão de Pessoas',
        titulo: `Férias — ${v.employee.nome}`,
        solicitante: v.employee.nome,
        valor: null,
        prioridade: daysUntil(v.inicio) <= 7 ? 'Alta' : 'Normal',
        prazo: v.inicio.toISOString(),
        slaRisco: v.status === 'PENDENTE' && daysUntil(v.inicio) <= 7,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
      });
    }

    for (const j of justifications) {
      items.push({
        id: j.id,
        tipo: 'PONTO',
        hub: 'DP',
        titulo: `Ajuste de ponto — ${j.employee.nome}`,
        solicitante: j.employee.nome,
        valor: null,
        prioridade: 'Normal',
        prazo: j.data.toISOString(),
        slaRisco: j.status === 'PENDENTE' && daysSince(j.createdAt) >= 2,
        status: j.status,
        createdAt: j.createdAt.toISOString(),
      });
    }

    for (const r of requisitions) {
      items.push({
        id: r.id,
        tipo: 'VAGA',
        hub: 'Gestão de Pessoas',
        titulo: `Abertura de vaga — ${r.cargo}`,
        solicitante: r.solicitante,
        valor: r.faixaSalarial ? `R$ ${Number(r.faixaSalarial).toLocaleString('pt-BR')}/mês · ${r.contrato}` : r.contrato,
        prioridade: r.prioridade,
        prazo: null,
        slaRisco: r.status === 'PENDENTE' && (r.prioridade === 'Alta' ? daysSince(r.createdAt) >= 1 : daysSince(r.createdAt) >= 3),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      });
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async kpis() {
    const items = await this.list();
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return {
      pendentesTotal: items.filter((i) => i.status === 'PENDENTE').length,
      slaEmRisco: items.filter((i) => i.slaRisco).length,
      concluidasMes: items.filter((i) => i.status !== 'PENDENTE' && new Date(i.createdAt) >= inicioMes).length,
    };
  }

  async approve(tipo: ApprovalItem['tipo'], id: string) {
    switch (tipo) {
      case 'FERIAS':
        return this.vacations.approveRequest(id);
      case 'PONTO':
        return this.timeclock.approve(id);
      case 'VAGA':
        return this.recruitment.approveRequisition(id);
      default:
        throw new BadRequestException('Tipo de aprovação desconhecido.');
    }
  }

  async reject(tipo: ApprovalItem['tipo'], id: string) {
    switch (tipo) {
      case 'FERIAS':
        return this.vacations.rejectRequest(id);
      case 'PONTO':
        return this.timeclock.reject(id);
      case 'VAGA':
        return this.recruitment.rejectRequisition(id);
      default:
        throw new BadRequestException('Tipo de aprovação desconhecido.');
    }
  }
}
