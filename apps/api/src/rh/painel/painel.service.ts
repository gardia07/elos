import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function idade(nascimento: Date, hoje: Date): number {
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversario) anos -= 1;
  return anos;
}

function faixaEtaria(idadeAnos: number): string {
  if (idadeAnos < 25) return 'Até 24 anos';
  if (idadeAnos < 35) return '25 a 34 anos';
  if (idadeAnos < 45) return '35 a 44 anos';
  if (idadeAnos < 55) return '45 a 54 anos';
  return '55 anos ou mais';
}

function faixaTempoDeCasa(meses: number): string {
  if (meses < 12) return 'Até 1 ano';
  if (meses < 36) return '1 a 3 anos';
  if (meses < 60) return '3 a 5 anos';
  if (meses < 120) return '5 a 10 anos';
  return 'Mais de 10 anos';
}

function groupBy(values: (string | null | undefined)[], fallback = 'Não informado') {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v?.trim() || fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = values.length || 1;
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, total: count, percentual: Math.round((1000 * count) / total) / 10 }))
    .sort((a, b) => b.total - a.total);
}

const MESES_SERIE = 12;

@Injectable()
export class PainelService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async get() {
    const db = this.db();
    const hoje = new Date();
    const inicioMesAtual = startOfMonth(hoje.getFullYear(), hoje.getMonth());
    const fimMesAtual = endOfMonth(hoje.getFullYear(), hoje.getMonth());
    const inicioSerie = startOfMonth(hoje.getFullYear(), hoje.getMonth() - MESES_SERIE);

    const [
      employees,
      terminationsSerie,
      vacationsAprovadas,
      leaveRecords,
      documentosVencidos,
      examesPendentes,
      justificativasPonto,
    ] = await Promise.all([
      db.employee.findMany({
        select: {
          id: true,
          status: true,
          dataAdmissao: true,
          departamento: true,
          filial: true,
          genero: true,
          dataNascimento: true,
          escolaridade: true,
        },
      }),
      db.termination.findMany({
        where: { status: { not: 'CANCELADO' }, data: { gte: inicioSerie } },
        select: { employeeId: true, data: true },
      }),
      db.vacationRequest.findMany({
        where: { status: 'APROVADA', inicio: { lte: hoje }, fim: { gte: hoje } },
        select: { employeeId: true },
      }),
      db.leaveRecord.findMany({
        where: { OR: [{ retorno: null }, { retorno: { gte: hoje } }], inicio: { lte: hoje } },
        select: { employeeId: true },
      }),
      db.employeeDocumentRequirement.count({
        where: { status: 'EXPIRED', employee: { status: 'ATIVO' } },
      }),
      db.occupationalExam.count({
        where: { dataRealizada: null, dataPrevista: { lt: hoje } },
      }),
      db.timeJustification.findMany({
        where: { data: { gte: inicioSerie } },
        select: { data: true, ocorrencia: true },
      }),
    ]);

    // Necessário para o headcount do mês anterior ao início da série (linha de base do turnover).
    const terminationsTodasAteHoje = await db.termination.findMany({
      where: { status: { not: 'CANCELADO' }, data: { lt: inicioSerie } },
      select: { employeeId: true, data: true },
    });
    const terminationByEmployee = new Map<string, Date>();
    for (const t of [...terminationsTodasAteHoje, ...terminationsSerie]) {
      terminationByEmployee.set(t.employeeId, t.data);
    }

    const colaboradoresAtivos = employees.filter((e) => e.status === 'ATIVO').length;

    const admissoesNoMes = employees.filter(
      (e) => e.dataAdmissao >= inicioMesAtual && e.dataAdmissao <= fimMesAtual,
    ).length;

    const desligamentosNoMes = terminationsSerie.filter(
      (t) => t.data >= inicioMesAtual && t.data <= fimMesAtual,
    ).length;

    const idsEmFerias = new Set(vacationsAprovadas.map((v) => v.employeeId));
    const idsEmAfastamento = new Set(leaveRecords.map((l) => l.employeeId));

    const [processosDesligamentoAbertos] = await Promise.all([
      db.termination.count({ where: { status: { notIn: ['CONCLUIDO', 'CANCELADO'] } } }),
    ]);

    // Série mensal: headcount no fim de cada mês (inclui um mês extra antes do início da
    // série para servir de linha de base do turnover do primeiro mês exibido).
    const headcountFimMes: { mes: string; total: number }[] = [];
    for (let i = MESES_SERIE; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const cutoff = endOfMonth(ref.getFullYear(), ref.getMonth());
      const total = employees.filter((e) => {
        if (e.dataAdmissao > cutoff) return false;
        const saida = terminationByEmployee.get(e.id);
        return !saida || saida > cutoff;
      }).length;
      headcountFimMes.push({ mes: monthKey(ref), total });
    }

    const admissoesDesligamentosPorMes: { mes: string; admissoes: number; desligamentos: number }[] = [];
    const turnoverPorMes: { mes: string; percentual: number }[] = [];
    for (let i = MESES_SERIE - 1; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesInicio = startOfMonth(ref.getFullYear(), ref.getMonth());
      const mesFim = endOfMonth(ref.getFullYear(), ref.getMonth());
      const mes = monthKey(ref);

      const admissoes = employees.filter((e) => e.dataAdmissao >= mesInicio && e.dataAdmissao <= mesFim).length;
      const desligamentos = terminationsSerie.filter((t) => t.data >= mesInicio && t.data <= mesFim).length;
      admissoesDesligamentosPorMes.push({ mes, admissoes, desligamentos });

      const headcountAnterior = headcountFimMes.find((h) => h.mes === monthKey(new Date(ref.getFullYear(), ref.getMonth() - 1, 1)))?.total ?? 0;
      const headcountAtual = headcountFimMes.find((h) => h.mes === mes)?.total ?? 0;
      const headcountMedio = (headcountAnterior + headcountAtual) / 2;
      const percentual = headcountMedio > 0 ? Math.round((1000 * desligamentos) / headcountMedio) / 10 : 0;
      turnoverPorMes.push({ mes, percentual });
    }

    const ativos = employees.filter((e) => e.status === 'ATIVO');

    const porDepartamento = groupBy(ativos.map((e) => e.departamento));
    const porFilial = groupBy(ativos.map((e) => e.filial));
    const porGenero = groupBy(ativos.map((e) => e.genero));
    const porEscolaridade = groupBy(ativos.map((e) => e.escolaridade));

    const porFaixaEtaria = groupBy(
      ativos.map((e) => (e.dataNascimento ? faixaEtaria(idade(e.dataNascimento, hoje)) : null)),
    );

    const temposDeCasaMeses = ativos.map((e) => {
      const diffMs = hoje.getTime() - e.dataAdmissao.getTime();
      return diffMs / (1000 * 60 * 60 * 24 * 30.44);
    });
    const tempoMedioMeses = temposDeCasaMeses.length
      ? temposDeCasaMeses.reduce((a, b) => a + b, 0) / temposDeCasaMeses.length
      : 0;
    const tempoDeCasaPorFaixa = groupBy(temposDeCasaMeses.map((m) => faixaTempoDeCasa(m)));

    // Absenteísmo: proxy a partir de justificativas de ponto cuja ocorrência menciona falta.
    // Não há registro de ponto/REP-P completo (entradas/saídas) no sistema hoje — é uma
    // estimativa, não uma taxa de absenteísmo formal, e some quando não há justificativas.
    const faltasPorMes = new Map<string, number>();
    for (const j of justificativasPonto) {
      if (!/falta/i.test(j.ocorrencia)) continue;
      const key = monthKey(j.data);
      faltasPorMes.set(key, (faltasPorMes.get(key) ?? 0) + 1);
    }
    const absenteismoDisponivel = justificativasPonto.length > 0;
    const absenteismoPorMes: { mes: string; percentual: number }[] = [];
    if (absenteismoDisponivel) {
      for (let i = MESES_SERIE - 1; i >= 0; i--) {
        const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = monthKey(ref);
        const headcountAtual = headcountFimMes.find((h) => h.mes === mes)?.total ?? colaboradoresAtivos;
        const faltas = faltasPorMes.get(mes) ?? 0;
        const percentual = headcountAtual > 0 ? Math.round((1000 * faltas) / headcountAtual) / 10 : 0;
        absenteismoPorMes.push({ mes, percentual });
      }
    }

    return {
      cards: {
        colaboradoresAtivos,
        admissoesNoMes,
        desligamentosNoMes,
        emFerias: idsEmFerias.size,
        emAfastamento: idsEmAfastamento.size,
        processosDesligamentoAbertos,
        pendenciasCriticasDp: documentosVencidos + examesPendentes,
        pendenciasCriticasDpDetalhe: { documentosVencidos, examesPendentes },
      },
      admissoesDesligamentosPorMes,
      turnoverPorMes,
      porDepartamento,
      porFilial,
      porGenero,
      porFaixaEtaria,
      porEscolaridade,
      tempoDeCasa: {
        mediaMeses: Math.round(tempoMedioMeses * 10) / 10,
        porFaixa: tempoDeCasaPorFaixa,
      },
      absenteismo: {
        disponivel: absenteismoDisponivel,
        porMes: absenteismoPorMes,
      },
    };
  }
}
