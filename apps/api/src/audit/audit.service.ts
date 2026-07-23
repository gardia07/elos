import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';

/**
 * Single append-only audit_events table for every module's "trilha de
 * auditoria" (per README: prefer one audit_events table over per-feature
 * ad hoc arrays). Always logs under the current request's tenant/actor.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entityType: string, entityId: string, action: string, payload?: Record<string, unknown>) {
    const ctx = getRequestContext();
    const db = this.prisma.forCurrentTenant();
    await db.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        actorName: ctx.userName,
        entityType,
        entityId,
        action,
        payload: payload as any,
      },
    });
  }

  async listForEntity(entityType: string, entityId: string) {
    const db = this.prisma.forCurrentTenant();
    return db.auditEvent.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
