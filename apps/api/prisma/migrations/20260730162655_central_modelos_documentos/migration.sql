-- CreateEnum
CREATE TYPE "document_template_tipo" AS ENUM ('AVISO_PREVIO', 'TERMO_RESCISAO', 'CARTA_REFERENCIA', 'CONTRATO_ADMISSAO');

-- AlterTable
ALTER TABLE "terminations" ADD COLUMN     "avisoPrevioGerado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_templates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "tipo" "document_template_tipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "aplicaTipos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_tenantId_tipo_idx" ON "document_templates"("tenantId", "tipo");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for the document_templates table — same pattern as prior *_enable_rls migrations.
ALTER TABLE "document_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "document_templates"
  USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Backfill: semeia os modelos padrão de documentos (aviso prévio, termo de rescisão e carta de
-- referência por tipo de desligamento, e contrato de admissão) para tenants que já existiam antes
-- desta feature — tenants novos passam a ser semeados via provisionNewTenant no cadastro.
INSERT INTO "document_templates" (id, "tenantId", tipo, nome, corpo, "aplicaTipos", ativo, sistema, "updatedAt")
SELECT gen_random_uuid(), t.id, item.tipo::"document_template_tipo", item.nome, item.corpo, item."aplicaTipos", true, true, CURRENT_TIMESTAMP
FROM "tenants" t
CROSS JOIN (VALUES
  ('AVISO_PREVIO', 'Aviso prévio — Sem justa causa', ARRAY['SEM_JUSTA_CAUSA']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Pedido de demissão', ARRAY['PEDIDO_DEMISSAO']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Acordo (art. 484-A)', ARRAY['ACORDO']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Justa causa', ARRAY['JUSTA_CAUSA']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Acordo mútuo (art. 484-A)', ARRAY['ACORDO_MUTUO']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Fim de contrato de experiência', ARRAY['FIM_CONTRATO_EXPERIENCIA']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Aposentadoria', ARRAY['APOSENTADORIA']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Rescisão indireta', ARRAY['RESCISAO_INDIRETA']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('AVISO_PREVIO', 'Aviso prévio — Óbito', ARRAY['OBITO']::TEXT[], $aviso${{empresa.cidade}}, {{data.hoje}}.

Prezado(a) colaborador(a) {{colaborador.nome}},
Matrícula: {{colaborador.matricula}}
Cargo: {{colaborador.cargo}} — Setor: {{colaborador.setor}}

Pelo presente, notificamos que a partir da data de entrega deste não mais serão utilizados os seus serviços por nossa empresa, nos termos e para os efeitos do disposto no art. 487 da Consolidação das Leis do Trabalho.

Início do aviso prévio: {{desligamento.avisoPrevioInicio}}
Fim do aviso prévio: {{desligamento.avisoPrevioFim}}
Duração: {{desligamento.diasAviso}} dias

Agradecemos a contribuição prestada durante o período em que fez parte do nosso quadro de colaboradores.

Atenciosamente,


___________________________________________________
{{empresa.nomeFantasia}}

Ciente em ______/______/______


___________________________________________________
{{colaborador.nome}}$aviso$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Sem justa causa', ARRAY['SEM_JUSTA_CAUSA']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Pedido de demissão', ARRAY['PEDIDO_DEMISSAO']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Acordo (art. 484-A)', ARRAY['ACORDO']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Justa causa', ARRAY['JUSTA_CAUSA']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Acordo mútuo (art. 484-A)', ARRAY['ACORDO_MUTUO']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Fim de contrato de experiência', ARRAY['FIM_CONTRATO_EXPERIENCIA']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Aposentadoria', ARRAY['APOSENTADORIA']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Rescisão indireta', ARRAY['RESCISAO_INDIRETA']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('TERMO_RESCISAO', 'Termo de rescisão — Óbito', ARRAY['OBITO']::TEXT[], $termo$TERMO DE RESCISÃO DE CONTRATO DE TRABALHO

Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de {{colaborador.nome}}, matrícula {{colaborador.matricula}}, ocupante do cargo de {{colaborador.cargo}}, no setor {{colaborador.setor}}, com data de desligamento em {{desligamento.data}}, na modalidade "{{desligamento.tipoLabel}}".

Total estimado de verbas rescisórias: {{desligamento.totalRescisao}} (sujeito à conferência da contabilidade).

Pagamento das verbas rescisórias até {{desligamento.dataPagamento}}, conforme art. 477, §6º da CLT.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{colaborador.nome}}$termo$),
  ('CARTA_REFERENCIA', 'Carta de referência — Sem justa causa', ARRAY['SEM_JUSTA_CAUSA']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Pedido de demissão', ARRAY['PEDIDO_DEMISSAO']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Acordo (art. 484-A)', ARRAY['ACORDO']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Justa causa', ARRAY['JUSTA_CAUSA']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Acordo mútuo (art. 484-A)', ARRAY['ACORDO_MUTUO']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Fim de contrato de experiência', ARRAY['FIM_CONTRATO_EXPERIENCIA']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Aposentadoria', ARRAY['APOSENTADORIA']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Rescisão indireta', ARRAY['RESCISAO_INDIRETA']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CARTA_REFERENCIA', 'Carta de referência — Óbito', ARRAY['OBITO']::TEXT[], $carta$CARTA DE REFERÊNCIA

A {{empresa.nomeFantasia}} atesta que {{colaborador.nome}}, matrícula {{colaborador.matricula}}, exerceu a função de {{colaborador.cargo}} em nossa empresa até {{desligamento.data}}.

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}$carta$),
  ('CONTRATO_ADMISSAO', 'Contrato de admissão', ARRAY[]::TEXT[], $contrato$CONTRATO INDIVIDUAL DE TRABALHO

De um lado {{empresa.razaoSocial}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, com sede em {{empresa.cidade}}/{{empresa.uf}}, doravante denominada Empregadora, e de outro {{admissao.nome}}, doravante denominado(a) Empregado(a), têm entre si justo o presente contrato de trabalho, mediante as seguintes condições:

Cargo: {{admissao.cargo}}
Data de início: {{admissao.dataInicio}}
Remuneração: {{admissao.salario}}

{{empresa.cidade}}, {{data.hoje}}.


___________________________________________________
{{empresa.nomeFantasia}}


___________________________________________________
{{admissao.nome}}$contrato$)
) AS item(tipo, nome, "aplicaTipos", corpo)
WHERE NOT EXISTS (SELECT 1 FROM "document_templates" WHERE "tenantId" = t.id);
