import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateAtalhoDto, UpdateAtalhoDto } from './dto/atalhos-externos.dto';

@Injectable()
export class AtalhosExternosService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().atalhoExterno.findMany({ orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }] });
  }

  create(dto: CreateAtalhoDto) {
    const { tenantId } = getRequestContext();
    return this.db().atalhoExterno.create({
      data: { tenantId, nome: dto.nome, url: dto.url, icone: dto.icone || 'Link' },
    });
  }

  private async mustFind(id: string) {
    const { tenantId } = getRequestContext();
    const atalho = await this.db().atalhoExterno.findFirst({ where: { id, tenantId } });
    if (!atalho) throw new NotFoundException('Atalho não encontrado.');
    return atalho;
  }

  async update(id: string, dto: UpdateAtalhoDto) {
    await this.mustFind(id);
    return this.db().atalhoExterno.update({
      where: { id },
      data: { nome: dto.nome, url: dto.url, icone: dto.icone },
    });
  }

  async delete(id: string) {
    const atalho = await this.mustFind(id);
    if (atalho.sistema) {
      throw new ForbiddenException('Atalhos do catálogo padrão não podem ser excluídos.');
    }
    await this.db().atalhoExterno.delete({ where: { id } });
    return { ok: true };
  }
}
