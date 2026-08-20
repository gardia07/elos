-- RLS for eventos_colaborador, tipos_documento_conformidade,
-- regras_conformidade, pendencias_conformidade, alertas_conformidade --
-- same pattern as prior *_rls migrations.

ALTER TABLE "eventos_colaborador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eventos_colaborador" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "eventos_colaborador"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tipos_documento_conformidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tipos_documento_conformidade" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tipos_documento_conformidade"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "regras_conformidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "regras_conformidade" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "regras_conformidade"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "pendencias_conformidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pendencias_conformidade" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "pendencias_conformidade"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "alertas_conformidade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alertas_conformidade" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "alertas_conformidade"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
