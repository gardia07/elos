import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

function hojeUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type TenantDb = ReturnType<PrismaService['forTenant']>;

/**
 * Cron do Motor de Conformidade Documental. Roda fora de um request HTTP
 * (sem tenant no AsyncLocalStorage), por isso usa `prisma.forTenant(id)`
 * diretamente em vez de `ComplianceEngineService` (que depende de
 * `getRequestContext()`) -- mesmo padrão de FeriasCronService.
 */
@Injectable()
export class ComplianceEngineCronService {
  private readonly logger = new Logger(ComplianceEngineCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Diariamente, marca como Vencida toda Pendência que passou da
   * data_limite sem conclusão (regra de negócio 4.6 da especificação). Sem
   * isso, uma pendência só "venceria" na próxima vez que alguém lesse a
   * lista -- este cron mantém o Índice de Conformidade e o Risco Geral
   * corretos mesmo sem ninguém abrir a tela.
   */
  @Cron('30 6 * * *', { timeZone: 'America/Sao_Paulo' })
  async marcarPendenciasVencidasDeTodosOsTenants() {
    const hoje = hojeUtc();
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    for (const t of tenants) {
      const db = this.prisma.forTenant(t.id);
      const { count } = await db.pendencia.updateMany({
        where: {
          status: { in: ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_ASSINATURA'] },
          dataLimite: { lt: hoje },
        },
        data: { status: 'VENCIDA' },
      });
      if (count > 0) {
        this.logger.log(`${count} pendência(s) de conformidade marcada(s) como vencida(s) para o tenant ${t.id}`);
      }
    }
  }

  /**
   * ASO periódico e treinamento de NR não são disparados por uma escrita --
   * são uma condição por data (validade cruzando "hoje"), recalculada toda
   * leitura, nunca persistida. Este cron varre diariamente e registra o
   * evento (ASO_PERIODICO_VENCIDO / TREINAMENTO_NR_VENCIDO) na primeira vez
   * que detecta o vencimento -- a checagem de "já existe pendência ativa
   * para este documento" evita registrar de novo todo dia enquanto ninguém
   * resolve.
   */
  @Cron('45 6 * * *', { timeZone: 'America/Sao_Paulo' })
  async detectarVencimentosDeTodosOsTenants() {
    const hoje = hojeUtc();
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    for (const t of tenants) {
      const db = this.prisma.forTenant(t.id);

      const examesVencidos = await db.occupationalExam.findMany({
        where: { tipo: 'PERIODICO', dataRealizada: null, dataPrevista: { lt: hoje } },
        select: { id: true, employeeId: true, dataPrevista: true },
      });
      for (const exame of examesVencidos) {
        await this.registrarEventoSemContexto(db, t.id, {
          employeeId: exame.employeeId,
          tipoEvento: 'ASO_PERIODICO_VENCIDO',
          dataEvento: exame.dataPrevista,
          documentoNome: 'ASO periódico',
        });
      }

      const treinamentos = await db.nrTrainingRecord.findMany({
        select: { id: true, employeeId: true, dataRealizacao: true, validadeMeses: true },
      });
      for (const tr of treinamentos) {
        const vencimento = addMonths(tr.dataRealizacao, tr.validadeMeses);
        if (vencimento >= hoje) continue;
        await this.registrarEventoSemContexto(db, t.id, {
          employeeId: tr.employeeId,
          tipoEvento: 'TREINAMENTO_NR_VENCIDO',
          dataEvento: vencimento,
          documentoNome: 'Certificado de treinamento NR',
        });
      }
    }
  }

  private async registrarEventoSemContexto(
    db: TenantDb,
    tenantId: string,
    input: { employeeId: string; tipoEvento: 'ASO_PERIODICO_VENCIDO' | 'TREINAMENTO_NR_VENCIDO'; dataEvento: Date; documentoNome: string },
  ) {
    const jaTemPendenciaAtiva = await db.pendencia.findFirst({
      where: {
        employeeId: input.employeeId,
        status: { notIn: ['CONCLUIDA', 'DESCARTADA'] },
        documento: { nome: input.documentoNome },
      },
    });
    if (jaTemPendenciaAtiva) return;

    const evento = await db.eventoColaborador.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        tipoEvento: input.tipoEvento,
        dataEvento: input.dataEvento,
        origem: 'MANUAL',
      },
    });
    const regras = await db.regraConformidade.findMany({ where: { tipoEventoGatilho: input.tipoEvento, ativo: true } });
    for (const regra of regras) {
      const dataLimite = addDays(input.dataEvento, regra.prazoDias);
      const pendencia = await db.pendencia.create({
        data: { tenantId, employeeId: input.employeeId, eventoOrigemId: evento.id, regraId: regra.id, documentoId: regra.documentoExigidoId, dataLimite },
      });
      await db.alertaConformidade.create({
        data: { tenantId, pendenciaId: pendencia.id, tipo: 'VENCIDA', dataDisparo: input.dataEvento },
      });
    }
  }
}
