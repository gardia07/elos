import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { del, get, put } from '@vercel/blob';

export interface UploadedDocumento {
  pathname: string;
  contentType: string;
  tamanho: string;
  nomeOriginal: string;
}

export interface DownloadedDocumento {
  stream: Readable;
  contentType: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Busboy/multer decodifica o nome do arquivo do multipart como latin1 por padrão, mesmo
 * quando o navegador manda o cabeçalho em UTF-8 — acentos viram sequências tipo "Ã£" no
 * lugar de "ã". Como isso é sempre UTF-8 mal-decodificado (nunca UTF-8 correto vindo do
 * multer nesta stack), reverter o round-trip latin1→utf8 recupera o nome original.
 */
export function fixFilenameEncoding(name: string): string {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

/** Envia um arquivo pro Blob store privado, sob um prefixo (ex: `colaboradores/{tenantId}/{employeeId}`). */
export async function uploadDocumento(
  prefix: string,
  file: Express.Multer.File,
): Promise<UploadedDocumento> {
  const nomeOriginal = fixFilenameEncoding(file.originalname);
  const pathname = `${prefix}/${randomUUID()}-${nomeOriginal}`;
  const contentType = file.mimetype || 'application/octet-stream';
  await put(pathname, file.buffer, { access: 'private', contentType });
  return {
    pathname,
    contentType,
    tamanho: formatBytes(file.size),
    nomeOriginal,
  };
}

/** Lê um arquivo do Blob store privado de volta, pra transmitir na resposta HTTP. */
export async function downloadDocumento(
  pathname: string,
): Promise<DownloadedDocumento | null> {
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return {
    stream: Readable.fromWeb(result.stream as never),
    contentType: result.blob.contentType,
    size: result.blob.size,
  };
}

/** Apaga um arquivo do Blob store — best-effort, não lança se o blob já não existir. */
export async function deleteDocumento(
  pathname: string | null | undefined,
): Promise<void> {
  if (!pathname) return;
  try {
    await del(pathname);
  } catch {
    // arquivo já removido/inacessível — não bloqueia a exclusão do registro no banco.
  }
}
