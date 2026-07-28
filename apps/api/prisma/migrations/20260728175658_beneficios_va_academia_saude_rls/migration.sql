-- RLS for the benefits tables — same pattern as prior *_enable_rls migrations.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'beneficio_tipos',
      'coparticipacao_regras',
      'convenios_academia',
      'planos_saude',
      'plano_saude_faixas_etarias',
      'feriados',
      'adesoes_vale_diario',
      'adesoes_academia',
      'adesoes_plano_saude',
      'dependentes_plano_saude'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;
