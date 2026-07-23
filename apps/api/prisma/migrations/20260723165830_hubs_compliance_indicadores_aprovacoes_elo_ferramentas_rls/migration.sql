-- RLS for the new hub tables — same pattern as prior *_rls migrations.
--
-- NOT covered here (intentional, same rationale as prior migrations):
--   * policy_acknowledgments — child table with no tenantId column of its
--                              own; isolation is inherited transitively
--                              through the parent employee_id.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'ethics_cases',
      'compliance_policies',
      'elo_conversations',
      'integration_connections',
      'announcements'
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
