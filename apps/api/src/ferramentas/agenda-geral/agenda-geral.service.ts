import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';

export interface AgendaGeralEvento {
  data: string;
  titulo: string;
  hub: string;
  bucket: 'vencido' | 'hoje' | 'semana' | 'mes' | 'futuro';
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function bucketFor(date: Date, today: Date): AgendaGeralEvento['bucket'] {
  const dias = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'hoje';
  if (dias <= 7) return 'semana';
  if (dias <= 30) return 'mes';
  return 'futuro';
}

@Injectable()
export class AgendaGeralService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const db = this.db();
    const { userId } = getRequestContext();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const janela = new Date(today.getTime() + 90 * 86_400_000);

    const [agendaItems, deadlines, exams, trainings, vacations, terminations] = await Promise.all([
      db.agendaItem.findMany({ where: { userId, concluida: false, data: { gte: today } } }),
      db.laborDeadline.findMany({ where: { cumprido: false, vencimento: { lte: janela } } }),
      db.occupationalExam.findMany({
        where: { resultado: null, dataPrevista: { lte: janela } },
        include: { employee: { select: { nome: true } } },
      }),
      db.nrTrainingRecord.findMany({ include: { employee: { select: { nome: true } } } }),
      db.vacationRequest.findMany({
        where: { status: 'APROVADA', inicio: { gte: today, lte: janela } },
        include: { employee: { select: { nome: true } } },
      }),
      db.termination.findMany({
        where: { status: 'EM_ANDAMENTO', data: { lte: janela } },
        include: { employee: { select: { nome: true } } },
      }),
    ]);

    const eventos: AgendaGeralEvento[] = [];

    for (const a of agendaItems) {
      eventos.push({ data: a.data.toISOString(), titulo: a.descricao, hub: 'Área de trabalho', bucket: bucketFor(a.data, today) });
    }
    for (const d of deadlines) {
      eventos.push({ data: d.vencimento.toISOString(), titulo: `Prazo: ${d.obrigacao}`, hub: 'DP', bucket: bucketFor(d.vencimento, today) });
    }
    for (const e of exams) {
      eventos.push({
        data: e.dataPrevista.toISOString(),
        titulo: `Exame ocupacional — ${e.employee.nome}`,
        hub: 'SST',
        bucket: bucketFor(e.dataPrevista, today),
      });
    }
    for (const t of trainings) {
      const vencimento = addMonths(t.dataRealizacao, t.validadeMeses);
      if (vencimento > janela) continue;
      eventos.push({ data: vencimento.toISOString(), titulo: `${t.curso} vence — ${t.employee.nome}`, hub: 'SST', bucket: bucketFor(vencimento, today) });
    }
    for (const v of vacations) {
      eventos.push({ data: v.inicio.toISOString(), titulo: `Início de férias — ${v.employee.nome}`, hub: 'Gestão de Pessoas', bucket: bucketFor(v.inicio, today) });
    }
    for (const t of terminations) {
      eventos.push({ data: t.data.toISOString(), titulo: `Desligamento — ${t.employee.nome}`, hub: 'Gestão de Pessoas', bucket: bucketFor(t.data, today) });
    }

    return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }
}
