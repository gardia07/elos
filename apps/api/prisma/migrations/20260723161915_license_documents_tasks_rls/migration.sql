-- RLS for the new tenant-scoped tables — same pattern as prior *_rls migrations.
--
-- NOT covered here (intentional, same rationale as the initial enable_rls migration):
--   * login_attempts               — cross-tenant by design, no tenantId column.
--   * license_plans                — global commercial catalog, no tenantId column.
--   * employee_document_requirements — child table with no tenantId column of its
--                                      own; isolation is inherited transitively
--                                      through the parent employee_id.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'document_requirements',
      'tasks',
      'tenant_licenses'
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
