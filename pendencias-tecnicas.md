# Pendências técnicas — Elos

Registro de trabalho pendente de implementação/elaboração, mantido no próprio
repositório (não só na memória de sessões de IA) para sobreviver a troca de
sessão/ferramenta. Atualizar este arquivo sempre que um item abaixo for
resolvido ou um novo for identificado.

---

## Motor de Conformidade Documental (compliance-engine)

Status: **core implementado** (Evento → Motor de Regras → Pendência → Alerta →
Resolução), rodando em produção desde 2026-08-20.

Concluído em 2026-08-20:

- **Tela administrativa de regras** — `/compliance/conformidade`
  (`apps/web/.../compliance/conformidade/page.tsx`), edita prazo/bloqueante/
  base legal e ativa/desativa regra, sem precisar de acesso direto ao banco.
- **Indicadores** — card "Índice de Conformidade Documental" em
  `/indicadores` (geral + por setor), consumindo `GET
  /compliance-engine/indice/{geral,setor}`.
- **Portal do Colaborador** — aba "Pendências" (`/portal/pendencias`)
  mostrando as pendências do próprio colaborador logado (`GET
  /portal/pendencias`, `PortalService.pendencias()` reaproveitando
  `ComplianceEngineService.listarPendencias`). Mostra todas as pendências
  (não só as de assinatura), já que hoje não existe um campo que distinga
  "exige assinatura" de outras pendências no schema — ver nota abaixo.

Pendente:

- **Campo explícito de "exige assinatura do colaborador"** — hoje
  `RegraConformidade`/`Pendencia` não tem esse booleano; o status
  `AGUARDANDO_ASSINATURA` existe mas nada o seta automaticamente ainda. Sem
  isso, o Portal mostra todas as pendências do colaborador, não um recorte
  específico de assinatura.
- **Aprovações** — quando uma pendência exige assinatura, nascer como item de
  Aprovações (fluxo de assinatura eletrônica via provedor ICP-Brasil). Depende
  do campo acima pra saber quais pendências disparam isso.
- **Elô (OCR)** — ao anexar o documento que resolve uma pendência, validar se
  o arquivo bate com o `tipo_documento` esperado.
- **Dois eventos sem fonte de dado real ainda** (motor já reconhece o tipo,
  mas nunca dispara): `MUDANCA_CARGA_HORARIA` e `MUDANCA_REGIME_TRABALHO` —
  não existe campo de carga horária/regime de trabalho no cadastro do
  colaborador hoje. Precisa desses campos existirem antes do evento fazer
  sentido.
- **`contrato_experiencia_nao_formalizado`** (tipo do Motor de Risco, não do
  Motor de Conformidade, mas mesma causa raiz) — não existe tracking de
  "colaborador em contrato de experiência" no sistema (`JobContrato` só tem
  CLT/ESTAGIO/PJ/INTERMITENTE).

## Motor de Risco (RiskEngineService)

Status: **implementado e em produção** desde 2026-08-20 (substituiu a
heurística antiga desconectada da Conformidade Geral).

Pendente:

- **Categoria Psicologia** (`avaliacao_psicossocial_pendente`,
  `afastamento_saude_mental_sem_acompanhamento`) — pesos cadastrados, mas sem
  nenhum item real: o módulo de Psicologia ainda é só um rótulo no sistema
  (sem tela, sem tabela). Precisa do módulo existir antes do motor ter o que
  varrer.
- **`epi_nao_registrado`** e **`pgr_pcmso_desatualizado`** hoje são
  aproximados a partir de dados existentes (EPI vencido / ação de PGR
  atrasada) — não são exatamente "não registrado"/"desatualizado" no sentido
  literal, é a melhor proxy disponível com o schema atual.

## Ponto Eletrônico (REP-P)

Status: **planejado, não iniciado.** Plano completo salvo em
`C:\Users\User\.claude\plans\delightful-purring-conway.md`.

O schema (Jornada, Batida, AjustePonto, CertificadoDigital, AfdGeracao) já
foi migrado para o banco de produção com RLS (efeito colateral de uma
migration desta sessão que já tinha esse draft acumulado no `schema.prisma`
sem commit), mas **nenhum service/controller/tela usa essas tabelas ainda**.
Zero risco de dado incorreto (tabelas vazias), mas o módulo em si — bater
ponto, calcular espelho, gerar AFD assinado — não existe.

Bloqueios reais fora do código (não é trabalho de implementação):
registro do software no INPI e certificado ICP-Brasil e-CNPJ por tenant,
necessários pra operar como REP-P válido de fato.

Retomar só depois que Férias + os dois motores acima estiverem
completamente estáveis em uso real (decisão explícita do usuário).

## Férias — reversão temporária pendente

Durante o cadastro manual de colaboradores migrando de outro sistema, o
checkbox "Lançamento histórico" em Programar Férias foi ampliado pra pular
saldo, fracionamento, limite/decadência do abono e aviso de 30 dias — não só
aviso/abono como antes (`FeriasService.programar()` /
`previewAlertas()`, comentário no código: "Reversível a qualquer momento").

**Quando o usuário avisar que todos os colaboradores já foram cadastrados**,
reverter esse `if (!dto.historico)` ampliado de volta ao escopo original
(só aviso de 30 dias + decadência do abono pulados, resto das validações
sempre ativas).

## Itens menores, não urgentes

- **Registro de Empregado** — o usuário mencionou duas vezes um
  `especificacao_registro_empregado.docx` e um `mockup.html` de referência
  que nunca foram encontrados na pasta do projeto. Se aparecerem, vale
  conferir a implementação atual contra eles.
- **Abreviação de "dias"** em `gestao-de-pessoas/ferias/page.tsx` — alguns
  literais tipo `{saldoDisponivel} dias` já são por extenso mas não são
  singular-aware (não viram "1 dia"). Fora do escopo da limpeza de
  abreviações já feita (`formatDias()` em `lib/format.ts`), não corrigido.
- **Chip "filial"** na lista "Quem está de férias hoje" (Visão Geral de
  Férias) usa `rounded-pill` mesmo não sendo um badge de status — decisão
  deliberada (visualmente indistinguível de um badge de verdade), mas é uma
  exceção à regra estrita de border-radius por função.
