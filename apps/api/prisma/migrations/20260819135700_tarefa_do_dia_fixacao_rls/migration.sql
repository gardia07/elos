-- RLS for tarefas_do_dia_fixacoes — same pattern as prior *_rls migrations.

ALTER TABLE "tarefas_do_dia_fixacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tarefas_do_dia_fixacoes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tarefas_do_dia_fixacoes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
