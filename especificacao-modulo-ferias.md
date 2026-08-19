# Especificação — Módulo de Férias (Elos)
### Comparativo Elos x Sólides x padrão global e proposta de redesenho

---

## 1. Objetivo

O módulo atual de "Férias e Afastamentos" do Elos trata férias como um saldo único e corrente por colaborador (Direito / Gozados / A vencer). Isso funciona para uma leitura rápida do mês, mas perde informação crítica: um colaborador com muito tempo de casa pode ter **dois ou três períodos aquisitivos em aberto ao mesmo tempo** (um vencido, um corrente, um futuro), e o Elos hoje não tem onde guardar isso.

A Sólides, que a Tectronix usa hoje, resolve isso tratando cada **período aquisitivo de 12 meses** como um registro independente, com seu próprio vencimento, saldo e status. É esse o comportamento que a Gabi pediu para reproduzir — "todo o histórico de férias desde o primeiro período aquisitivo, bem completo."

Este documento: (1) compara os dois sistemas campo a campo, (2) traz o que plataformas globais de referência (BambooHR, Workday, Deel, Rippling) consideram padrão de mercado, e (3) propõe o modelo de dados e as telas para o novo módulo de férias do Elos. Afastamentos fica de fora deste escopo por decisão da Gabi — deve virar uma aba irmã, com seu próprio modelo, tratado à parte.

---

## 2. Comparativo campo a campo

### 2.1 O que existe hoje

| Aspecto | Elos (atual) | Sólides |
|---|---|---|
| Unidade de controle | 1 linha por colaborador, saldo agregado | 1 registro por **período aquisitivo** (colaborador pode ter vários) |
| Campos do saldo | Direito, Gozados, A vencer | Vencimento, "vencido/vence em X dias", Período Trabalhado (de/até), Saldo disponível, Dias adquiridos |
| Status | Nenhum status explícito — só a cor do "A vencer" | Vencida, A vencer, Pendente, Aprovada, Em férias (abas dedicadas + contadores) |
| Histórico | Não existe — não dá para ver períodos anteriores | Aba "Histórico" dedicada, + dropdown com todos os períodos aquisitivos do colaborador ao programar férias |
| Visão executiva | 4 KPIs simples (em férias, pendentes, saldo baixo, saldo médio) | KPIs + gráfico de rosca (vencidas x a vencer) + "próxima data limite" em destaque |
| Solicitação | Formulário simples (colaborador, início, fim) | Modal completo: período aquisitivo, fracionamento, venda de dias, antecipação de 13º, justificativa, anexo, recomendações |
| Filtros | Mês do calendário | Colaborador, filial, local de trabalho, intervalo de datas |
| Férias coletivas | Não previsto | Toggle dedicado no fluxo de programação |
| Abono pecuniário (venda de dias) | Não previsto | Campo dedicado ("Vender alguns dias?") |
| Antecipação de 13º | Não previsto | Checkbox dedicado |
| Exposição de risco | Não calculada | Contagem de vencidas, mas sem valor financeiro estimado |

### 2.2 Leitura do gap

O Elos não está "errado" — ele responde bem a "quantos dias esse colaborador tem hoje". O que falta é a dimensão **tempo**: cada período aquisitivo é um contrato de 24 meses (12 para adquirir + 12 para conceder) com prazo próprio, e tratar tudo como um saldo único esconde justamente o dado mais caro de errar, que é férias vencidas gerando pagamento em dobro (Súmula 81 do TST).

---

## 3. O que o mercado global considera padrão

Pesquisa em BambooHR, Rippling, Deel e comparativos de mercado (peoplemanagingpeople.com, vacationtracker.io) aponta um conjunto de práticas consistente, além do que a Sólides já cobre:

- **Saldo em tempo real self-service**: colaborador consulta o próprio saldo sem abrir chamado com o RH — reduz carga operacional do RH.
- **Calendário "quem está fora"**: visão de equipe/filial mostrando ausências simultâneas, para o gestor identificar conflito de cobertura antes de aprovar.
- **Políticas parametrizáveis por filial/tipo de contrato**: regras de fracionamento, antecedência mínima e aprovadores não são fixas no código — são configuração.
- **Relatórios de saldo com abertura**: saldo inicial, adquirido no período, usado, saldo final — não só o número final.
- **Detecção de conflito e burnout**: alertas quando um colaborador acumula período vencido ou, no outro extremo, nunca tira férias.
- **Auditoria completa**: quem solicitou, quem aprovou, quando, com qual documento anexado — necessário para fiscalização trabalhista.
- **Integração com folha**: o valor de férias (salário + 1/3, abono, 13º antecipado) é calculado automaticamente a partir do apontamento, sem redigitação.
- **Notificações proativas**: alertas antes do vencimento, não descoberta reativa.

A Sólides já cobre boa parte disso (histórico por período, modal rico, filtros). Os pontos em que ela ainda fica atrás do padrão global são: não mostra valor financeiro de exposição (quanto custaria pagar em dobro as férias vencidas hoje) e não tem um calendário de equipe do tipo "quem está fora" — só o calendário individual de cada solicitação.

---

## 4. Regras de negócio (CLT) que o modelo precisa respeitar

Estas regras existem hoje na cabeça de quem opera o Departamento Pessoal, mas não estão representadas em nenhum dos dois sistemas de forma explícita. O novo módulo deve codificá-las:

- **Período aquisitivo**: 12 meses corridos a partir da admissão (ou do fim do aquisitivo anterior). Ao final, o colaborador adquire o direito às férias daquele ciclo.
- **Dias adquiridos variam com faltas injustificadas** no período aquisitivo: até 5 faltas → 30 dias; 6 a 14 → 24 dias; 15 a 23 → 18 dias; 24 a 32 → 12 dias (art. 130 CLT). Isso precisa ser calculado, não digitado à mão.
- **Período concessivo**: os 12 meses seguintes ao aquisitivo, prazo em que a empresa é obrigada a conceder o descanso.
- **Férias vencidas**: se o concessivo expira sem a concessão integral, o saldo remanescente vira "vencido" e deve ser pago em dobro (Súmula 81 TST) — é o dado com maior exposição financeira do módulo.
- **Fracionamento**: até 3 períodos por ciclo, mediante concordância do colaborador — um deles não pode ser inferior a 14 dias corridos, e os demais não podem ser inferiores a 5 dias corridos cada (art. 134 §1º CLT). *Observação: há divergência entre fontes recentes sobre se o mínimo dos períodos adicionais seria 5 ou 10 dias — o valor de 5 dias é o consolidado desde a Reforma Trabalhista de 2017 e o que este documento assume, mas o campo deve ser configurável para acompanhar mudança normativa sem depender de deploy.*
- **Abono pecuniário (venda de dias)**: até 1/3 do período (10 dias, num período cheio de 30), solicitado pelo colaborador com no mínimo 15 dias de antecedência do fim do período aquisitivo.
- **Comunicação formal**: início das férias deve ser avisado por escrito com no mínimo 30 dias de antecedência; não pode começar nos 2 dias que antecedem feriado ou repouso semanal remunerado.
- **Suspensão do período aquisitivo**: afastamentos como auxílio-doença/acidente acima de 6 meses no período aquisitivo interrompem a contagem e reiniciam um novo período (art. 133 CLT) — é o ponto de contato direto com o futuro módulo de Afastamentos.
- **Pagamento**: salário do período + 1/3 constitucional, pago até 2 dias antes do início do afastamento.

---

## 5. Modelo de dados proposto

A mudança estrutural central: sair de "1 linha de saldo por colaborador" para "N períodos aquisitivos por colaborador, cada um com suas frações de gozo".

### 5.1 `PeriodoAquisitivo` (1 por ciclo de 12 meses, por colaborador)

| Campo | Descrição |
|---|---|
| `colaborador_id` | Vínculo com o cadastro do colaborador |
| `data_inicio` / `data_fim` | Início e fim dos 12 meses de aquisição |
| `dias_adquiridos` | 30 / 24 / 18 / 12, calculado a partir das faltas injustificadas no período |
| `data_limite_concessao` | `data_fim` + 12 meses — fim do período concessivo |
| `dias_gozados` | Soma das frações já realizadas |
| `dias_vendidos` | Dias de abono pecuniário |
| `saldo_disponivel` | `dias_adquiridos − dias_gozados − dias_vendidos` |
| `status` | calculado (ver 5.3) |
| `origem_da_suspensao` | referência a um afastamento, se o período foi interrompido/reiniciado |

### 5.2 `FracaoDeFerias` (0 a 3 por período aquisitivo)

| Campo | Descrição |
|---|---|
| `periodo_aquisitivo_id` | Vínculo com o ciclo de 12 meses de origem |
| `tipo` | normal · férias coletivas · abono pecuniário · antecipação de 13º |
| `data_inicio` / `data_fim` / `dias` | |
| `status` | pendente de aprovação · aprovada · reprovada · em andamento · concluída · cancelada |
| `solicitado_por` / `aprovado_por` / `data_aprovacao` | trilha de auditoria |
| `aviso_formalizado_em` | data do comunicado ao colaborador (valida os 30 dias) |
| `documento_anexo` | aviso de férias assinado / recibo |
| `justificativa` | texto livre, obrigatório se a solicitação for fora da janela recomendada |

### 5.3 Status do período aquisitivo (substitui o "A vencer" único do Elos)

| Status | Regra |
|---|---|
| Em aquisição | Ainda dentro dos 12 meses de aquisição — ainda não é direito exigível |
| Disponível | Aquisitivo fechado, dentro do concessivo, fora da janela de alerta |
| A vencer | Dentro da janela de alerta configurável (padrão: 60 e 30 dias antes do fim do concessivo) |
| Vencida | Concessivo expirado com saldo residual — gera obrigação de pagamento em dobro |
| Parcialmente gozada | Uma fração já realizada, saldo residual ainda em aberto |
| Quitada | `saldo_disponivel = 0` |

Esse desenho é o que permite, na ficha do colaborador, listar **a linha do tempo completa desde a admissão** — exatamente o "bem completo" que a Gabi pediu — em vez de um número único que esconde os ciclos anteriores.

---

## 6. Telas propostas

1. **Visão Geral** — KPIs (em férias hoje, pendentes de aprovação, vencidas com exposição financeira estimada, a vencer em 30/60/90 dias, saldo médio), gráfico de rosca vencidas x a vencer x dentro do prazo, e um calendário "quem está de férias" por filial (mescla o melhor do Elos — visual, mês a mês — com o dado que falta hoje, que é a comparação entre filiais/equipes).
2. **Abas por status** — Vencidas, A vencer, Pendentes, Aprovadas, Em Férias, Todas — cada uma com filtro por colaborador, filial, local de trabalho e intervalo de datas, no padrão que a Sólides já usa e que funciona bem.
3. **Ficha do colaborador (histórico)** — linha do tempo vertical com **todos** os períodos aquisitivos desde a admissão, cada um expansível mostrando suas frações, datas, aprovador e documento anexado. É a tela que resolve diretamente o pedido da Gabi.
4. **Programar Férias (modal)** — seleção do período aquisitivo específico (dropdown, como na Sólides), fracionamento com validação automática dos mínimos legais, venda de dias, antecipação de 13º, upload de comprovante, geração automática do aviso de férias de 30 dias, e um bloco de alertas quando a solicitação viola alguma regra (ex.: início a 2 dias de um feriado, saldo insuficiente, período já vencido).
5. **Relatórios** — exportação para contabilidade/folha, relatório de provisão (quanto a empresa deve em férias vencidas, pela dobra), relatório de tendência de uso (identifica quem nunca tira férias).
6. **Configurações** — janelas de alerta, regras de fracionamento (parametrizável para acompanhar mudança de legislação), aprovadores por filial.

Um mockup navegável dessas telas foi entregue junto com este documento para visualização.

---

## 7. Fases sugeridas

**Fase 1 (MVP)** — modelo de dados por período aquisitivo + migração dos dados atuais do Elos (que hoje só têm o saldo agregado, então o primeiro período aquisitivo de cada colaborador provavelmente precisa ser reconstruído a partir da data de admissão) + telas de Visão Geral, abas por status e ficha do colaborador com histórico.

**Fase 2** — modal de programação completo (fracionamento, abono, antecipação de 13º, geração do aviso de férias) + fluxo de aprovação com notificação.

**Fase 3** — relatórios de provisão/exposição financeira, calendário "quem está fora" por filial, configurações parametrizáveis.

---

## 8. Critérios de aceite (Fase 1)

- Um colaborador com mais de 1 ano de casa mostra **mais de um** período aquisitivo na ficha, cada um com vencimento e saldo próprios.
- O status "Vencida" aparece automaticamente quando a data atual passa do `data_limite_concessao` sem o saldo zerado — sem digitação manual.
- Os dias adquiridos refletem o desconto por faltas injustificadas (art. 130 CLT) quando aplicável.
- A ficha do colaborador mostra a linha do tempo completa desde o primeiro período aquisitivo (data de admissão), não só o ciclo corrente.
- Os KPIs da Visão Geral batem com a soma dos registros nas abas de status (sem divergência entre o resumo e o detalhe).

---

## Fontes consultadas

- [BambooHR — Time Off](https://www.bamboohr.com/platform/time-and-attendance/time-off)
- [Vacation Tracker — 10 Best Practices for Managing Employee PTO Requests](https://vacationtracker.io/blog/managing-employee-paid-time-off-requests/)
- [People Managing People — 10 Best Leave Management Software of 2026](https://peoplemanagingpeople.com/tools/best-leave-management-software/)
- [Quark RH — Férias: tudo sobre regras, cálculo e pagamento pela CLT (2026)](https://quarkrh.com.br/blog/ferias-tudo-sobre-regras-calculo-pagamento/)
- [Senior — Períodos aquisitivo e concessivo: o que significa e cuidados](https://www.senior.com.br/blog/periodos-aquisitivo-e-concessivo)
