-- RLS for agenda_item_subtarefas, projeto_marcos and projeto_modelos — same pattern as prior *_rls migrations.

ALTER TABLE "agenda_item_subtarefas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agenda_item_subtarefas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "agenda_item_subtarefas"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "projeto_marcos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projeto_marcos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "projeto_marcos"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "projeto_modelos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projeto_modelos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "projeto_modelos"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
