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
  `ComplianceEngineService.listarPendencias`).

Concluído em 2026-08-21 (grupo 2):

- **Aprovações** — pendências cujo `TipoDocumento.requerAssinaturaColaborador`
  é `true` (campo que já existia no schema, só não estava sendo lido em
  lugar nenhum) agora aparecem em `/aprovacoes` como um novo tipo
  `CONFORMIDADE`. "Aprovar" chama `resolverPendencia` (marca concluída
  manualmente, sem passar pela validação automática — uso pensado pra quando
  o documento chega por outro canal). "Recusar" chama o novo
  `descartarPendencia` (novo status `DESCARTADA`, pra quando a
  `condicaoAdicional` da regra não se aplicava de fato ao caso) — neutro no
  Índice de Conformidade, não conta como irregularidade.
- **Elô (OCR)** — novo endpoint `POST /portal/pendencias/:id/anexar`: o
  colaborador anexa o documento (pdf/jpg/png) que resolve a própria
  pendência, o modelo de visão (`claude-haiku-4-5`, ver
  `apps/api/src/compliance-engine/document-classifier.util.ts`) confere se o
  arquivo bate com o `tipo_documento` esperado antes de marcar concluída —
  se não bater, a pendência continua aberta e o motivo aparece na tela.
  Arquivo aceito só é guardado no Blob store quando passa na validação (não
  guarda arquivo errado). Faltou o equivalente do lado admin (RH anexando em
  nome de alguém pelo mesmo mecanismo) — hoje só existe pelo Portal.

Pendente:

- **Dois eventos sem fonte de dado real ainda** (motor já reconhece o tipo,
  mas nunca dispara): `MUDANCA_CARGA_HORARIA` e `MUDANCA_REGIME_TRABALHO` —
  não existe campo de carga horária/regime de trabalho no cadastro do
  colaborador hoje. Precisa desses campos existirem antes do evento fazer
  sentido.
## Motor de Risco (RiskEngineService)

Status: **implementado e em produção** desde 2026-08-20 (substituiu a
heurística antiga desconectada da Conformidade Geral).

Concluído em 2026-08-21:

- **`contrato_experiencia_nao_formalizado`** — novo campo
  `Employee.dataFimExperiencia` (só aparece no cadastro/edição pra
  colaboradores CLT). O motor sinaliza quando essa data já passou e o
  colaborador segue ATIVO; o RH resolve limpando a data (efetivação ou
  desligamento) na aba "Dados contratuais" do colaborador. Diferente dos
  outros campos de data do cadastro (que só avançam), este é o único que
  pode ser apagado de volta pra vazio -- é assim que o alerta se resolve.
  Não criado na admissão (só depois, editando o colaborador), igual ao
  padrão já usado pra `cnhValidade`.

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
