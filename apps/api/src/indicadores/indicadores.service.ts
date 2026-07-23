import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

@Injectable()
export class IndicadoresService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async headcount() {
    const db = this.db();
    const [employees, terminations] = await Promise.all([
      db.employee.findMany({ select: { id: true, dataAdmissao: true, departamento: true } }),
      db.termination.findMany({ select: { employeeId: true, data: true } }),
    ]);
    const terminationByEmployee = new Map(terminations.map((t) => [t.employeeId, t.data]));

    const today = new Date();
    const meses: { mes: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const cutoff = endOfMonth(ref.getFullYear(), ref.getMonth());
      const total = employees.filter((e) => {
        if (e.dataAdmissao > cutoff) return false;
        const saida = terminationByEmployee.get(e.id);
        return !saida || saida > cutoff;
      }).length;
      meses.push({ mes: monthKey(ref), total });
    }
    return meses;
  }

  async custoMedioContratacao() {
    const db = this.db();
    const jobs = await db.recruitmentJob.findMany({ include: { costs: true } });
    const comCusto = jobs.filter((j) => j.costs.length > 0);
    if (comCusto.length === 0) return { custoMedio: 0, vagasComCusto: 0 };
    const total = comCusto.reduce((sum, j) => sum + j.costs.reduce((s, c) => s + Number(c.valor), 0), 0);
    return { custoMedio: Math.round(total / comCusto.length), vagasComCusto: comCusto.length };
  }

  async turnover() {
    const db = this.db();
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);

    const [employees, terminations] = await Promise.all([
      db.employee.findMany({ select: { id: true, departamento: true, status: true } }),
      db.termination.findMany({ where: { data: { gte: inicio } }, select: { employeeId: true, data: true } }),
    ]);
    const employeeDept = new Map(employees.map((e) => [e.id, e.departamento]));

    const headcountAtual = employees.filter((e) => e.status === 'ATIVO').length;
    const geral = headcountAtual ? Math.round((1000 * terminations.length) / headcountAtual) / 10 : 0;

    const porDepartamento = new Map<string, { saidas: number; headcount: number }>();
    for (const e of employees) {
      const entry = porDepartamento.get(e.departamento) ?? { saidas: 0, headcount: 0 };
      if (e.status === 'ATIVO') entry.headcount += 1;
      porDepartamento.set(e.departamento, entry);
    }
    for (const t of terminations) {
      const depto = employeeDept.get(t.employeeId);
      if (!depto) continue;
      const entry = porDepartamento.get(depto) ?? { saidas: 0, headcount: 0 };
      entry.saidas += 1;
      porDepartamento.set(depto, entry);
    }

    return {
      geral,
      porDepartamento: Array.from(porDepartamento.entries()).map(([departamento, v]) => ({
        departamento,
        percentual: v.headcount ? Math.round((1000 * v.saidas) / Math.max(v.headcount, 1)) / 10 : 0,
        saidas: v.saidas,
      })),
    };
  }

  async diversidade() {
    const db = this.db();
    const [employees, gradesLideranca] = await Promise.all([
      db.employee.findMany({ where: { status: 'ATIVO' }, select: { genero: true, pcd: true, racaCor: true, cargo: true } }),
      db.jobGrade.findMany({ where: { nivel: { contains: 'lideran', mode: 'insensitive' } }, select: { cargo: true } }),
    ]);

    const total = employees.length || 1;
    const groupBy = (values: (string | null)[]) => {
      const counts = new Map<string, number>();
      for (const v of values) {
        const key = v?.trim() || 'Não informado';
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([label, count]) => ({ label, total: count, percentual: Math.round((1000 * count) / total) / 10 }));
    };

    const pcdCount = employees.filter((e) => e.pcd).length;
    const liderancaConfigurada = gradesLideranca.length > 0;
    const cargosLideranca = new Set(gradesLideranca.map((g) => g.cargo));
    const emLideranca = employees.filter((e) => cargosLideranca.has(e.cargo));
    const mulheresLideranca = emLideranca.filter((e) => (e.genero ?? '').toLowerCase().startsWith('femin'));

    return {
      porGenero: groupBy(employees.map((e) => e.genero)),
      porRacaCor: groupBy(employees.map((e) => e.racaCor)),
      pcdPercentual: Math.round((1000 * pcdCount) / total) / 10,
      liderancaConfigurada,
      totalLideranca: emLideranca.length,
      mulheresLiderancaPercentual: liderancaConfigurada && emLideranca.length ? Math.round((1000 * mulheresLideranca.length) / emLideranca.length) / 10 : null,
    };
  }
}
