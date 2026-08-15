-- RLS for the agenda_categorias table — same pattern as prior *_rls migrations.

ALTER TABLE "agenda_categorias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_categorias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_categorias"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
