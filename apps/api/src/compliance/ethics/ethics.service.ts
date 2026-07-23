import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CreateEthicsCaseDto, UpdateEthicsCaseStatusDto } from './dto/ethics.dto';

@Injectable()
export class EthicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().ethicsCase.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const item = await this.mustFind(id);
    const auditLog = await this.audit.listForEntity('ethics_case', id);
    return { ...item, auditLog };
  }

  async create(dto: CreateEthicsCaseDto) {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const anonimo = dto.anonimo ?? true;

    const year = new Date().getFullYear();
    const countThisYear = await db.ethicsCase.count({ where: { protocolo: { startsWith: `ETH-${year}-` } } });
    const protocolo = `ETH-${year}-${String(countThisYear + 1).padStart(4, '0')}`;

    const created = await db.ethicsCase.create({
      data: {
        tenantId,
        protocolo,
        categoria: dto.categoria,
        descricao: dto.descricao,
        anonimo,
        denuncianteNome: anonimo ? null : dto.denuncianteNome,
      },
    });
    await this.audit.log('ethics_case', created.id, 'caso_aberto', { categoria: dto.categoria, protocolo });
    return created;
  }

  async updateStatus(id: string, dto: UpdateEthicsCaseStatusDto) {
    const item = await this.mustFind(id);
    if (dto.status === 'CONCLUIDO' && !dto.conclusao && !item.conclusao) {
      throw new BadRequestException('Informe a conclusão do caso antes de encerrá-lo.');
    }
    const updated = await this.db().ethicsCase.update({
      where: { id },
      data: { status: dto.status, conclusao: dto.conclusao ?? item.conclusao },
    });
    await this.audit.log('ethics_case', id, 'status_atualizado', { status: dto.status });
    return updated;
  }

  private async mustFind(id: string) {
    const item = await this.db().ethicsCase.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Caso não encontrado.');
    return item;
  }
}
