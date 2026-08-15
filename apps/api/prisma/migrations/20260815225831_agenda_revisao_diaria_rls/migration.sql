-- RLS for the agenda_revisoes_diarias table — same pattern as prior *_rls migrations.

ALTER TABLE "agenda_revisoes_diarias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_revisoes_diarias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_revisoes_diarias"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
