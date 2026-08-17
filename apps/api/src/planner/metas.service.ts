import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { CreateMetaDto, UpdateMetaDto } from './dto/planner.dto';

@Injectable()
export class MetasService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list(ano: number) {
    const { userId } = getRequestContext();
    return this.db().metaPessoal.findMany({
      where: { userId, ano },
      orderBy: [{ concluida: 'asc' }, { ordem: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(dto: CreateMetaDto) {
    const { tenantId, userId } = getRequestContext();
    return this.db().metaPessoal.create({ data: { tenantId, userId, ano: dto.ano, titulo: dto.titulo } });
  }

  private async mustFind(id: string) {
    const { userId } = getRequestContext();
    const meta = await this.db().metaPessoal.findFirst({ where: { id, userId } });
    if (!meta) throw new NotFoundException('Meta não encontrada.');
    return meta;
  }

  async update(id: string, dto: UpdateMetaDto) {
    await this.mustFind(id);
    return this.db().metaPessoal.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.mustFind(id);
    await this.db().metaPessoal.delete({ where: { id } });
    return { ok: true };
  }
}
