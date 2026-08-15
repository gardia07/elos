-- Seed the 4 default agenda categories (section 6.4 of the Agenda module
-- spec) for every existing tenant. provisionNewTenant() seeds the same
-- list for new tenants going forward — see auth.service.ts.
-- sistema = true marks these as the built-in set (not deletable from the UI).
DO $$
DECLARE
  t RECORD;
  cats CONSTANT text[][] := ARRAY[
    ARRAY['RH — Legal/Prazo', '#b06a5e', '#d98b7e', 'AlertTriangle', '0'],
    ARRAY['RH — Rotina', '#3b82f6', '#6fa8fa', 'Users', '1'],
    ARRAY['Pessoal/Equipe', '#6d8a3d', '#92b563', 'PartyPopper', '2'],
    ARRAY['Anotação/Lembrete', '#c9a227', '#e6c358', 'StickyNote', '3']
  ];
  i INT;
BEGIN
  FOR t IN SELECT id FROM "tenants" LOOP
    FOR i IN 1..array_length(cats, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "agenda_categorias" WHERE "tenantId" = t.id AND "nome" = cats[i][1]
      ) THEN
        INSERT INTO "agenda_categorias"
          ("id", "tenantId", "nome", "cor", "corDark", "icone", "ordem", "sistema", "createdAt")
        VALUES
          (gen_random_uuid(), t.id, cats[i][1], cats[i][2], cats[i][3], cats[i][4], cats[i][5]::int, true, now());
      END IF;
    END LOOP;
  END LOOP;
END $$;
