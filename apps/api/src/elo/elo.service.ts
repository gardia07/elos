import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { DashboardService } from '../dashboard/dashboard.service';
import { AprovacoesService } from '../aprovacoes/aprovacoes.service';
import { IndicadoresService } from '../indicadores/indicadores.service';
import { AgendaService } from '../agenda/agenda.service';

const SYSTEM_PROMPT = `Você é a Elô, assistente de IA especialista em RH, Departamento Pessoal, SST, Compliance e legislação trabalhista brasileira da Plataforma Elos.

Responda de forma direta e objetiva, em português do Brasil. Quando a pergunta envolver dados do sistema (colaboradores, pendências, aprovações, turnover), use as ferramentas disponíveis para consultar os números reais antes de responder — nunca invente números.

Se o usuário pedir para executar uma ação (criar tarefa, criar item de agenda) e você NÃO tiver ferramentas de ação disponíveis nesta conversa, explique que é preciso ativar o "Modo agente" para isso. Se tiver as ferramentas de ação disponíveis, execute a ação diretamente quando o pedido for claro, e confirme o que foi feito.`;

const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_dashboard_kpis',
    description: 'Retorna KPIs gerais do sistema: colaboradores ativos, pendências abertas, vagas abertas, alertas críticos.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_pending_approvals',
    description: 'Lista solicitações pendentes de aprovação (férias, ajustes de ponto, aberturas de vaga) com prazos e prioridade.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_turnover',
    description: 'Retorna a taxa de turnover geral e por departamento dos últimos 3 meses.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_headcount_evolution',
    description: 'Retorna a evolução do headcount (nº de colaboradores ativos) nos últimos 6 meses.',
    input_schema: { type: 'object', properties: {} },
  },
];

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Cria uma tarefa real no sistema, que passa a aparecer no Painel em Alertas prioritários.',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Título curto da tarefa.' },
        modulo: { type: 'string', description: 'Hub relacionado, ex: RH, DP, SST, Compliance.' },
        prioridade: { type: 'string', enum: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] },
      },
      required: ['titulo', 'modulo'],
    },
  },
  {
    name: 'create_agenda_item',
    description: 'Cria um item na agenda do dia do usuário atual.',
    input_schema: {
      type: 'object',
      properties: {
        descricao: { type: 'string' },
        hora: { type: 'string', description: 'Horário HH:MM, opcional.' },
        data: { type: 'string', description: 'Data YYYY-MM-DD; padrão é hoje se omitido.' },
      },
      required: ['descricao'],
    },
  },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class EloService {
  private readonly logger = new Logger(EloService.name);
  private client: Anthropic | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly aprovacoes: AprovacoesService,
    private readonly indicadores: IndicadoresService,
    private readonly agenda: AgendaService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic();
    return this.client;
  }

  private async executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'get_dashboard_kpis':
        return this.dashboard.kpis();
      case 'get_pending_approvals':
        return this.aprovacoes.list().then((items) => items.filter((i) => i.status === 'PENDENTE'));
      case 'get_turnover':
        return this.indicadores.turnover();
      case 'get_headcount_evolution':
        return this.indicadores.headcount();
      case 'create_task':
        return this.dashboard.createTask({
          titulo: String(input.titulo),
          modulo: String(input.modulo),
          prioridade: input.prioridade as 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' | undefined,
        });
      case 'create_agenda_item':
        return this.agenda.createItem({
          data: (input.data as string) || todayIso(),
          hora: input.hora as string | undefined,
          descricao: String(input.descricao),
        });
      default:
        return { error: `Ferramenta desconhecida: ${name}` };
    }
  }

  async ask(pergunta: string, modoAgente: boolean): Promise<{ resposta: string; acaoExecutada: string | null }> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY não configurada.');
    }
    const client = this.getClient();
    const tools = modoAgente ? [...READ_TOOLS, ...AGENT_TOOLS] : READ_TOOLS;

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: pergunta }];
    let acaoExecutada: string | null = null;

    for (let turn = 0; turn < 4; turn++) {
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
        tools,
      });

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (toolUses.length === 0 || response.stop_reason !== 'tool_use') {
        const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
        return { resposta: text, acaoExecutada };
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await this.executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        if (toolUse.name === 'create_task' || toolUse.name === 'create_agenda_item') {
          acaoExecutada = `${toolUse.name}:${(result as { id?: string })?.id ?? ''}`;
        }
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    return { resposta: 'Não consegui concluir a análise em tempo hábil — tente reformular a pergunta.', acaoExecutada };
  }

  async chat(pergunta: string, modoAgente: boolean) {
    const { tenantId, userId } = getRequestContext();
    const { resposta, acaoExecutada } = await this.ask(pergunta, modoAgente);

    const saved = await this.db().eloConversation.create({
      data: { tenantId, userId, pergunta, resposta, modoAgente, acaoExecutada },
    });
    return saved;
  }

  history() {
    const { userId } = getRequestContext();
    return this.db().eloConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
