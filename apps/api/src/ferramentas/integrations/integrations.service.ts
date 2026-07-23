import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';

const CATALOG: { tipo: string; nome: string; descricao: string }[] = [
  { tipo: 'ERP', nome: 'ERP — TOTVS Protheus', descricao: 'Sincroniza centros de custo, cargos e lançamentos contábeis da folha.' },
  { tipo: 'BANCARIO', nome: 'Banco — Itaú Empresas', descricao: 'Envio automático de arquivo de remessa para pagamento de salários.' },
  { tipo: 'BENEFICIOS', nome: 'Benefícios — Flash', descricao: 'Sincroniza saldo de VR/VA e adesões de plano de saúde.' },
  { tipo: 'ERP', nome: 'Contábil — Domínio Sistemas', descricao: 'Exporta lançamentos de folha e encargos para a contabilidade.' },
];

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const existing = await db.integrationConnection.findMany();
    const existingNames = new Set(existing.map((c) => c.nome));

    const missing = CATALOG.filter((c) => !existingNames.has(c.nome));
    if (missing.length > 0) {
      await db.integrationConnection.createMany({
        data: missing.map((c) => ({ tenantId, tipo: c.tipo, nome: c.nome, descricao: c.descricao })),
      });
    }

    return db.integrationConnection.findMany({ orderBy: { nome: 'asc' } });
  }

  async toggle(id: string, conectado: boolean) {
    const db = this.db();
    const item = await db.integrationConnection.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Integração não encontrada.');
    return db.integrationConnection.update({
      where: { id },
      data: { conectado, ultimaSincronizacaoEm: conectado ? new Date() : item.ultimaSincronizacaoEm },
    });
  }
}
