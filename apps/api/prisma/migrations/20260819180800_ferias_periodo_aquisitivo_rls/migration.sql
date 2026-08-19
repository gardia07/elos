-- RLS for periodos_aquisitivos, fracoes_de_ferias, faltas_injustificadas — same pattern as prior *_rls migrations.

ALTER TABLE "periodos_aquisitivos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "periodos_aquisitivos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "periodos_aquisitivos"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "fracoes_de_ferias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fracoes_de_ferias" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fracoes_de_ferias"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "faltas_injustificadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "faltas_injustificadas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "faltas_injustificadas"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
