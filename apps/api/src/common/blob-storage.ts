import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { del, get, put } from '@vercel/blob';

export interface UploadedDocumento {
  pathname: string;
  contentType: string;
  tamanho: string;
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

/** Envia um arquivo pro Blob store privado, sob um prefixo (ex: `colaboradores/{tenantId}/{employeeId}`). */
export async function uploadDocumento(
  prefix: string,
  file: Express.Multer.File,
): Promise<UploadedDocumento> {
  const pathname = `${prefix}/${randomUUID()}-${file.originalname}`;
  const contentType = file.mimetype || 'application/octet-stream';
  await put(pathname, file.buffer, { access: 'private', contentType });
  return { pathname, contentType, tamanho: formatBytes(file.size) };
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
