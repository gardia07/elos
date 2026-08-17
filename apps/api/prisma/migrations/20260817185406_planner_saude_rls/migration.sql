-- RLS for humor_registros, ciclo_menstrual_registros and peso_medida_registros — same pattern as prior *_rls migrations.

ALTER TABLE "humor_registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "humor_registros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "humor_registros"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "ciclo_menstrual_registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ciclo_menstrual_registros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ciclo_menstrual_registros"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "peso_medida_registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "peso_medida_registros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "peso_medida_registros"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
