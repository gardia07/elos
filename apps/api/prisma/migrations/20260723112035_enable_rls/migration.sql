-- Row-Level Security for tenant isolation.
--
-- Every tenant-scoped table gets a policy that only allows rows where
-- tenant_id matches the Postgres session variable app.current_tenant_id.
-- That variable is set by PrismaService.forCurrentTenant() (see
-- apps/api/src/prisma/prisma.service.ts) at the start of every query made
-- through the tenant-scoped client, using the tenant_id read from the
-- authenticated request's JWT (apps/api/src/common/tenant-context.middleware.ts).
--
-- FORCE ROW LEVEL SECURITY makes the policy apply even to the table owner
-- (the role our app connects as on a managed Postgres like Neon/Supabase is
-- the owner, not a superuser, so without FORCE the policy would be a no-op
-- for our own connection). current_setting(..., true) returns NULL instead
-- of erroring when the session var hasn't been set, which makes the
-- comparison false and denies access by default (fail-closed) — e.g. for
-- any connection that isn't going through the app's request lifecycle.
--
-- NOT covered here (intentional, see apps/api README notes):
--   * tenants        — has no tenant_id column, it IS the tenant.
--   * users          — auth flows (login/registerTenant/verifyMfa/me) run
--                       before a tenant is known or need to look a user up
--                       by tenantId+email explicitly; they use the base
--                       (unscoped) PrismaClient and filter by tenantId/email
--                       in application code instead of relying on RLS here.
--   * dependentes, historico_eventos, employee_documentos, ferias_historico
--                     — child tables with no tenant_id column of their own;
--                       isolation is inherited transitively through the
--                       parent employee_id, which is itself RLS-protected.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'audit_events',
      'recruitment_jobs',
      'candidates',
      'candidate_pool_entries',
      'job_costs',
      'job_requisitions',
      'scheduled_interviews',
      'checklist_item_defs',
      'admissions',
      'employees',
      'evaluation_cycles',
      'evaluation_records',
      'goals',
      'pdi_actions',
      'vacation_requests',
      'leave_records',
      'terminations',
      'termination_checklist_defs'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;
