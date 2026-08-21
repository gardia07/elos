import Anthropic from '@anthropic-ai/sdk';

/** Tipos de arquivo que o modelo de visão consegue de fato inspecionar -- .doc/.docx ficam fora da validação automática. */
export const TIPOS_ARQUIVO_CLASSIFICAVEIS = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type TipoArquivoClassificavel = (typeof TIPOS_ARQUIVO_CLASSIFICAVEIS)[number];

export function isClassificavel(mimetype: string): mimetype is TipoArquivoClassificavel {
  return (TIPOS_ARQUIVO_CLASSIFICAVEIS as readonly string[]).includes(mimetype);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/**
 * Validação automática (Elô) do documento anexado a uma Pendência do Motor
 * de Conformidade Documental: confere se o arquivo enviado parece de fato
 * ser o tipo de documento exigido pela regra, antes de marcar a pendência
 * como resolvida -- evita que um arquivo errado (ex.: holerite no lugar de
 * atestado médico) feche uma pendência por engano.
 */
export async function classificarDocumento(
  file: { buffer: Buffer; mimetype: string },
  tipoDocumento: { nome: string; categoria: string },
): Promise<{ bate: boolean; motivo: string }> {
  const base64 = file.buffer.toString('base64');
  const contentBlock: Anthropic.ContentBlockParam =
    file.mimetype === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: file.mimetype as 'image/jpeg' | 'image/png', data: base64 } };

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system:
      'Você valida se um arquivo anexado corresponde ao tipo de documento trabalhista esperado, para o Motor de Conformidade Documental da Plataforma Elos. Seja rigoroso mas razoável: aceite variações de template/formato/qualidade de digitalização, mas rejeite arquivos de tipo claramente diferente do esperado (ex.: um holerite anexado no lugar de um atestado médico, ou um documento em branco/ilegível).',
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `O documento exigido é: "${tipoDocumento.nome}" (categoria ${tipoDocumento.categoria}). O arquivo anexado corresponde a esse tipo de documento?`,
          },
        ],
      },
    ],
    tools: [
      {
        name: 'classificar',
        description: 'Registra o resultado da validação do documento anexado.',
        input_schema: {
          type: 'object',
          properties: {
            bate: { type: 'boolean', description: 'true se o arquivo parece ser realmente o tipo de documento esperado' },
            motivo: { type: 'string', description: 'Explicação curta da decisão, em português, para mostrar ao usuário.' },
          },
          required: ['bate', 'motivo'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'classificar' },
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) return { bate: false, motivo: 'Não foi possível validar o documento automaticamente. Tente novamente.' };
  const input = toolUse.input as { bate: boolean; motivo: string };
  return input;
}
