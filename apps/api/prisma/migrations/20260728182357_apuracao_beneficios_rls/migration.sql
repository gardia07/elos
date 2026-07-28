-- RLS for the apuracoes_beneficios table — same pattern as prior *_enable_rls migrations.

ALTER TABLE "apuracoes_beneficios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "apuracoes_beneficios" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "apuracoes_beneficios"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
