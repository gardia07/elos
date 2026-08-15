-- RLS for the agenda_comentarios table — same pattern as prior *_rls migrations.

ALTER TABLE "agenda_comentarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_comentarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_comentarios"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
