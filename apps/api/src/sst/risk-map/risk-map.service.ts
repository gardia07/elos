import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CreateRiskMapEntryDto } from './dto/risk-map.dto';

@Injectable()
export class RiskMapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().riskMapEntry.findMany({ orderBy: { setor: 'asc' } });
  }

  create(dto: CreateRiskMapEntryDto) {
    return this.db().riskMapEntry.create({ data: { ...dto, tenantId: getRequestContext().tenantId } });
  }

  async getSettings() {
    const { tenantId } = getRequestContext();
    const settings = await this.db().sstSettings.findUnique({ where: { tenantId } });
    return { mapaRiscosEsocialSentAt: settings?.mapaRiscosEsocialSentAt ?? null };
  }

  async sendEsocial() {
    const { tenantId } = getRequestContext();
    const db = this.db();
    const settings = await db.sstSettings.upsert({
      where: { tenantId },
      create: { tenantId, mapaRiscosEsocialSentAt: new Date() },
      update: { mapaRiscosEsocialSentAt: new Date() },
    });
    await this.audit.log('sst_settings', tenantId, 'esocial_s2240_enviado');
    return settings;
  }
}
