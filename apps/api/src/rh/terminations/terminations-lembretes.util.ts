import { PrismaService } from '../../prisma/prisma.service';

export interface TerminationAlert {
  hub: string;
  mensagem: string;
  alertKey: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  href: string;
}

const PRAZO_DIAS = 10;

function formatDiasRestantes(alvo: Date, hoje: Date): string {
  const dias = Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
  if (dias < 0) return `há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return 'hoje';
  return `em ${dias} dia(s)`;
}

/**
 * Lembretes de prazos legais do desligamento — reaproveitado tanto pelo painel geral
 * (`DashboardService.buildAlerts`) quanto pelo painel dedicado de prazos de desligamento
 * (`TerminationsService.lembretes`). Recomputado a cada chamada (sem tabela própria nem job):
 * o alerta simplesmente para de existir quando a condição deixa de valer.
 */
export async function buildTerminationAlerts(
  prisma: PrismaService,
  hoje: Date,
): Promise<TerminationAlert[]> {
  const db = prisma.forCurrentTenant();
  const alerts: TerminationAlert[] = [];

  const emAndamento = await db.termination.findMany({
    where: { status: { notIn: ['CONCLUIDO', 'CANCELADO'] } },
    select: { id: true, nome: true, docs: true },
  });
  for (const t of emAndamento) {
    const docs = t.docs as Record<string, boolean>;
    if ('exame_demissional' in docs && docs.exame_demissional !== true) {
      alerts.push({
        hub: 'RH',
        alertKey: `rh-desligamento-exame-${t.id}`,
        prioridade: 'MEDIA',
        mensagem: `${t.nome} — exame demissional pendente`,
        href: `/gestao-de-pessoas/desligamento/${t.id}`,
      });
    }
  }

  const efetivados = await db.termination.findMany({
    where: { status: { in: ['EFETIVADO', 'EM_HOMOLOGACAO'] } },
    select: {
      id: true,
      nome: true,
      data: true,
      esocialSent: true,
      exigeHomologacao: true,
    },
  });
  for (const t of efetivados) {
    const prazo = new Date(t.data.getTime() + PRAZO_DIAS * 86_400_000);
    const dias = Math.round((prazo.getTime() - hoje.getTime()) / 86_400_000);
    const href = `/gestao-de-pessoas/desligamento/${t.id}`;
    const prioridade = dias < 0 ? 'CRITICA' : dias <= 3 ? 'ALTA' : 'MEDIA';

    if (!t.esocialSent) {
      alerts.push({
        hub: 'RH',
        alertKey: `rh-desligamento-esocial-${t.id}`,
        prioridade,
        mensagem: `${t.nome} — envio do eSocial de desligamento ${dias < 0 ? 'atrasado' : 'vence'} (${formatDiasRestantes(prazo, hoje)})`,
        href,
      });
    }

    alerts.push({
      hub: 'RH',
      alertKey: `rh-desligamento-pagamento-${t.id}`,
      prioridade,
      mensagem: `${t.nome} — pagamento das verbas rescisórias ${dias < 0 ? 'atrasado' : 'vence'} (${formatDiasRestantes(prazo, hoje)})`,
      href,
    });

    if (t.exigeHomologacao) {
      alerts.push({
        hub: 'RH',
        alertKey: `rh-desligamento-homologacao-${t.id}`,
        prioridade,
        mensagem: `${t.nome} — homologação da rescisão pendente (${formatDiasRestantes(prazo, hoje)})`,
        href,
      });
    }
  }

  return alerts;
}
