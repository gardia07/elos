import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { CreateCategoriaFinanceiraDto, SetLancamentoDto, UpdateCategoriaFinanceiraDto } from './dto/planner.dto';

@Injectable()
export class FinancasService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list(ano: number) {
    const { userId } = getRequestContext();
    const categorias = await this.db().financaPessoalCategoria.findMany({
      where: { userId, ano },
      include: { lancamentos: true },
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { createdAt: 'asc' }],
    });
    return categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      ordem: c.ordem,
      valoresPorMes: Object.fromEntries(c.lancamentos.map((l) => [l.mes, Number(l.valor)])),
    }));
  }

  createCategoria(dto: CreateCategoriaFinanceiraDto) {
    const { tenantId, userId } = getRequestContext();
    return this.db().financaPessoalCategoria.create({ data: { tenantId, userId, ano: dto.ano, nome: dto.nome, tipo: dto.tipo } });
  }

  private async mustFindCategoria(id: string) {
    const { userId } = getRequestContext();
    const categoria = await this.db().financaPessoalCategoria.findFirst({ where: { id, userId } });
    if (!categoria) throw new NotFoundException('Categoria não encontrada.');
    return categoria;
  }

  async updateCategoria(id: string, dto: UpdateCategoriaFinanceiraDto) {
    await this.mustFindCategoria(id);
    return this.db().financaPessoalCategoria.update({ where: { id }, data: dto });
  }

  async deleteCategoria(id: string) {
    await this.mustFindCategoria(id);
    await this.db().financaPessoalCategoria.delete({ where: { id } });
    return { ok: true };
  }

  async setLancamento(categoriaId: string, mes: number, dto: SetLancamentoDto) {
    await this.mustFindCategoria(categoriaId);
    const { tenantId } = getRequestContext();
    return this.db().financaPessoalLancamento.upsert({
      where: { categoriaId_mes: { categoriaId, mes } },
      create: { tenantId, categoriaId, mes, valor: dto.valor },
      update: { valor: dto.valor },
    });
  }
}
