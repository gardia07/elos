import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCiclosAquisitivos, TIPO_AFASTAMENTO_SUSPENSIVO, type AfastamentoParaCiclo } from './regras-ferias.util';

function hojeUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Garante diariamente que todo colaborador ativo, de todo tenant, tem os
 * PeriodoAquisitivo criados até o ciclo em andamento -- sem isso, um período
 * novo só apareceria na próxima vez que alguém abrisse a ficha daquele
 * colaborador especificamente (FeriasService.garantirPeriodos já faz isso sob
 * demanda, este cron é o que mantém as listagens amplas — Visão Geral, abas
 * por status — sempre em dia mesmo pra quem ninguém abriu a ficha ainda hoje).
 */
@Injectable()
export class FeriasCronService {
  private readonly logger = new Logger(FeriasCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 6 * * *', { timeZone: 'America/Sao_Paulo' })
  async garantirPeriodosDeTodosOsTenants() {
    const hoje = hojeUtc();
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    for (const t of tenants) {
      const db = this.prisma.forTenant(t.id);
      const employees = await db.employee.findMany({ where: { status: 'ATIVO' }, select: { id: true, dataAdmissao: true } });
      if (employees.length === 0) continue;

      const existentes = await db.periodoAquisitivo.findMany({
        where: { employeeId: { in: employees.map((e) => e.id) } },
        select: { employeeId: true, numero: true },
      });
      const numerosPorEmployee = new Map<string, Set<number>>();
      for (const p of existentes) {
        if (!numerosPorEmployee.has(p.employeeId)) numerosPorEmployee.set(p.employeeId, new Set());
        numerosPorEmployee.get(p.employeeId)!.add(p.numero);
      }

      const afastamentos = await db.leaveRecord.findMany({
        where: { employeeId: { in: employees.map((e) => e.id) }, tipo: TIPO_AFASTAMENTO_SUSPENSIVO },
        select: { id: true, employeeId: true, tipo: true, inicio: true, retorno: true },
      });
      const afastamentosPorEmployee = new Map<string, AfastamentoParaCiclo[]>();
      for (const a of afastamentos) {
        if (!afastamentosPorEmployee.has(a.employeeId)) afastamentosPorEmployee.set(a.employeeId, []);
        afastamentosPorEmployee.get(a.employeeId)!.push(a);
      }

      const novos = employees.flatMap((e) => {
        const ciclos = buildCiclosAquisitivos(e.dataAdmissao, hoje, afastamentosPorEmployee.get(e.id) ?? []);
        const numerosExistentes = numerosPorEmployee.get(e.id) ?? new Set();
        return ciclos
          .filter((c) => !numerosExistentes.has(c.numero))
          .map((c) => ({
            tenantId: t.id,
            employeeId: e.id,
            numero: c.numero,
            dataInicio: c.dataInicio,
            dataFim: c.dataFim,
            origemSuspensaoId: c.origemSuspensaoLeaveRecordId ?? null,
          }));
      });

      if (novos.length > 0) {
        await db.periodoAquisitivo.createMany({ data: novos });
        this.logger.log(`${novos.length} novo(s) período(s) aquisitivo(s) criado(s) para o tenant ${t.id}`);
      }
    }
  }
}
