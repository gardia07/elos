-- Seed the default external-shortcut catalog for every existing tenant.
-- provisionNewTenant() seeds the same list for new tenants going forward —
-- see auth.service.ts / default-atalhos-externos.ts.
-- sistema = true marks these as the built-in set (not deletable from the UI).
DO $$
DECLARE
  t RECORD;
  atalhos CONSTANT text[][] := ARRAY[
    ARRAY['eSocial', 'https://login.esocial.gov.br', 'FileText', '0'],
    ARRAY['gov.br (Meu INSS)', 'https://meu.inss.gov.br', 'Landmark', '1'],
    ARRAY['Caixa (FGTS/PIS)', 'https://www.caixa.gov.br/beneficios-trabalhador', 'Banknote', '2'],
    ARRAY['Receita Federal (e-CAC)', 'https://cav.receita.fazenda.gov.br', 'Receipt', '3'],
    ARRAY['Google Drive/Docs', 'https://drive.google.com', 'HardDrive', '4'],
    ARRAY['Google Calendar', 'https://calendar.google.com', 'CalendarDays', '5'],
    ARRAY['Microsoft 365/OneDrive', 'https://www.office.com', 'Cloud', '6'],
    ARRAY['LinkedIn Recruiter', 'https://www.linkedin.com/talent', 'Linkedin', '7'],
    ARRAY['Gupy', 'https://gupy.io', 'Briefcase', '8'],
    ARRAY['Zoom', 'https://zoom.us', 'Video', '9'],
    ARRAY['Google Meet', 'https://meet.google.com', 'Camera', '10'],
    ARRAY['Trello', 'https://trello.com', 'Kanban', '11'],
    ARRAY['Asana', 'https://app.asana.com', 'CheckSquare', '12'],
    ARRAY['Notion', 'https://www.notion.so', 'BookOpen', '13']
  ];
  i INT;
BEGIN
  FOR t IN SELECT id FROM "tenants" LOOP
    FOR i IN 1..array_length(atalhos, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "atalhos_externos" WHERE "tenantId" = t.id AND "nome" = atalhos[i][1]
      ) THEN
        INSERT INTO "atalhos_externos"
          ("id", "tenantId", "nome", "url", "icone", "tipo", "sistema", "ordem", "createdAt")
        VALUES
          (gen_random_uuid(), t.id, atalhos[i][1], atalhos[i][2], atalhos[i][3], 'LINK_SIMPLES', true, atalhos[i][4]::int, now());
      END IF;
    END LOOP;
  END LOOP;
END $$;
