-- RLS for the adesoes_beneficio_fixo table — same pattern as prior *_enable_rls migrations.

ALTER TABLE "adesoes_beneficio_fixo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "adesoes_beneficio_fixo" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "adesoes_beneficio_fixo"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
