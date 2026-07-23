import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateAnnouncementDto } from './dto/announcements.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateAnnouncementDto) {
    const { tenantId, userName } = getRequestContext();
    return this.db().announcement.create({ data: { tenantId, titulo: dto.titulo, corpo: dto.corpo, autor: userName } });
  }
}
