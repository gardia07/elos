import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';

export type TipoEventoColaborador =
  | 'ADMISSAO'
  | 'MUDANCA_CARGO_FUNCAO'
  | 'MUDANCA_CARGA_HORARIA'
  | 'MUDANCA_SALARIAL'
  | 'INICIO_AFASTAMENTO'
  | 'ACIDENTE_TRABALHO'
  | 'RETORNO_AFASTAMENTO'
  | 'LICENCA_MATERNIDADE'
  | 'TRANSFERENCIA_LOCAL'
  | 'MUDANCA_REGIME_TRABALHO'
  | 'ADVERTENCIA_SUSPENSAO'
  | 'ASO_PERIODICO_VENCIDO'
  | 'TREINAMENTO_NR_VENCIDO'
  | 'DESLIGAMENTO';

export interface RegistrarEventoInput {
  employeeId: string;
  tipoEvento: TipoEventoColaborador;
  dataEvento?: Date;
  dadosAnteriores?: Record<string, unknown>;
  dadosNovos?: Record<string, unknown>;
  origem?: 'MANUAL' | 'IMPORTACAO' | 'INTEGRACAO_ESOCIAL';
  usuarioResponsavelId?: string;
}

/** Dias antes do vencimento em que um lembrete é disparado -- ajustável depois via config, não hardcoded em mais de um lugar. */
const LEMBRETE_DIAS_ANTES = [5, 1];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Regra de negócio 5 (ponderação do Índice de Conformidade), isolada em
 * função pura pra poder ser testada sem banco: bloqueante vencida = -3,
 * bloqueante aberta (no prazo) = -1, não-bloqueante vencida = -1, concluída
 * no prazo = +1. Não é uma % 0-100 -- é a pontuação bruta ponderada mesmo,
 * propositalmente simples pra poder ser recalibrada com dados reais.
 */
export function pontuarPendencia(p: { status: string; dataLimite: Date; dataConclusao: Date | null; regra: { bloqueante: boolean } }): number {
  if (p.status === 'CONCLUIDA') {
    return p.dataConclusao && p.dataConclusao <= p.dataLimite ? 1 : p.regra.bloqueante ? -1 : 0;
  }
  if (p.status === 'VENCIDA') return p.regra.bloqueante ? -3 : -1;
  // ABERTA / EM_ANDAMENTO / AGUARDANDO_ASSINATURA, ainda dentro do prazo
  return p.regra.bloqueante ? -1 : 0;
}

/**
 * Motor de Conformidade Documental: toda alteração relevante no cadastro do
 * colaborador (EventoColaborador) é confrontada contra a base de regras
 * (RegraConformidade) e cada match vira uma Pendência rastreada até a
 * resolução, com alertas de lembrete programados.
 *
 * `condicaoAdicional` na regra é texto descritivo (ex.: "somente se o novo
 * cargo tiver risco ocupacional diferente"), não uma expressão avaliável --
 * o motor cria a pendência para toda regra ativa cujo tipoEventoGatilho bate
 * com o evento; a condição adicional fica visível para o responsável decidir
 * se a pendência realmente se aplica (pode ser descartada manualmente).
 */
@Injectable()
export class ComplianceEngineService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async registrarEvento(input: RegistrarEventoInput) {
    const { tenantId } = getRequestContext();
    const db = this.db();
    const dataEvento = input.dataEvento ?? new Date();

    const evento = await db.eventoColaborador.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        tipoEvento: input.tipoEvento,
        dataEvento,
        dadosAnteriores: input.dadosAnteriores ?? undefined,
        dadosNovos: input.dadosNovos ?? undefined,
        origem: input.origem ?? 'MANUAL',
        usuarioResponsavelId: input.usuarioResponsavelId,
      },
    });

    const regras = await db.regraConformidade.findMany({
      where: { tipoEventoGatilho: input.tipoEvento, ativo: true },
    });

    const pendencias: Awaited<ReturnType<typeof db.pendencia.create>>[] = [];
    for (const regra of regras) {
      const dataLimite = addDays(dataEvento, regra.prazoDias);
      const pendencia = await db.pendencia.create({
        data: {
          tenantId,
          employeeId: input.employeeId,
          eventoOrigemId: evento.id,
          regraId: regra.id,
          documentoId: regra.documentoExigidoId,
          dataLimite,
        },
      });
      pendencias.push(pendencia);

      const alertas: { tenantId: string; pendenciaId: string; tipo: 'LEMBRETE' | 'VENCIMENTO_PROXIMO'; dataDisparo: Date }[] =
        LEMBRETE_DIAS_ANTES.filter((dias) => addDays(dataLimite, -dias) >= dataEvento).map((dias) => ({
          tenantId,
          pendenciaId: pendencia.id,
          tipo: 'LEMBRETE',
          dataDisparo: addDays(dataLimite, -dias),
        }));
      alertas.push({ tenantId, pendenciaId: pendencia.id, tipo: 'VENCIMENTO_PROXIMO', dataDisparo: dataLimite });
      if (alertas.length) await db.alertaConformidade.createMany({ data: alertas });
    }

    return { evento, pendencias };
  }

  async listarPendencias(filtros: { employeeId?: string; status?: string; bloqueantes?: boolean } = {}) {
    const db = this.db();
    return db.pendencia.findMany({
      where: {
        employeeId: filtros.employeeId,
        status: filtros.status as never,
        ...(filtros.bloqueantes ? { regra: { bloqueante: true } } : {}),
      },
      include: {
        employee: { select: { id: true, nome: true, departamento: true } },
        documento: true,
        regra: true,
      },
      orderBy: [{ status: 'asc' }, { dataLimite: 'asc' }],
    });
  }

  async resolverPendencia(id: string, opts: { anexoDocumentoId?: string; responsavelId?: string }) {
    const db = this.db();
    const existing = await db.pendencia.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pendência não encontrada.');
    return db.pendencia.update({
      where: { id },
      data: {
        status: 'CONCLUIDA',
        dataConclusao: new Date(),
        anexoDocumentoId: opts.anexoDocumentoId,
        responsavelId: opts.responsavelId,
      },
    });
  }

  async setStatusPendencia(id: string, status: 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_ASSINATURA') {
    return this.db().pendencia.update({ where: { id }, data: { status } });
  }

  /** Índice de conformidade (regra 5 da especificação) -- ver pontuarPendencia() pra ponderação. */
  async indiceConformidade(employeeId: string): Promise<{ pontuacao: number; pendenciasBloqueantesAbertas: number; totalPendencias: number }> {
    const db = this.db();
    const pendencias = await db.pendencia.findMany({
      where: { employeeId },
      include: { regra: { select: { bloqueante: true } } },
    });
    const pontuacao = pendencias.reduce((acc, p) => acc + pontuarPendencia(p), 0);
    const pendenciasBloqueantesAbertas = pendencias.filter(
      (p) => p.regra.bloqueante && p.status !== 'CONCLUIDA',
    ).length;
    return { pontuacao, pendenciasBloqueantesAbertas, totalPendencias: pendencias.length };
  }

  async indicePorSetor(): Promise<{ departamento: string; pontuacaoMedia: number; colaboradores: number }[]> {
    const db = this.db();
    const employees = await db.employee.findMany({ where: { status: 'ATIVO' }, select: { id: true, departamento: true } });
    const porDepartamento = new Map<string, string[]>();
    for (const e of employees) {
      const lista = porDepartamento.get(e.departamento) ?? [];
      lista.push(e.id);
      porDepartamento.set(e.departamento, lista);
    }
    const resultado: { departamento: string; pontuacaoMedia: number; colaboradores: number }[] = [];
    for (const [departamento, ids] of porDepartamento) {
      const indices = await Promise.all(ids.map((id) => this.indiceConformidade(id)));
      const pontuacaoMedia = indices.length ? Math.round((indices.reduce((a, b) => a + b.pontuacao, 0) / indices.length) * 10) / 10 : 0;
      resultado.push({ departamento, pontuacaoMedia, colaboradores: ids.length });
    }
    return resultado.sort((a, b) => a.pontuacaoMedia - b.pontuacaoMedia);
  }

  async indiceGeral(): Promise<{ pontuacaoMedia: number; colaboradores: number; pendenciasBloqueantesVencidas: number }> {
    const db = this.db();
    const employees = await db.employee.findMany({ where: { status: 'ATIVO' }, select: { id: true } });
    const indices = await Promise.all(employees.map((e) => this.indiceConformidade(e.id)));
    const pontuacaoMedia = indices.length ? Math.round((indices.reduce((a, b) => a + b.pontuacao, 0) / indices.length) * 10) / 10 : 0;
    const pendenciasBloqueantesVencidas = await db.pendencia.count({
      where: { status: 'VENCIDA', regra: { bloqueante: true } },
    });
    return { pontuacaoMedia, colaboradores: employees.length, pendenciasBloqueantesVencidas };
  }

  /** Colaboradores com pendência bloqueante em aberto/vencida -- a "flag de irregularidade" (regra 4.7 da especificação). */
  async colaboradoresIrregulares() {
    const db = this.db();
    const pendencias = await db.pendencia.findMany({
      where: { status: { not: 'CONCLUIDA' }, regra: { bloqueante: true } },
      include: { employee: { select: { id: true, nome: true } }, documento: { select: { nome: true } } },
    });
    const porColaborador = new Map<string, { employeeId: string; nome: string; pendencias: string[] }>();
    for (const p of pendencias) {
      const atual = porColaborador.get(p.employeeId) ?? { employeeId: p.employeeId, nome: p.employee.nome, pendencias: [] };
      atual.pendencias.push(p.documento.nome);
      porColaborador.set(p.employeeId, atual);
    }
    return [...porColaborador.values()];
  }
}
