import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { matches } from '../documents/documents.service';
import {
  calcularAvisoPrevio,
  calcularDataPagamento,
} from '../terminations/aviso-previo.util';
import { formatBr, formatBRL, renderTemplate } from './template-engine';
import { DEFAULT_DOCUMENT_TEMPLATES } from './default-templates';
import { UpdateDocumentTemplateDto } from './dto/document-templates.dto';

const TIPO_LABEL: Record<string, string> = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
  JUSTA_CAUSA: 'Justa causa',
  ACORDO_MUTUO: 'Acordo mútuo (art. 484-A)',
  FIM_CONTRATO_EXPERIENCIA: 'Fim de contrato de experiência',
  APOSENTADORIA: 'Aposentadoria',
  RESCISAO_INDIRETA: 'Rescisão indireta',
  OBITO: 'Óbito',
};

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  /** Semeia os modelos padrão na primeira vez que o tenant acessa a central (tenants criados antes desta feature não passam pelo provisionamento de cadastro). */
  private async ensureSeeded() {
    const { tenantId } = getRequestContext();
    const total = await this.db().documentTemplate.count();
    if (total > 0) return;
    await this.db().documentTemplate.createMany({
      data: DEFAULT_DOCUMENT_TEMPLATES.map((d) => ({
        tenantId,
        tipo: d.tipo,
        nome: d.nome,
        corpo: d.corpo,
        aplicaTipos: d.aplicaTipos,
        sistema: true,
      })),
    });
  }

  async list(tipo?: string) {
    await this.ensureSeeded();
    return this.db().documentTemplate.findMany({
      where: tipo ? { tipo: tipo as never } : undefined,
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  private async mustFind(id: string) {
    const template = await this.db().documentTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Modelo não encontrado.');
    return template;
  }

  async update(id: string, dto: UpdateDocumentTemplateDto) {
    await this.mustFind(id);
    return this.db().documentTemplate.update({ where: { id }, data: dto });
  }

  async restaurarPadrao(id: string) {
    const template = await this.mustFind(id);
    const original = DEFAULT_DOCUMENT_TEMPLATES.find(
      (d) =>
        d.tipo === template.tipo &&
        JSON.stringify(d.aplicaTipos) === JSON.stringify(template.aplicaTipos),
    );
    if (!original) {
      throw new NotFoundException(
        'Não há um padrão do sistema para restaurar neste modelo.',
      );
    }
    return this.db().documentTemplate.update({
      where: { id },
      data: { corpo: original.corpo },
    });
  }

  private async pickTemplate(tipo: string, aplicaValor: string | null) {
    await this.ensureSeeded();
    const candidatos = await this.db().documentTemplate.findMany({
      where: { tipo: tipo as never, ativo: true },
    });
    const compatíveis = aplicaValor
      ? candidatos.filter((c) => matches(c.aplicaTipos, aplicaValor))
      : candidatos;
    // Prioriza o modelo mais específico (com escopo definido) sobre um genérico (aplicaTipos vazio).
    compatíveis.sort((a, b) => b.aplicaTipos.length - a.aplicaTipos.length);
    return compatíveis[0] ?? null;
  }

  /** Contexto de variáveis comum a aviso prévio, termo de rescisão e carta de referência. */
  private async buildTerminationVars(terminationId: string) {
    const termination = await this.db().termination.findUnique({
      where: { id: terminationId },
      include: { employee: true },
    });
    if (!termination) throw new NotFoundException('Desligamento não encontrado.');
    const { tenantId } = getRequestContext();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const { diasAviso, inicio, fim } = calcularAvisoPrevio(
      termination.employee.dataAdmissao,
      termination.data,
      termination.avisoPrevioInicio,
    );
    const dataPagamento = calcularDataPagamento(termination.data);
    const calculo = termination.calculoRescisao as { totalBruto: number } | null;

    const vars: Record<string, string> = {
      'empresa.razaoSocial': tenant?.razaoSocial ?? tenant?.name ?? '',
      'empresa.nomeFantasia': tenant?.nomeFantasia ?? tenant?.name ?? '',
      'empresa.cnpj': tenant?.cnpj ?? '',
      'empresa.cidade': tenant?.cidade ?? '',
      'empresa.uf': tenant?.uf ?? '',
      'data.hoje': formatBr(new Date()),
      'colaborador.nome': termination.nome,
      'colaborador.matricula': termination.employee.matricula,
      'colaborador.cargo': termination.cargo,
      'colaborador.setor': termination.employee.departamento,
      'desligamento.data': formatBr(termination.data),
      'desligamento.tipoLabel': TIPO_LABEL[termination.tipo] ?? termination.tipo,
      'desligamento.diasAviso': String(diasAviso),
      'desligamento.avisoPrevioInicio': formatBr(inicio),
      'desligamento.avisoPrevioFim': formatBr(fim),
      'desligamento.dataPagamento': formatBr(dataPagamento),
      'desligamento.totalRescisao': calculo
        ? formatBRL(calculo.totalBruto)
        : 'a calcular',
    };
    return { termination, vars };
  }

  async renderTerminationDoc(
    terminationId: string,
    tipo: 'AVISO_PREVIO' | 'TERMO_RESCISAO' | 'CARTA_REFERENCIA',
  ) {
    const { termination, vars } = await this.buildTerminationVars(terminationId);
    const template = await this.pickTemplate(tipo, termination.tipo);
    if (!template) {
      throw new NotFoundException(
        'Nenhum modelo ativo configurado para este documento — configure em Cadastros > Modelos de documentos.',
      );
    }
    return { texto: renderTemplate(template.corpo, vars) };
  }

  async renderAdmissionContract(admissionId: string) {
    const admission = await this.db().admission.findUnique({
      where: { id: admissionId },
    });
    if (!admission) throw new NotFoundException('Admissão não encontrada.');
    const { tenantId } = getRequestContext();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const template = await this.pickTemplate('CONTRATO_ADMISSAO', null);
    if (!template) {
      throw new NotFoundException(
        'Nenhum modelo ativo configurado para o contrato de admissão — configure em Cadastros > Modelos de documentos.',
      );
    }

    const vars: Record<string, string> = {
      'empresa.razaoSocial': tenant?.razaoSocial ?? tenant?.name ?? '',
      'empresa.nomeFantasia': tenant?.nomeFantasia ?? tenant?.name ?? '',
      'empresa.cnpj': tenant?.cnpj ?? '',
      'empresa.cidade': tenant?.cidade ?? '',
      'empresa.uf': tenant?.uf ?? '',
      'data.hoje': formatBr(new Date()),
      'admissao.nome': admission.nome,
      'admissao.cargo': admission.cargo,
      'admissao.dataInicio': formatBr(admission.dataInicio),
      'admissao.salario': formatBRL(Number(admission.salario)),
    };
    return { texto: renderTemplate(template.corpo, vars) };
  }
}
