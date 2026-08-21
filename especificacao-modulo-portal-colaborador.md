# Portal do Colaborador — Proposta de Módulo

Cadastro de Colaboradores, ponto, banco de horas, assinatura de documentos, solicitações e a camada de bem-estar. Preparado a partir de pesquisa global sobre expectativas de colaboradores e da legislação trabalhista brasileira vigente (agosto de 2026).

## Resumo executivo

Este documento propõe o desenho completo do módulo Portal do Colaborador do ELOS — o espaço onde cada pessoa da empresa-cliente acessa seu próprio cadastro, ponto, banco de horas, documentos e solicitações. A proposta segue o mesmo princípio que você já definiu para o restante do ELOS: o núcleo jurídico obrigatório (ponto eletrônico, banco de horas, assinatura de documentos, eSocial, LGPD) é construído com rigor e, onde exigir homologação específica, delegado a provedores certificados via API — enquanto a experiência do colaborador permanece inteira dentro do ELOS. Sobre esse núcleo, a pesquisa mostra uma oportunidade clara: colaboradores em todo o mundo já esperam que o sistema de RH seja também um espaço de bem-estar, e não apenas um repositório de documentos e ponto. É essa combinação — conformidade impecável mais uma camada de vida real (saúde, alimentação, educação, hobbies, planejamento pessoal) — que separa um "sistema de RH" de um portal que o colaborador escolheria abrir por conta própria.

O documento está organizado em cinco partes: o que a pesquisa global mostra sobre o que colaboradores valorizam; o núcleo jurídico inegociável no Brasil; a arquitetura funcional do módulo (cadastro, ponto, banco de horas, assinatura, solicitações); a camada de bem-estar e vida pessoal; e a arquitetura técnica, incluindo um ponto que precisa da sua decisão antes de seguir para o Codex.

## O que os colaboradores valorizam globalmente em 2026

A pesquisa de 2026 confirma um deslocamento que já vinha se desenhando desde a pandemia: benefícios deixaram de ser tratados como itens isolados (plano de saúde de um lado, vale-refeição de outro, day-off de aniversário em algum lugar perdido) e passaram a ser avaliados pelos colaboradores como uma experiência única e coerente. A Mercer, no Global Talent Trends 2026, e a Gallup, no State of the Global Workplace, convergem no mesmo diagnóstico: engajamento despenca quando o colaborador sente que a empresa só o enxerga como recurso produtivo, e sobe quando ele percebe investimento genuíno em sua vida como um todo — saúde física, saúde mental, situação financeira e desenvolvimento.

Do levantamento da WEX sobre tendências de benefícios para 2026 e do relatório da Wellhub sobre bem-estar corporativo, seis padrões se repetem com força suficiente para orientar o desenho do módulo:

**Bem-estar holístico e integrado.** Saúde física, mental e financeira deixam de ser programas separados e passam a viver numa experiência conectada — terapia virtual, orientação financeira e acompanhamento de saúde preventiva no mesmo lugar onde o colaborador vê seu contracheque. A Wellhub reporta que 89% dos colaboradores dizem ter melhor desempenho quando priorizam o próprio bem-estar, e 91% associam espaços de bem-estar (academia, yoga) a redução do estresse ligado ao trabalho — ou seja, isso não é um "mimo", é um fator de produtividade que a liderança entende e valoriza.

**Confiança financeira como prioridade emergente.** Educação financeira, ferramentas de orçamento pessoal e orientação individual aparecem como uma das tendências de maior crescimento — não apenas benefício de aposentadoria, mas ajuda prática para lidar com o salário do mês a mês.

**Personalização em vez de pacote único.** Um pacote de benefícios genérico perde relevância; colaboradores esperam que o sistema reconheça o momento de vida de cada um (quem tem filhos pequenos, quem estuda, quem cuida de um familiar) e ajuste as ofertas de acordo.

**Saúde preventiva, não só reativa.** Incentivo a check-ups e rastreamento precoce, com ferramentas digitais para acompanhar condições ao longo do tempo, em vez de o plano de saúde só entrar em cena quando algo já deu errado.

**Plataforma unificada.** Um dos achados mais consistentes: colaboradores penalizam experiências fragmentadas. Ter que abrir um app para o ponto, outro para o benefício de alimentação, um portal separado do RH e uma planilha para pedir férias é, em si, um fator de insatisfação — independentemente da qualidade de cada ferramenta isolada.

**Apoio familiar e flexibilidade.** Benefícios de cuidado com filhos e familiares dependentes, e políticas equilibradas entre presencial e remoto, seguem subindo em relevância.

No Brasil, essa mesma lógica aparece descrita pela Gupy no conceito de portal do colaborador: autonomia, agilidade e transparência são os três ganhos percebidos pelo colaborador, enquanto a empresa ganha redução de carga administrativa no RH e mais segurança sobre dados sensíveis por centralizar tudo num ambiente controlado — em vez de planilhas soltas e e-mails com anexos de documentos pessoais circulando por aí.

## O núcleo jurídico: o que é inegociável no Brasil

Antes de qualquer diferencial, o módulo precisa acertar o que a legislação brasileira exige. Esta seção resume o que rege cada peça do Cadastro de Colaboradores hoje.

### Cadastro e admissão (eSocial — evento S-2200)

O cadastro do colaborador não é um formulário livre: ele precisa capturar, desde o primeiro dia, todos os grupos de dados que o eSocial exige no evento S-2200 de admissão — dados pessoais completos (CPF, nome, sexo, raça/cor, estado civil, grau de instrução, data de nascimento, naturalidade e nacionalidade, nome da mãe), documentos (CTPS, RG, NIS, e quando aplicável RNE), endereço, informações de deficiência quando houver, dependentes, dados de contato, e o vínculo contratual em si (matrícula, regime CLT/estatutário, regime previdenciário, data de admissão, cargo, CBO, salário e jornada contratual). Como o ELOS já modela a separação Pessoa/Vínculo com o CPF como chave permanente, o cadastro do Portal do Colaborador deve nascer casado com esse modelo desde o campo mais simples — evitando retrabalho quando a Central de DP for enviar o S-2200 de fato.

### Ponto eletrônico (Portaria 671/2021)

A Portaria 671/2021 define três tipos de Registrador Eletrônico de Ponto, e essa escolha determina boa parte do desenho técnico do módulo. O REP-C é o relógio de ponto físico tradicional, com homologação do Ministério do Trabalho — não é o caminho para um app. O REP-A é uma modalidade alternativa (hardware ou software) que só pode ser adotada mediante negociação coletiva, sem homologação ministerial, mas dependente de acordo sindical. O REP-P é o que interessa diretamente ao ELOS: é a modalidade baseada em programa/aplicativo, que exige registro do software no INPI (não homologação do Ministério) e é o caminho natural para marcação por celular. Um app de ponto REP-P precisa gerar o Arquivo Eletrônico de Jornada (AEJ), permitir — mas não exigir — marcação offline, e emitir recibo em PDF assinado digitalmente no padrão PAdES. Um requisito frequentemente esquecido: a pré-assinalação do intervalo intrajornada (CLT, art. 74, §2º) precisa aparecer tanto no recibo quanto no AEJ, não apenas como texto de cabeçalho. E há uma linha vermelha clara: qualquer função de "complementar" ponto no software só pode preencher omissões reais — nunca inserir marcações fabricadas para fechar conta de hora extra. Ver as perguntas e respostas oficiais do Ministério do Trabalho sobre a Portaria 671.

Dado que a Elos já trabalha com o princípio de delegar áreas regulamentadas a provedores homologados (como você definiu para ICP-Brasil e o webservice do eSocial), o caminho mais seguro para o ponto é o mesmo: ou o ELOS registra o próprio software como REP-P no INPI e assume a responsabilidade regulatória inteira, ou integra via API com um REP-P já homologado (Sólides Ponto, Secullum, Tangerino, entre outros) mantendo a experiência de marcação dentro do app do colaborador. A segunda opção é consistente com o que você já decidiu para assinatura digital e eSocial, e evita que o ELOS precise manter compliance de ponto eletrônico como parte central do seu próprio negócio.

### Banco de horas

O banco de horas tem duas modalidades com regras distintas, e o módulo precisa suportar ambas porque empresas-cliente diferentes vão adotar uma ou outra. O banco de horas individual é um acordo direto e por escrito entre empresa e colaborador, sem participação sindical, com prazo de compensação de até seis meses. O banco de horas coletivo exige negociação via convenção ou acordo coletivo com o sindicato, e em troca disso ganha um prazo de compensação maior, de até doze meses. Em ambos os casos, a jornada semanal não pode passar de 44 horas nem a diária de 10 horas incluindo extras, e qualquer saldo não compensado dentro do prazo tem que ser pago com adicional de pelo menos 50% — não pode simplesmente "rolar" para o mês seguinte. Acordo verbal não vale nada juridicamente: é preciso documento formal, e é exatamente aí que a assinatura eletrônica do próprio módulo entra em jogo, fechando o ciclo cadastro → acordo assinado → apuração → compensação sem sair do sistema. Ver mais em Banco de Horas Individual e Coletivo na CLT.

### Assinatura eletrônica de documentos trabalhistas

A Lei 14.063/2020 organiza a assinatura eletrônica em três níveis: qualificada (com certificado ICP-Brasil), avançada (comprova autoria e integridade por outros meios, sem exigir ICP-Brasil) e simples (identificação mais básica do signatário). Para a imensa maioria dos documentos de DP — contrato de trabalho e aditivos, acordo de banco de horas, recibos de pagamento e de férias, comunicados, advertências, políticas internas — a assinatura avançada já é juridicamente suficiente; não é preciso exigir certificado ICP-Brasil de cada colaborador. O que sustenta a validade jurídica são três pilares: autoria (identificar quem assinou), integridade (garantir que o conteúdo não foi alterado depois) e consentimento (registrar que a pessoa concordou livremente). Na prática, isso significa manter uma trilha de auditoria completa — data, hora, IP, método de autenticação usado no momento da assinatura — e preservar o documento num formato que evidencie qualquer alteração posterior. Ver validade jurídica de assinatura eletrônica em documentos de DP/RH.

### LGPD: dados sensíveis do colaborador

O cadastro de colaborador concentra várias categorias de dado sensível que pedem tratamento redobrado: atestados médicos com CID, registros de afastamento pelo INSS, licença-maternidade, adesão a plano de saúde, dados biométricos caso o ponto use digital ou reconhecimento facial, e informações de dependentes menores de idade (que pedem salvaguarda adicional pelo Estatuto da Criança e do Adolescente). A base legal correta para a maior parte do processamento de folha e cadastro não é o consentimento — é a obrigação legal e a execução do próprio contrato de trabalho; consentimento fica reservado para usos não obrigatórios, como funcionalidades sociais opcionais dentro do portal. Na prática, isso se traduz em minimização (coletar só o estritamente necessário para cada finalidade), prazos de retenção definidos (recibos de salário geralmente cinco anos, documentação de FGTS por período mais longo) com descarte sistemático em vez de armazenamento indefinido, controle de acesso restrito a quem realmente precisa ver cada dado, e trilha de auditoria completa substituindo qualquer circulação de documento físico ou por e-mail. Ver LGPD na folha de pagamento.

### Vale-alimentação e o Novo PAT

O Programa de Alimentação do Trabalhador entrou numa segunda fase regulatória em fevereiro de 2026, com foco em interoperabilidade entre cartões e maquininhas de diferentes operadoras — a expectativa é interoperabilidade total até novembro de 2026 — além de limitação das taxas cobradas por operadoras, prazos mais curtos de repasse a estabelecimentos e restrição a certas vantagens comerciais entre operadoras e empresas. Para o módulo de benefícios, isso significa dois cuidados práticos: manter o cadastro de operadora de vale-alimentação como algo configurável por empresa-cliente (não fixo a um único parceiro), e desenhar o motor de apuração de benefícios já sabendo que o cenário de interoperabilidade vai mudar como o valor chega ao colaborador ao longo de 2026. Ver o que muda na segunda fase do Novo PAT.

## Arquitetura funcional do módulo

Com o núcleo jurídico mapeado, a proposta de funcionalidades do Portal do Colaborador organiza-se em sete frentes. A tabela resume cada uma, sua função central e a base legal ou de pesquisa que a sustenta; o texto abaixo detalha os pontos que pedem decisão de produto.

| Frente | O que entrega ao colaborador | Base |
|---|---|---|
| Perfil e cadastro | Dados pessoais, documentos, dependentes, endereço, dados bancários — visualização e solicitação de atualização com aprovação do RH | eSocial S-2200 |
| Ponto | Marcação por app (REP-P), espelho de ponto, pré-assinalação de intervalo, recibo assinado em PDF | Portaria 671/2021 |
| Banco de horas | Saldo em tempo real, extrato de créditos/débitos, alerta de saldo perto do limite ou do vencimento do prazo de compensação | CLT, banco de horas individual/coletivo |
| Assinatura de documentos | Fila de documentos pendentes, assinatura avançada com trilha de auditoria, histórico de documentos assinados | Lei 14.063/2020 |
| Solicitações | Férias, atestados, adiantamento salarial, alteração cadastral, declarações — cada uma com fluxo de aprovação e prazo visível | Fluxo interno + integra com o motor de pendências do módulo de Compliance |
| Financeiro do colaborador | Contracheque, informe de rendimentos, extrato de FGTS (via integração), simulador de férias e rescisão | eSocial, obrigações fiscais |
| Benefícios | Saldo e extrato de VA/VR, plano de saúde, adesão/alteração de benefícios | Novo PAT, apuração já prevista no módulo de Benefícios do ELOS |

Duas decisões de produto merecem destaque. A primeira é que Solicitações deveria conversar diretamente com o motor de pendências que você já desenhou para o Compliance: uma solicitação de mudança de cargo ou de carga horária feita pelo próprio colaborador é o mesmo tipo de evento que hoje já dispara ASO de troca de função ou aditivo contratual — o Portal do Colaborador não precisa reinventar esse fluxo, só precisa ser mais um ponto de entrada para ele. A segunda é que o espelho de ponto e o extrato de banco de horas deveriam viver na mesma tela, porque juridicamente são a mesma informação vista de dois ângulos — separar os dois em telas diferentes é exatamente o tipo de fragmentação que a pesquisa aponta como fonte de insatisfação.

## A camada de bem-estar e vida pessoal

Aqui está o diferencial que você pediu para pesquisar. A ideia não é competir com um plano de saúde ou um aplicativo de meditação — é ser o lugar onde o colaborador naturalmente pousa todo santo dia, e que por isso vale a pena carregar uma camada de vida real, coerente com o que a pesquisa mostra que as pessoas mais valorizam. Cinco frentes fazem sentido para o ELOS, em ordem de prioridade sugerida.

**Saúde.** Central de saúde ocupacional (ASOs, exames periódicos, vacinação — dados que o ELOS já processa no módulo de SST) exposta ao próprio colaborador em linguagem simples, mais um espaço de saúde preventiva: lembretes de exames de rotina, e — quando a empresa-cliente tiver o benefício — acesso a telemedicina ou orientação com psicólogo via parceiro integrado. É o item de maior sinergia com o que o ELOS já constrói (o módulo de Psicologia Organizacional e o SST), então é o ponto de menor esforço para o maior impacto percebido.

**Alimentação.** Além do saldo de vale-alimentação (que já está no radar do módulo de Benefícios), um espaço simples de acompanhamento nutricional — não um app de dieta completo, mas conteúdo e dicas relevantes, e no médio prazo integração com nutricionista parceiro da empresa-cliente, seguindo a mesma lógica de "conteúdo relevante hoje, parceiro integrado amanhã" que a pesquisa aponta como tendência ("nutrição e estilo de vida" no relatório da Wellhub).

**Educação.** Trilhas de aprendizado ligadas ao cargo e à carreira (aproveitando a estrutura Y de cargo-base + níveis que o ELOS já modela), biblioteca de conteúdo por área de atuação — a mesma biblioteca de livros que você já mencionou para a Área de Trabalho poderia viver aqui também, com recomendação por cargo — e, se fizer sentido para o cliente, apoio a educação formal (bolsa parcial, declaração para faculdade, como você já fez manualmente na Tectronix).

**Hobbies e comunidade.** O item de menor prioridade jurídica e maior potencial de engajamento de longo prazo: grupos de interesse dentro da empresa-cliente (corrida, leitura, jogos), mural de conquistas e reconhecimento entre pares, e um toque leve de gamificação — não pontos e emblemas genéricos, mas reconhecimento vinculado a marcos reais (tempo de casa, metas batidas, participação em treinamento). A pesquisa mostra que gamificação bem aplicada aumenta engajamento de forma consistente, mas o risco de parecer infantil é real — a recomendação é manter esse item discreto e opcional, não uma aba central do portal.

**Planner pessoal.** Você já mencionou esse item para a Área de Trabalho geral; no Portal do Colaborador ele ganha uma versão mais pessoal: agenda que cruza compromissos de trabalho (já vindos do módulo Agenda) com metas pessoais simples, e um espaço de anotações particulares do colaborador — não visível ao RH, para reforçar que o portal também é dele, não só uma extensão de vigilância da empresa. Esse detalhe de privacidade importa: pesquisa mostra que colaboradores desconfiam de "benefícios de bem-estar" que na prática são vigilância disfarçada, então qualquer funcionalidade pessoal precisa deixar claro, na interface, o que a empresa vê e o que não vê.

## Arquitetura técnica

O padrão de hospedagem que você já usa segue de pé: frontend na Vercel, backend no Railway. O ponto que precisa da sua decisão é o banco de dados e a autenticação.

Você mencionou "Postgres via Neon" para este módulo, mas o ELOS hoje roda em Supabase (banco + autenticação). Vale entender a diferença antes de seguir, porque não é só troca de provedor de banco — é uma escolha de arquitetura de autenticação. O Supabase entrega autenticação pronta para produção (login social, JWT, MFA) com Row-Level Security integrada ao contexto de autenticação, o que é particularmente útil para isolar dados por empresa-cliente num sistema multi-tenant como o ELOS. O Neon, por outro lado, é focado em ser o melhor Postgres serverless do mercado — com scale-to-zero (o banco "desliga" depois de minutos sem uso e volta sob demanda, o que reduz custo para tenants inativos) e branching instantâneo de banco de dados por pull request, útil para o time que desenvolve com Codex testar mudanças de schema sem afetar produção. A autenticação gerenciada do Neon (Better Auth) ainda está em beta desde julho de 2026 e não é, hoje, um substituto direto e maduro para o que o Supabase já entrega pronto. Ver a comparação Neon vs. Supabase para SaaS multi-tenant em 2026.

Na prática, isso deixa três caminhos possíveis, e a escolha entre eles é sua: manter Supabase como está hoje (mais simples, autenticação e RLS já resolvidas, ligeiramente mais caro em tenants ociosos); migrar banco e autenticação para Neon com uma camada de autenticação própria ou o Better Auth do Neon quando amadurecer (mais barato em escala com muitos tenants pequenos, mais trabalho de engenharia agora); ou um caminho híbrido, mantendo Supabase para autenticação enquanto se avalia Neon para cargas de dados específicas que se beneficiem de branching — o que provavelmente é complexidade desnecessária para o estágio atual do ELOS. Dado que o ELOS já tem multi-tenant funcionando sobre Supabase com RLS, a recomendação é permanecer em Supabase para este módulo, e tratar Neon como uma reavaliação futura quando o Better Auth sair do beta e o volume de tenants justificar a economia de scale-to-zero — mas essa é uma decisão sua, não técnica apenas.

Independentemente dessa escolha, o padrão de integração para as áreas regulamentadas segue o princípio que você já definiu: ponto eletrônico via REP-P homologado (próprio ou de parceiro), assinatura eletrônica com trilha de auditoria própria para os documentos de menor risco jurídico e via parceiro ICP-Brasil quando o documento exigir assinatura qualificada, e o eSocial via o webservice que a Central de DP já usa — o Portal do Colaborador nunca fala diretamente com esses sistemas externos, apenas com o backend do ELOS, que orquestra as integrações.

> **Nota registrada em 2026-08-21 (ver `pendencias-tecnicas.md`): esta seção parte de uma premissa incorreta sobre o stack atual do ELOS — o projeto nunca rodou em Supabase. Ver a nota de correção no arquivo de pendências técnicas antes de usar esta seção para qualquer decisão.**

## Roadmap sugerido

Uma sequência possível, pensada para entregar valor cedo sem violar nenhuma exigência legal no caminho: primeiro o núcleo de cadastro e visualização (perfil, documentos, contracheque) porque não depende de nenhuma integração externa e já reduz volume de solicitação manual ao RH; em seguida ponto e banco de horas juntos, porque são a mesma informação e dependem da decisão sobre REP-P; depois assinatura eletrônica de documentos, que desbloqueia o fluxo de banco de horas formalizado e reduz a dependência de papel; depois solicitações, conectadas ao motor de pendências do Compliance; e só então a camada de bem-estar, começando por saúde (maior sinergia com módulos já existentes) e educação, deixando hobbies/comunidade e planner pessoal como a última camada, porque dependem menos de integração jurídica e mais de maturidade de produto e adoção real pelos clientes já usando o núcleo.

## Pontos em aberto para você decidir

Antes de transformar isso em instruções funcionais para o Codex, três decisões ficam com você: qual caminho seguir entre Supabase e Neon (a recomendação acima é manter Supabase, mas a decisão final depende de custo projetado por tenant, que só você tem visibilidade); se o ponto eletrônico nasce como REP-P próprio do ELOS (mais controle, mais responsabilidade regulatória) ou integrado a um provedor já homologado como Sólides ou Secullum (mais rápido, consistente com o que você já decidiu para assinatura e eSocial); e qual das cinco frentes de bem-estar entra primeiro no roadmap além de saúde — a sugestão acima prioriza sinergia com módulos existentes, mas você conhece melhor o apetite dos primeiros clientes.

## Fontes

- Gallup — State of the Global Workplace
- Mercer — Global Talent Trends 2026
- WEX — 2026's Top 10 Employee Benefits Trends
- Wellhub — Employee Benefits Trends 2026
- Gupy — Portal do colaborador: benefícios e como escolher
- Governo Federal — Perguntas e Respostas sobre a Portaria 671/2021 (REP)
- Ponto Tecnologia — Banco de Horas Individual e Coletivo na CLT (2026)
- Contábeis — Assinatura Eletrônica: Validade em Documentos do DP e RH
- Sólides — LGPD na Folha de Pagamento
- Biz — Segunda fase do Novo PAT em 2026
- KMEE — Evento S-2200 no eSocial
- DesignRevision — Neon vs Supabase 2026
