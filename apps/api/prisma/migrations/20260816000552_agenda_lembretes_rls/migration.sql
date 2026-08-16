-- RLS for agenda_lembretes and agenda_notificacoes — same pattern as prior *_rls migrations.

ALTER TABLE "agenda_lembretes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_lembretes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_lembretes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "agenda_notificacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_notificacoes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_notificacoes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
