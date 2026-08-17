-- RLS for projetos and projeto_participantes — same pattern as prior *_rls migrations.

ALTER TABLE "projetos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projetos" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "projetos"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "projeto_participantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projeto_participantes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "projeto_participantes"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
