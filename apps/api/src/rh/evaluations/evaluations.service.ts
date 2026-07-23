import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import {
  CreateCycleDto,
  CreateGoalDto,
  CreatePdiActionDto,
  UpdateGoalDto,
  UpdatePdiActionDto,
  UpsertRecordDto,
} from './dto/evaluations.dto';

function recordStatus(autoNota: number | null, gestorNota: number | null): string {
  if (autoNota != null && gestorNota != null) return 'Concluída';
  if (autoNota != null) return 'Pendente (gestor)';
  return 'Pendente';
}

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listCycles() {
    return this.db().evaluationCycle.findMany({ orderBy: { periodoInicio: 'desc' } });
  }

  createCycle(dto: CreateCycleDto) {
    return this.db().evaluationCycle.create({
      data: {
        tenantId: getRequestContext().tenantId,
        nome: dto.nome,
        periodoInicio: new Date(dto.periodoInicio),
        periodoFim: new Date(dto.periodoFim),
        modelo: dto.modelo,
      },
    });
  }

  async getRecords(cycleId: string) {
    await this.mustFindCycle(cycleId);
    const db = this.db();
    const employees = await db.employee.findMany({ where: { status: 'ATIVO' }, orderBy: { nome: 'asc' } });
    const records = await db.evaluationRecord.findMany({ where: { cycleId } });
    const byEmployee = new Map(records.map((r) => [r.employeeId, r]));

    return employees.map((e) => {
      const r = byEmployee.get(e.id);
      const autoNota = r?.autoNota != null ? Number(r.autoNota) : null;
      const gestorNota = r?.gestorNota != null ? Number(r.gestorNota) : null;
      return {
        employeeId: e.id,
        nome: e.nome,
        departamento: e.departamento,
        autoNota,
        gestorNota,
        status: recordStatus(autoNota, gestorNota),
      };
    });
  }

  async upsertRecord(cycleId: string, employeeId: string, dto: UpsertRecordDto) {
    await this.mustFindCycle(cycleId);
    const db = this.db();
    return db.evaluationRecord.upsert({
      where: { cycleId_employeeId: { cycleId, employeeId } },
      create: { tenantId: getRequestContext().tenantId, cycleId, employeeId, autoNota: dto.autoNota, gestorNota: dto.gestorNota },
      update: { ...(dto.autoNota !== undefined ? { autoNota: dto.autoNota } : {}), ...(dto.gestorNota !== undefined ? { gestorNota: dto.gestorNota } : {}) },
    });
  }

  async getSummary(cycleId: string) {
    const records = await this.getRecords(cycleId);
    const ativos = records.length;
    const concluidas = records.filter((r) => r.status === 'Concluída').length;
    const autoRespondidas = records.filter((r) => r.autoNota != null).length;
    const progresso = ativos ? Math.round((autoRespondidas / ativos) * 100) : 0;

    const avaliados = records.filter((r) => r.gestorNota != null || r.autoNota != null);
    const notaMedia = avaliados.length
      ? avaliados.reduce((sum, r) => sum + (r.gestorNota ?? r.autoNota ?? 0), 0) / avaliados.length
      : 0;

    const deptoMap = new Map<string, number[]>();
    for (const r of avaliados) {
      const nota = r.gestorNota ?? r.autoNota ?? 0;
      const list = deptoMap.get(r.departamento) ?? [];
      list.push(nota);
      deptoMap.set(r.departamento, list);
    }
    const notaPorDepto = Array.from(deptoMap.entries()).map(([departamento, notas]) => {
      const media = notas.reduce((a, b) => a + b, 0) / notas.length;
      return { departamento, nota: Number(media.toFixed(1)), pct: Math.round((media / 5) * 100) };
    });

    const distribuicaoPerformance = {
      acima: avaliados.filter((r) => (r.gestorNota ?? r.autoNota ?? 0) >= 4.5).length,
      dentro: avaliados.filter((r) => {
        const n = r.gestorNota ?? r.autoNota ?? 0;
        return n >= 3.5 && n < 4.5;
      }).length,
      abaixo: avaliados.filter((r) => (r.gestorNota ?? r.autoNota ?? 0) < 3.5).length,
    };

    return {
      concluidas,
      total: ativos,
      pctConcluidas: ativos ? Math.round((concluidas / ativos) * 100) : 0,
      notaMedia: Number(notaMedia.toFixed(1)),
      progresso,
      notaPorDepto,
      distribuicaoPerformance,
    };
  }

  async listGoals(cycleId: string) {
    return this.db().goal.findMany({ where: { cycleId }, include: { employee: true }, orderBy: { createdAt: 'desc' } });
  }

  async createGoal(cycleId: string, dto: CreateGoalDto) {
    await this.mustFindCycle(cycleId);
    return this.db().goal.create({
      data: { cycleId, employeeId: dto.employeeId, texto: dto.texto, tenantId: getRequestContext().tenantId },
    });
  }

  updateGoal(id: string, dto: UpdateGoalDto) {
    return this.db().goal.update({ where: { id }, data: { status: dto.status } });
  }

  listPdi(employeeId: string) {
    return this.db().pdiAction.findMany({ where: { employeeId }, orderBy: { prazo: 'asc' } });
  }

  createPdiAction(employeeId: string, dto: CreatePdiActionDto) {
    return this.db().pdiAction.create({
      data: { employeeId, texto: dto.texto, prazo: new Date(dto.prazo), tenantId: getRequestContext().tenantId },
    });
  }

  updatePdiAction(id: string, dto: UpdatePdiActionDto) {
    return this.db().pdiAction.update({ where: { id }, data: { done: dto.done } });
  }

  private async mustFindCycle(id: string) {
    const cycle = await this.db().evaluationCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Ciclo não encontrado.');
    return cycle;
  }
}
