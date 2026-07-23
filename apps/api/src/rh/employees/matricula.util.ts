import { TenantScopedPrisma } from '../../prisma/prisma.service';

/** Sequential per-tenant employee registration number, e.g. "0001", "0002". */
export async function nextMatricula(db: TenantScopedPrisma): Promise<string> {
  const count = await db.employee.count();
  return String(count + 1).padStart(4, '0');
}
