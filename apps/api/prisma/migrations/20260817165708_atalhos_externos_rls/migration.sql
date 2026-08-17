-- RLS for atalhos_externos — same pattern as prior *_rls migrations.

ALTER TABLE "atalhos_externos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "atalhos_externos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "atalhos_externos"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
