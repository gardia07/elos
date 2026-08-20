-- RLS for risk_impact_rules, jornadas, batidas, ajustes_ponto,
-- certificados_digitais, afd_geracoes -- same pattern as prior *_rls migrations.
-- (jornadas/batidas/ajustes_ponto/certificados_digitais/afd_geracoes vieram
-- junto na mesma migration anterior por já estarem no schema -- draft do
-- Ponto Eletronico, ainda sem services/controllers usando-as -- mas
-- precisam de RLS desde já, como qualquer tabela multi-tenant.)

ALTER TABLE "risk_impact_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_impact_rules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "risk_impact_rules"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "jornadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jornadas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "jornadas"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "batidas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "batidas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "batidas"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "ajustes_ponto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ajustes_ponto" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ajustes_ponto"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "certificados_digitais" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificados_digitais" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "certificados_digitais"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "afd_geracoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "afd_geracoes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "afd_geracoes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
