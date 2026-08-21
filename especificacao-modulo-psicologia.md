# ELOS — Módulo de Psicologia (Organizacional e do Trabalho)

## Plano Funcional v1

**Sistema:** ELOS
**Escopo desta versão:** prontuário psicológico completo + funções organizacionais, com riscos psicossociais (NR-1) compartilhado entre Psicologia, SST e Compliance.

> Este documento é a base de fundamentação (legislação + atuação profissional) e a estrutura funcional do módulo. Não trata de layout, cores ou componentes visuais — segue o padrão que você já usa para levar instruções ao Codex.

---

## 1. Por que este módulo é diferente dos outros

Todo módulo do ELOS lida com dados de colaboradores. Este lida, adicionalmente, com **dado sensível de saúde** (LGPD, art. 5º, II) produzido sob **sigilo profissional** (Código de Ética do Psicólogo, arts. 9º e 10). Isso muda o ponto de partida do design: a pergunta não é só "o que o módulo faz", mas **"quem tem o direito de ver o quê"** — e essa resposta precisa estar certa desde o modelo de dados, não como uma tela de permissões adicionada depois.

Dito de outro forma: nos outros módulos, RH é o dono natural do dado. Aqui, o psicólogo é o dono técnico e legal de uma fatia dos dados (prontuário, laudos, testes), mesmo dentro do sistema da empresa-cliente — e a instituição responde solidariamente pela guarda, mas não pelo acesso irrestrito.

Esse princípio orienta todas as decisões abaixo.

---

## 2. Fundamentação legal e normativa

### 2.1 Regulamentação da profissão

- **Lei nº 4.119/1962** — regulamenta a profissão de psicólogo no Brasil.
- **Lei nº 5.766/1971** — cria o Conselho Federal (CFP) e os Conselhos Regionais de Psicologia (CRPs), com poder de fiscalização do exercício profissional.
- Consequência prática: todo usuário do sistema que atuar como "psicólogo" no módulo precisa ter **número de CRP ativo** cadastrado — é isso que legitima suas ações (emitir laudo, aplicar teste, dar parecer).

### 2.2 Sigilo profissional

- **Código de Ética Profissional do Psicólogo** (Resolução CFP nº 010/2005), arts. 9º e 10 — o sigilo é a regra; só é quebrado em situações excepcionais previstas em lei (risco de vida, determinação legal, etc.), e mesmo assim de forma restrita ao necessário.
- Isso não é uma preferência de UX — é obrigação ética do profissional, com risco de processo ético-disciplinar no CRP se o sistema permitir vazamento (ex.: um analista de RH lendo um relatório de avaliação individual).

### 2.3 Documentos psicológicos

**Resolução CFP nº 06/2019** (institui regras para elaboração de documentos escritos, revogando a Resolução 07/2003) define seis tipos de documento, cada um com finalidade e conteúdo específicos — não são intercambiáveis:

| Documento | Finalidade | Pode citar diagnóstico/sintomas? |
|---|---|---|
| **Declaração** | Registra fato objetivo (comparecimento, datas/horários de acompanhamento) | Não |
| **Atestado Psicológico** | Certifica situação/funcionamento psicológico com base em diagnóstico (justificar falta, aptidão) | Sim |
| **Relatório Psicológico** | Descreve a atuação profissional em um processo de trabalho, sem finalidade diagnóstica | Não |
| **Relatório Multiprofissional** | Produzido em equipe multi (ex.: RH + SST + Psicologia), preservando a autonomia técnica de cada área | Depende |
| **Laudo Psicológico** | Resultado de avaliação psicológica sistemática, com finalidade diagnóstica/decisória (ex.: laudo de seleção, laudo pericial) | Sim |
| **Parecer Psicológico** | Pronunciamento técnico sobre uma questão específica, ou análise crítica de outro documento | Depende |

Regras que afetam diretamente o modelo de dados:

- **Guarda mínima de 5 anos** (art. 15), podendo ser ampliada por lei ou determinação judicial. Para menores de idade (ex.: aprendizes), a orientação corrente do setor de saúde/psicologia é manter por período maior — vale tratar como configurável por tipo de vínculo, não fixo.
- **Guarda compartilhada** entre psicólogo e instituição (art. 15, §1º) — a empresa-cliente responde pela infraestrutura de guarda, mas não pelo conteúdo/acesso.
- **Entrega ao avaliado**: o colaborador tem direito de acesso ao documento produzido sobre ele (art. 4º, §4º), com **entrevista devolutiva** e **protocolo de entrega assinado** (art. 16) quando aplicável — isso é um fluxo, não só um campo de "download".
- Documentos podem ser eletrônicos, desde que haja controle de integridade equivalente a assinatura/certificação digital (referência à Resolução CFP nº 11/2018, sobre atendimento por TICs).

### 2.4 Avaliação psicológica e testes

**Resolução CFP nº 31/2022** (revoga a 09/2018), regulamenta a avaliação psicológica e o **SATEPSI** (Sistema de Avaliação de Testes Psicológicos):

- Uso profissional de teste psicológico é **exclusivo de psicólogos** (art. 8º) — aplicação, correção e interpretação, seguindo o manual técnico aprovado.
- Só podem ser usados testes **favoráveis no SATEPSI** (satepsi.cfp.org.br); usar teste não aprovado ou reprovado é falta ética.
- Avaliação psicológica deve combinar múltiplas fontes: testes aprovados + entrevista + observação + histórico — nunca um teste isolado como decisão final.

Consequência prática: o módulo precisa de um **catálogo de instrumentos** com situação SATEPSI (aprovado/desfavorável/vencido), e a aplicação de qualquer teste só deve ficar disponível para usuários com CRP ativo no sistema.

### 2.5 Atuação do Psicólogo Organizacional e do Trabalho (POT)

Fontes: **Nota Técnica CFP nº 18/2024** (delimita o escopo de atuação em Trabalho e Organizações) e a cartilha **"Psicologia Organizacional e do Trabalho — Você Precisa Conhecê-la"** (CFP).

A POT se organiza em três campos, que mapeiam quase diretamente para submódulos:

1. **Psicologia e Gestão de Pessoas** — recrutamento e seleção, sucessão, avaliação de desempenho e competências, treinamento e desenvolvimento, orientação de carreira, inclusão, políticas de retenção, preparação para aposentadoria.
2. **Psicologia Organizacional** — clima e cultura, mudança e inovação organizacional, planejamento estratégico, comunicação interna, gestão de crises, dinâmica de poder.
3. **Psicologia do Trabalho** — riscos psicossociais, qualidade de vida no trabalho, segurança ocupacional, ergonomia, **prevenção a assédio moral e sexual**, perícias em contexto de trabalho.

A nota técnica reforça dois pontos éticos que valem virar regra de produto:
- O psicólogo deve estar **ciente das relações de poder** dentro da organização e não pode ser instrumentalizado para práticas discriminatórias ou punitivas disfarçadas de "avaliação psicológica" (ex.: laudo usado para justificar demissão de forma enviesada).
- Mesmo compartilhando atividades com RH/gestão (ex.: seleção), a perspectiva psicológica deve ser preservada — reforça por que o **parecer técnico do psicólogo é um artefato próprio**, não apenas um campo dentro do formulário de RH.

### 2.6 LGPD (Lei nº 13.709/2018)

- Dado psicológico é **dado sensível de saúde** (art. 5º, II) — exige base legal mais restrita que dado comum. Em contexto organizacional, normalmente: **consentimento específico** do colaborador, ou **tutela da saúde** (quando a avaliação for para fins de SST/PGR), documentados separadamente por finalidade.
- Consentimento deve ser **específico, informado, documentado e revogável** — um único "aceite de termos" genérico no onboarding não cobre isso.
- Direitos do titular: acesso, correção, portabilidade e eliminação (com ressalva do prazo legal de guarda dos documentos psicológicos, que prevalece sobre o pedido de eliminação enquanto vigente).
- Segurança exigida: controle de acesso por papel, criptografia em repouso e trânsito, log de auditoria (quem acessou o quê e quando), backups, e contrato de operação de dados com fornecedores (relevante para Supabase/Vercel/Railway já usados no ELOS).

### 2.7 NR-1 e riscos psicossociais (Portaria MTE nº 1.419/2025)

- **Já é obrigatório para todas as empresas com empregados CLT**, independente de porte ou setor — prazo era 26/05/2026, portanto já vigente.
- Exige identificação de **8 categorias de fatores psicossociais**: exigências excessivas de trabalho, organização inadequada, relações sociais deficientes, falta de reconhecimento, conflito trabalho–vida pessoal, insegurança contratual, violência e desalinhamento de valores.
- Metodologia aceita: entrevistas, grupos focais, questionários validados (ex.: COPSOQ-BR, JSS), análise de indicadores organizacionais (absenteísmo, turnover, afastamentos).
- Resultado entra no **PGR** (Programa de Gerenciamento de Riscos), com classificação de risco por setor/função e plano de ação — hoje monitorado via PCMSO no lado de SST.
- A norma não exige formalmente que seja psicólogo quem conduz, mas a metodologia (entrevistas, instrumentos validados, leitura de fenômenos psicossociais) é atividade tipicamente psicológica pela Nota Técnica 18/2024 — e ter psicólogo assinando tecnicamente reduz risco de questionamento em fiscalização.

---

## 3. Princípio arquitetural central: duas camadas de acesso

Tudo no módulo se encaixa em uma destas duas camadas. Essa distinção deve existir no banco (RLS no Supabase), não só na interface.

### Camada A — Organizacional (visível a RH/gestão conforme papel)
Dado agregado, ou dado individual **já filtrado pelo psicólogo** em forma de parecer/decisão. Exemplos: "Apto para a vaga", "Recomendado com ressalvas", mapa de calor de risco psicossocial por setor, indicadores de clima agregados, plano de T&D.

### Camada B — Restrita ao psicólogo (sigilo profissional)
Dado bruto, individual, protegido por sigilo. Exemplos: prontuário de atendimento, laudo com conteúdo diagnóstico, resultado bruto de teste psicológico, resposta individual de questionário de risco psicossocial, anotações de entrevista.

**Regra geral:** nada da Camada B vira visível na Camada A automaticamente. A transição só acontece quando o psicólogo **produz deliberadamente** um artefato de saída (parecer, atestado, indicador agregado) — nunca por "vazamento" de campo.

---

## 4. Papéis de usuário novos

| Papel | Descrição | Acesso |
|---|---|---|
| **Psicólogo(a) responsável** | Precisa de CRP ativo cadastrado (número + UF + situação, idealmente validada via consulta ao CRP). Só quem tem esse papel pode: aplicar/interpretar teste, emitir laudo/atestado/parecer, acessar prontuário individual. | Camada A + Camada B (dos casos sob sua responsabilidade) |
| **RH / Analista (papel já existente)** | Continua com acesso pleno ao restante do ELOS. Dentro da Psicologia, só vê Camada A. | Camada A |
| **Gestor da área** | Vê apenas indicadores agregados do seu setor (ex.: risco psicossocial do time), nunca dado individual. | Camada A (recorte por setor) |
| **Colaborador (Portal do Colaborador)** | Acessa os próprios documentos psicológicos entregues a ele (art. 4º, §4º da Res. 06/2019), histórico de participação em pesquisas de clima, e pode dar consentimento/revogar. | Somente seus próprios dados |

Um psicólogo terceirizado (prestador PJ) deve ser suportado como o mesmo papel — a lei não distingue CLT vs. autônomo para fins de responsabilidade técnica, só exige CRP ativo.

---

## 5. Estrutura funcional do módulo

### 5.1 Cadastro do(a) Psicólogo(a) responsável
- CRP (número + UF), especialidade/título de especialista (se houver), vínculo (CLT/PJ/consultoria), assinatura eletrônica vinculada.
- Sem esse cadastro completo, o usuário não pode acessar nenhuma função da Camada B — é o gate de todo o módulo.

### 5.2 Prontuário Psicológico
- Um prontuário por colaborador (vinculado à Pessoa, não ao Vínculo — reaproveitando a separação Pessoa/Vínculo que o ELOS já usa para casos de recontratação).
- Registro de atendimentos/sessões (data, tipo — escuta, orientação, avaliação —, psicólogo responsável).
- Emissão de documentos seguindo os 6 tipos da Resolução 06/2019, cada um com template e regras próprias de conteúdo permitido (ex.: o sistema não deve deixar salvar uma "Declaração" com campo de diagnóstico preenchido).
- Ciclo de vida do documento: rascunho → finalizado (trava edição) → entregue (com protocolo assinado pelo colaborador, quando aplicável) → arquivado.
- Contador de retenção automático a partir da data de emissão (mínimo 5 anos, configurável para prazos maiores).
- Nada aqui é visível fora da Camada B, exceto o que o próprio psicólogo decidir liberar como parecer formal para outro fluxo (ex.: seleção).

### 5.3 Avaliação Psicológica e Testes
- Catálogo de instrumentos com status SATEPSI (aprovado / desfavorável / vencido) — bloquear aplicação de teste não aprovado.
- Registro de aplicação: teste utilizado, colaborador ou candidato avaliado, psicólogo aplicador (CRP), data, resultado bruto (Camada B).
- Resultado interpretado vira insumo para um Laudo ou Parecer (Camada B), do qual só o desfecho objetivo migra para a Camada A quando pertinente (ex.: seleção).

### 5.4 Recrutamento e Seleção (integração com Gestão de Pessoas)
- O pipeline de vaga já existente no módulo de Gestão de Pessoas ganha uma etapa "Avaliação Psicológica" quando o processo exigir.
- Recrutador vê status ("Avaliação concluída — Recomendado / Recomendado com ressalvas / Não recomendado") e, se autorizado pelo psicólogo, o Parecer Psicológico formal — nunca o teste bruto ou anotações de entrevista.
- Isso evita o erro clássico de compliance: gestor de vaga decidindo com base em interpretação própria de um teste que não deveria ver.

### 5.5 Riscos Psicossociais / NR-1 (compartilhado Psicologia + SST + Compliance)
- Aplicação de questionários validados (ex.: COPSOQ-BR) por setor/função, conduzida pela Psicologia.
- Respostas individuais ficam em Camada B (mesmo anonimizadas nominalmente, o cruzamento com setor pequeno pode reidentificar — tratar com cautela estatística, ex.: suprimir resultado de grupos com menos de N respondentes).
- Resultado agregado por setor/função vira **indicador de risco (baixo/médio/alto)** na Camada A, visível tanto na tela de Psicologia quanto no módulo de SST — é o mesmo dado, duas entradas de menu, sem duplicar cadastro (por isso "ambos" no seu direcionamento: dono técnico é a Psicologia, consumidor é o SST/PGR).
- Plano de ação derivado do risco alimenta o mecanismo de pendências automáticas do Compliance (o mesmo princípio que vocês já definiram: mudança de estado gera pendência até resolução) — ex.: risco "alto" em um setor gera pendência de plano de ação com prazo.
- Guarda a metodologia e a data de aplicação para efeito de fiscalização (evidência de conformidade com a Portaria MTE 1.419/2025).

### 5.6 Clima e Cultura Organizacional
- Pesquisas de clima com respostas anônimas por padrão; agregação mínima por grupo (mesma regra de supressão por N mínimo do item 5.5).
- Painel de tendência histórica (Camada A), sem exposição de resposta individual em nenhum cenário — aqui não há "psicólogo dono do dado bruto" da mesma forma que no prontuário, mas o anonimato é o mecanismo de proteção.

### 5.7 Desenvolvimento e Carreira
- PDI (Plano de Desenvolvimento Individual), trilhas de treinamento, avaliação de competências — dados de Camada A, já que não são clínicos, mas se beneficiam do olhar técnico do psicólogo organizacional.
- Integra com a estrutura de cargo/trilha (técnica vs. gestão) que o ELOS já modela no módulo de Gestão de Pessoas.

### 5.8 Agenda de Atendimentos
- Usa o módulo de Agenda já existente no ELOS, mas o evento de atendimento psicológico aparece para terceiros apenas como "Ocupado" — nunca com título, colaborador atendido ou motivo visíveis fora da Camada B.

### 5.9 Consentimento e Privacidade (LGPD)
- Registro de consentimento por finalidade (ex.: "avaliação para seleção", "acompanhamento psicológico organizacional", "pesquisa de risco psicossocial"), com data, texto apresentado e possibilidade de revogação pelo colaborador via Portal do Colaborador.
- Log de auditoria de acesso a qualquer registro de Camada B: quem acessou, quando, o quê — necessário tanto para LGPD quanto para defesa do psicólogo em eventual questionamento ético.

---

## 6. Requisitos técnicos e de segurança

- **Row-Level Security no Supabase**: a separação Camada A / Camada B deve ser imposta por policy no banco, não só por condicional na interface — um psicólogo removido do caso, ou um usuário de RH, não pode contornar a UI e puxar o dado via API.
- **Criptografia em repouso** para as tabelas de Camada B (prontuário, laudos, resultados de teste).
- **Assinatura/certificação eletrônica** nos documentos finalizados (referência à Resolução CFP 11/2018), garantindo integridade após emissão.
- **Retenção automatizada**: job que sinaliza documentos elegíveis para arquivamento/expurgo ao completar o prazo mínimo, sem apagar automaticamente (decisão de expurgo deve ser humana, dado o risco de ordem judicial superveniente).
- **Ativação por módulo**: como já definido para os demais módulos do ELOS, as telas de Psicologia só aparecem para clientes com o módulo ativo — e, dentro dele, as funções de Camada B só aparecem para usuários com papel de Psicólogo(a) responsável e CRP validado.

---

## 7. Pontos de atenção regulatórios (o que pode dar errado se mal implementado)

- **Misturar "Atestado" com "Relatório"** no mesmo template — são documentos juridicamente distintos (um pode conter diagnóstico, o outro não). Vale modelar como tipos de documento separados desde o início, não como um único formulário com campos opcionais.
- **RH lendo laudo bruto de seleção** — viola sigilo profissional mesmo com boa intenção; o sistema precisa tornar isso estruturalmente impossível, não apenas "não recomendado".
- **Reidentificação em pesquisas de clima/risco psicossocial** por setores pequenos — precisa de regra de supressão estatística, não só "resposta anônima".
- **Prontuário sem trilha de auditoria** — em caso de fiscalização do CRP ou judicialização, faltar log de acesso é tão grave quanto vazar o dado.
- **Retenção tratada como campo fixo de 5 anos** — na prática varia por tipo de documento, determinação judicial e vínculo (menor aprendiz) — melhor modelar como regra configurável por tipo, com o mínimo legal como piso.

---

## 8. Próximos passos sugeridos

1. Validar este desenho com você (ajustes de escopo, nomenclatura das telas, o que entra na v1 vs. depois).
2. Detalhar o **modelo de dados** (entidades, campos, relações) para os submódulos 5.2 a 5.5, que são os que têm exigência legal mais específica.
3. Escrever as **instruções funcionais por tela**, no formato que você já leva ao Codex, começando por Prontuário Psicológico e Avaliação/Testes (base de tudo o resto).
4. Definir o desenho de permissões (RLS) em conjunto com quem está implementando o Compliance, já que os dois módulos compartilham o mecanismo de pendências automáticas.

---

## Fontes consultadas

- [Resolução CFP nº 06/2019 — elaboração de documentos escritos](https://www.crprs.org.br/conteudo/res062019comentada.pdf)
- [CFP — nova resolução sobre elaboração de documentos escritos](https://site.cfp.org.br/cfp-publica-nova-resolucao-sobre-elaboracao-de-documentos-escritos/)
- [Resolução CFP nº 31/2022 — avaliação psicológica e SATEPSI](https://www.legisweb.com.br/legislacao/?id=473938)
- [SATEPSI — Sistema de Avaliação de Testes Psicológicos](https://satepsi.cfp.org.br/)
- [Nota Técnica CFP nº 18/2024 — escopo da atuação em Trabalho e Organizações](https://site.cfp.org.br/wp-content/uploads/2024/07/nota_tecnica-1.pdf)
- [Cartilha CFP — Psicologia Organizacional e do Trabalho (POT)](https://site.cfp.org.br/wp-content/uploads/2025/06/cartilha_POT_B.pdf)
- [Código de Ética Profissional do Psicólogo](https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf)
- [LGPD para psicólogos — obrigações práticas](https://agilizapsi.com.br/blog/lgpd-para-psicologos.html)
- [NR-1 atualizada — riscos psicossociais e PGR (Portaria MTE 1.419/2025)](https://climec.com.br/blog/nr-1-atualizada-2026-riscos-psicossociais-obrigatorios/)
