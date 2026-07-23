-- Row-Level Security for the Departamento Pessoal (DP) tables — same
-- pattern as prisma/migrations/*_enable_rls/migration.sql. See that file
-- for the full rationale (FORCE RLS because the app connects as the table
-- owner on managed Postgres, current_setting(..., true) for fail-closed
-- default-deny).

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'labor_deadlines',
      'collective_agreements',
      'job_grades',
      'benefits',
      'benefit_enrollments',
      'equipment_items',
      'time_justifications',
      'payroll_runs',
      'payslip_items',
      'payroll_guides'
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
