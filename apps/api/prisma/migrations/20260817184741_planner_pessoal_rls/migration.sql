-- RLS for the 5 planner-pessoal tables — same pattern as prior *_rls migrations.

ALTER TABLE "metas_pessoais" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "metas_pessoais" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "metas_pessoais"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "habitos_pessoais" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habitos_pessoais" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "habitos_pessoais"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "habito_pessoal_registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habito_pessoal_registros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "habito_pessoal_registros"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "financas_pessoais_categorias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financas_pessoais_categorias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "financas_pessoais_categorias"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "financas_pessoais_lancamentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financas_pessoais_lancamentos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "financas_pessoais_lancamentos"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
