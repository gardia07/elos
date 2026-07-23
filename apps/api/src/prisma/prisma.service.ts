import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getRequestContext } from '../common/request-context';

/**
 * Wraps every query for tenant-scoped models in a transaction that first sets
 * the `app.current_tenant_id` Postgres session variable, which the RLS
 * policies (see migration SQL) key off via current_setting(...). This is the
 * official Prisma pattern for RLS: https://www.prisma.io/docs/orm/prisma-client/queries/row-level-security
 */
function forTenant(prisma: PrismaClient, tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}

export type TenantScopedPrisma = ReturnType<typeof forTenant>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Runs as the restricted `elos_app` role (no BYPASSRLS), not the
    // migration owner role — see .env.example for why the two must differ.
    super({ datasourceUrl: process.env.RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a Prisma client scoped to the tenant of the current authenticated
   * request (read from AsyncLocalStorage). Every query made through this
   * client is additionally filtered by Postgres RLS at the database layer —
   * application code must still filter by tenantId explicitly where clauses
   * are written, RLS is defense-in-depth, not a substitute.
   */
  forCurrentTenant(): TenantScopedPrisma {
    const { tenantId } = getRequestContext();
    return forTenant(this, tenantId);
  }

  forTenant(tenantId: string): TenantScopedPrisma {
    return forTenant(this, tenantId);
  }
}
