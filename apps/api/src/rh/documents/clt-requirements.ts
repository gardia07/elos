/**
 * Core CLT-mandatory admission documents (RG, CPF, CTPS, PIS/PASEP, título de
 * eleitor, certificado de reservista, certidão de nascimento/casamento,
 * comprovante de residência/escolaridade, foto 3x4, ASO admissional) — seeded
 * for every tenant so document compliance always accounts for them, even
 * before an admin configures anything under Ferramentas > Documentos.
 * Mirrors the data migration in prisma/migrations/*_clt_document_requirements
 * for tenants that already existed when this list was introduced.
 */
export const CLT_DOCUMENT_REQUIREMENTS: { nome: string; categoria: string }[] = [
  { nome: 'RG', categoria: 'Identificação' },
  { nome: 'CPF', categoria: 'Identificação' },
  { nome: 'CTPS', categoria: 'Identificação' },
  { nome: 'PIS/PASEP', categoria: 'Identificação' },
  { nome: 'Título de eleitor', categoria: 'Identificação' },
  { nome: 'Certificado de reservista', categoria: 'Identificação' },
  { nome: 'Certidão de nascimento ou casamento', categoria: 'Identificação' },
  { nome: 'Comprovante de residência', categoria: 'Comprovantes' },
  { nome: 'Comprovante de escolaridade', categoria: 'Comprovantes' },
  { nome: 'Foto 3x4', categoria: 'Comprovantes' },
  { nome: 'ASO admissional', categoria: 'Saúde' },
];
