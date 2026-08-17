-- RLS for melhor_eu_possivel_registros, ikigai_avaliacoes and swot_pessoal_registros — same pattern as prior *_rls migrations.
-- (humor_registros already has RLS from before; gratidao1/2/3 are just new columns on that same table.)

ALTER TABLE "melhor_eu_possivel_registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "melhor_eu_possivel_registros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "melhor_eu_possivel_registros"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "ikigai_avaliacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ikigai_avaliacoes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ikigai_avaliacoes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "swot_pessoal_registros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "swot_pessoal_registros" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "swot_pessoal_registros"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
