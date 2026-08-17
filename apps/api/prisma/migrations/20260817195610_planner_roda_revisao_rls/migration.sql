-- RLS for roda_da_vida_avaliacoes and revisoes_mensais — same pattern as prior *_rls migrations.

ALTER TABLE "roda_da_vida_avaliacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roda_da_vida_avaliacoes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "roda_da_vida_avaliacoes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "revisoes_mensais" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "revisoes_mensais" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "revisoes_mensais"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
