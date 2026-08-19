/**
 * Backfill único: reconstrói todos os PeriodoAquisitivo de todo colaborador,
 * de todo tenant, desde a dataAdmissao até hoje, e reloca os VacationRequest
 * existentes (histórico) pra dentro do período aquisitivo correto como
 * FracaoDeFerias. Não apaga nem altera VacationRequest -- só lê de lá.
 *
 * Idempotente: pode rodar de novo sem duplicar (pula período/fração já
 * existente). Rodar com: npx ts-node src/rh/ferias/backfill-ferias.script.ts
 */
import 'dotenv/config';
import { PrismaService } from '../../prisma/prisma.service';
import { buildCiclosAquisitivos, encontrarPeriodoPorDataDeUso, inclusiveDays, TIPO_AFASTAMENTO_SUSPENSIVO, type CicloAquisitivo } from './regras-ferias.util';

function hojeUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function mapStatusVacationRequest(
  vr: { status: string; inicio: Date; fim: Date },
  hoje: Date,
): 'PENDENTE' | 'APROVADA' | 'REPROVADA' {
  if (vr.status === 'PENDENTE') return 'PENDENTE';
  if (vr.status === 'RECUSADA') return 'REPROVADA';
  return 'APROVADA'; // statusEfetivoFracao deriva EM_ANDAMENTO/CONCLUIDA em tempo de leitura
}

interface Resultado {
  periodosCriados: number;
  fracoesCriadas: number;
  fracoesNaoMapeadas: { employeeNome: string; vacationRequestId: string; inicio: string }[];
}

async function backfillTenant(prisma: PrismaService, tenantId: string, hoje: Date, resultado: Resultado) {
  const db = prisma.forTenant(tenantId);
  const employees = await db.employee.findMany({ select: { id: true, nome: true, dataAdmissao: true } });

  for (const emp of employees) {
    const afastamentos = await db.leaveRecord.findMany({
      where: { employeeId: emp.id, tipo: TIPO_AFASTAMENTO_SUSPENSIVO },
      select: { id: true, tipo: true, inicio: true, retorno: true },
    });
    const ciclos: CicloAquisitivo[] = buildCiclosAquisitivos(emp.dataAdmissao, hoje, afastamentos);

    const existentes = await db.periodoAquisitivo.findMany({ where: { employeeId: emp.id }, select: { numero: true, id: true } });
    const idPorNumero = new Map(existentes.map((p) => [p.numero, p.id]));

    for (const ciclo of ciclos) {
      if (idPorNumero.has(ciclo.numero)) continue;
      const criado = await db.periodoAquisitivo.create({
        data: {
          tenantId,
          employeeId: emp.id,
          numero: ciclo.numero,
          dataInicio: ciclo.dataInicio,
          dataFim: ciclo.dataFim,
          origemSuspensaoId: ciclo.origemSuspensaoLeaveRecordId ?? null,
        },
      });
      idPorNumero.set(ciclo.numero, criado.id);
      resultado.periodosCriados++;
    }

    const vacationRequests = await db.vacationRequest.findMany({ where: { employeeId: emp.id } });
    for (const vr of vacationRequests) {
      const ciclo = encontrarPeriodoPorDataDeUso(ciclos, vr.inicio);
      if (!ciclo) {
        resultado.fracoesNaoMapeadas.push({ employeeNome: emp.nome, vacationRequestId: vr.id, inicio: vr.inicio.toISOString().slice(0, 10) });
        continue;
      }
      const periodoAquisitivoId = idPorNumero.get(ciclo.numero)!;

      const jaExiste = await db.fracaoDeFerias.findFirst({
        where: { periodoAquisitivoId, dataInicio: vr.inicio, dataFim: vr.fim },
      });
      if (jaExiste) continue;

      await db.fracaoDeFerias.create({
        data: {
          tenantId,
          periodoAquisitivoId,
          tipo: 'NORMAL',
          dataInicio: vr.inicio,
          dataFim: vr.fim,
          dias: inclusiveDays(vr.inicio, vr.fim),
          diasAbono: vr.diasAbono,
          status: mapStatusVacationRequest(vr, hoje),
          avisoFormalizadoEm: vr.createdAt,
        },
      });
      resultado.fracoesCriadas++;
    }
  }
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const hoje = hojeUtc();
  const resultado: Resultado = { periodosCriados: 0, fracoesCriadas: 0, fracoesNaoMapeadas: [] };

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    console.log(`[backfill] tenant ${t.name} (${t.id})...`);
    await backfillTenant(prisma, t.id, hoje, resultado);
  }

  await prisma.$disconnect();

  console.log('\n[backfill] concluído.');
  console.log(`  Períodos aquisitivos criados: ${resultado.periodosCriados}`);
  console.log(`  Frações de férias migradas:   ${resultado.fracoesCriadas}`);
  if (resultado.fracoesNaoMapeadas.length > 0) {
    console.log(`  Não mapeadas (${resultado.fracoesNaoMapeadas.length}) — revisar manualmente:`);
    for (const r of resultado.fracoesNaoMapeadas) console.log(`    - ${r.employeeNome} · VacationRequest ${r.vacationRequestId} · início ${r.inicio}`);
  }
}

main().catch((e) => {
  console.error('[backfill] falhou:', e);
  process.exit(1);
});
