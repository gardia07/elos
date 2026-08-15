-- RLS for the agenda_recorrencias table — same pattern as prior *_rls migrations.

ALTER TABLE "agenda_recorrencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_recorrencias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_recorrencias"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
