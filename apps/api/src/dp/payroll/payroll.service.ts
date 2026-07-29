import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CreateRunDto, SaveImportTemplateDto } from './dto/payroll.dto';
import {
  ColumnMapping,
  RubricaTipo,
  assinaturaColunas,
  cellToNumber,
  cellToString,
  parseSpreadsheet,
  sugerirMapeamento,
} from './import/spreadsheet.util';

const GUIDE_NAMES = ['FGTS Digital', 'DARF INSS', 'DCTFWeb', 'IRRF'];

/**
 * Simplified placeholder deduction — NOT a real INSS/IRRF tax-table
 * calculation. Real Brazilian payroll needs progressive INSS brackets, IRRF
 * brackets with dependents, FGTS 8% (employer-side, not a discount), etc.
 * This exists so proventos/descontos/líquido are at least derived from the
 * employee's actual salário instead of hardcoded, per the README's note
 * that folha must be idempotent/auditable rather than a UI toggle.
 */
function computeDescontos(proventos: number): number {
  return Math.round(proventos * 0.2 * 100) / 100;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listRuns() {
    return this.db().payrollRun.findMany({
      orderBy: { competencia: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  createRun(dto: CreateRunDto) {
    return this.db().payrollRun.create({
      data: {
        competencia: dto.competencia,
        tenantId: getRequestContext().tenantId,
      },
    });
  }

  async getRun(id: string) {
    const run = await this.db().payrollRun.findUnique({
      where: { id },
      include: {
        items: { include: { employee: { select: { nome: true } } } },
        guides: true,
      },
    });
    if (!run) throw new NotFoundException('Folha não encontrada.');

    const totals = run.items.reduce(
      (acc, i) => ({
        proventos: acc.proventos + Number(i.proventos),
        descontos: acc.descontos + Number(i.descontos),
        liquido: acc.liquido + Number(i.liquido),
      }),
      { proventos: 0, descontos: 0, liquido: 0 },
    );

    return { ...run, totals };
  }

  /** Idempotent: safe to call again after reopening — upserts one item per active employee. */
  async process(id: string) {
    const db = this.db();
    const run = await db.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Folha não encontrada.');

    const employees = await db.employee.findMany({
      where: { status: 'ATIVO' },
    });
    for (const e of employees) {
      const proventos = Number(e.salario);
      const descontos = computeDescontos(proventos);
      const liquido = proventos - descontos;
      await db.payslipItem.upsert({
        where: {
          payrollRunId_employeeId: { payrollRunId: id, employeeId: e.id },
        },
        create: {
          payrollRunId: id,
          employeeId: e.id,
          proventos,
          descontos,
          liquido,
          tenantId: getRequestContext().tenantId,
        },
        update: { proventos, descontos, liquido },
      });
    }

    const existingGuides = await db.payrollGuide.count({
      where: { payrollRunId: id },
    });
    if (existingGuides === 0) {
      for (const guia of GUIDE_NAMES) {
        await db.payrollGuide.create({
          data: {
            payrollRunId: id,
            guia,
            tenantId: getRequestContext().tenantId,
          },
        });
      }
    }

    const updated = await db.payrollRun.update({
      where: { id },
      data: { status: 'PROCESSADA', processedAt: new Date() },
    });
    await this.audit.log('payroll_run', id, 'processada', {
      colaboradores: employees.length,
    });
    return updated;
  }

  async reopen(id: string) {
    const run = await this.db().payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Folha não encontrada.');
    const updated = await this.db().payrollRun.update({
      where: { id },
      data: { status: 'ABERTO' },
    });
    await this.audit.log('payroll_run', id, 'reaberta');
    return updated;
  }

  async sendEsocial(id: string) {
    const run = await this.db().payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Folha não encontrada.');
    if (run.status !== 'PROCESSADA')
      throw new BadRequestException(
        'Processe a folha antes de enviar o eSocial.',
      );
    const updated = await this.db().payrollRun.update({
      where: { id },
      data: { esocialSent: true },
    });
    await this.audit.log('payroll_run', id, 'esocial_s1200_enviado');
    return updated;
  }

  async generateGuide(guideId: string) {
    const db = this.db();
    const guide = await db.payrollGuide.findUnique({
      where: { id: guideId },
      include: { payrollRun: true },
    });
    if (!guide) throw new NotFoundException('Guia não encontrada.');
    if (guide.payrollRun.status !== 'PROCESSADA')
      throw new BadRequestException('Processe a folha antes de gerar guias.');
    const updated = await db.payrollGuide.update({
      where: { id: guideId },
      data: { status: 'GERADA' },
    });
    await this.audit.log('payroll_guide', guideId, 'gerada', {
      guia: guide.guia,
    });
    return updated;
  }

  /** Lê o cabeçalho + amostra do arquivo e sugere um mapeamento de colunas (ou reaproveita um template salvo). */
  async previewImport(runId: string, file: Express.Multer.File) {
    const run = await this.db().payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Folha não encontrada.');

    const rows = await parseSpreadsheet(file.buffer, file.originalname);
    if (rows.length === 0) throw new BadRequestException('Planilha vazia.');
    const headers = rows[0];
    const amostra = rows.slice(1, 6);

    const assinatura = assinaturaColunas(headers);
    const templates = await this.db().payrollImportTemplate.findMany({
      where: { tenantId: getRequestContext().tenantId },
      orderBy: { nome: 'asc' },
    });
    const templateCompativel = templates.find((t) => {
      const stored = t.mapeamento as unknown as { headers?: string[] };
      return (
        Array.isArray(stored?.headers) &&
        assinaturaColunas(stored.headers) === assinatura
      );
    });

    const mapeamentoSugerido = templateCompativel
      ? (
          templateCompativel.mapeamento as unknown as {
            mapeamento: ColumnMapping[];
          }
        ).mapeamento
      : sugerirMapeamento(headers);

    return {
      headers: headers.map(cellToString),
      amostra: amostra.map((row) => row.map(cellToString)),
      mapeamentoSugerido,
      templateAplicado: templateCompativel?.nome ?? null,
      templatesDisponiveis: templates.map((t) => ({ id: t.id, nome: t.nome })),
    };
  }

  /** Reparseia o arquivo com o mapeamento confirmado, casa por matrícula/CPF e substitui os valores do PayslipItem por dados reais. */
  async commitImport(
    runId: string,
    file: Express.Multer.File,
    mapeamentoRaw: string,
  ) {
    const run = await this.db().payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Folha não encontrada.');

    let mapping: ColumnMapping[];
    try {
      mapping = JSON.parse(mapeamentoRaw) as ColumnMapping[];
    } catch {
      throw new BadRequestException('Mapeamento inválido.');
    }
    if (!Array.isArray(mapping) || mapping.length === 0) {
      throw new BadRequestException('Mapeamento inválido.');
    }

    const idCol =
      mapping.find((m) => m.alvo === 'MATRICULA') ??
      mapping.find((m) => m.alvo === 'CPF');
    if (!idCol)
      throw new BadRequestException(
        'Mapeie uma coluna de matrícula ou CPF para identificar o colaborador.',
      );
    const usaCpf = idCol.alvo === 'CPF';
    const rubricaCols = mapping.filter(
      (m) => m.alvo === 'RUBRICA' && m.rubricaTipo,
    );

    const rows = await parseSpreadsheet(file.buffer, file.originalname);
    const linhas = rows
      .slice(1)
      .filter((row) => row.some((c) => cellToString(c) !== ''))
      .map((row) => ({
        identificador: cellToString(row[idCol.indice]),
        rubricas: rubricaCols
          .map((c) => ({
            descricao: c.descricao || `Coluna ${c.indice + 1}`,
            codigo: c.codigo,
            tipo: c.rubricaTipo as RubricaTipo,
            valor: cellToNumber(row[c.indice]),
          }))
          .filter((r) => r.valor !== 0),
      }));

    const db = this.db();
    const tenantId = getRequestContext().tenantId;
    const employees = await db.employee.findMany({ where: { tenantId } });
    const byMatricula = new Map(employees.map((e) => [e.matricula, e]));
    const byCpf = new Map(
      employees
        .filter((e) => e.cpf)
        .map((e) => [(e.cpf as string).replace(/\D/g, ''), e]),
    );

    const erros: { linha: number; identificador: string; motivo: string }[] =
      [];
    let importadas = 0;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      if (!linha.identificador) {
        erros.push({
          linha: i + 2,
          identificador: '',
          motivo: 'Sem matrícula/CPF',
        });
        continue;
      }
      const employee = usaCpf
        ? byCpf.get(linha.identificador.replace(/\D/g, ''))
        : byMatricula.get(linha.identificador);
      if (!employee) {
        erros.push({
          linha: i + 2,
          identificador: linha.identificador,
          motivo: 'Colaborador não encontrado',
        });
        continue;
      }

      const proventos = linha.rubricas
        .filter((r) => r.tipo === 'PROVENTO')
        .reduce((acc, r) => acc + r.valor, 0);
      const descontos = linha.rubricas
        .filter((r) => r.tipo === 'DESCONTO')
        .reduce((acc, r) => acc + r.valor, 0);
      const liquido = proventos - descontos;

      const payslip = await db.payslipItem.upsert({
        where: {
          payrollRunId_employeeId: {
            payrollRunId: runId,
            employeeId: employee.id,
          },
        },
        create: {
          payrollRunId: runId,
          employeeId: employee.id,
          tenantId,
          proventos,
          descontos,
          liquido,
          origem: 'IMPORTADO',
        },
        update: { proventos, descontos, liquido, origem: 'IMPORTADO' },
      });

      await db.payrollLineItem.deleteMany({
        where: { payslipItemId: payslip.id },
      });
      if (linha.rubricas.length > 0) {
        await db.payrollLineItem.createMany({
          data: linha.rubricas.map((r) => ({
            tenantId,
            payslipItemId: payslip.id,
            codigo: r.codigo,
            descricao: r.descricao,
            tipo: r.tipo,
            valor: r.valor,
          })),
        });
      }
      importadas++;
    }

    const batch = await db.payrollImportBatch.create({
      data: {
        tenantId,
        payrollRunId: runId,
        arquivoNome: file.originalname,
        linhasTotal: linhas.length,
        linhasImportadas: importadas,
        linhasComErro: erros.length,
        erros: erros.length > 0 ? erros : undefined,
        importadoPor: getRequestContext().userName,
      },
    });

    await this.audit.log('payroll_run', runId, 'importacao_planilha', {
      arquivo: file.originalname,
      importadas,
      erros: erros.length,
    });

    return batch;
  }

  listImportTemplates() {
    return this.db().payrollImportTemplate.findMany({
      where: { tenantId: getRequestContext().tenantId },
      orderBy: { nome: 'asc' },
    });
  }

  /** Custo real (folha + benefícios) de um colaborador numa competência — junta PayslipItem/PayrollLineItem com ApuracaoBeneficio. */
  async custoColaborador(employeeId: string, competencia: string) {
    const db = this.db();
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, nome: true, matricula: true, departamento: true },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const run = await db.payrollRun.findUnique({
      where: {
        tenantId_competencia: {
          tenantId: getRequestContext().tenantId,
          competencia,
        },
      },
    });
    const payslip = run
      ? await db.payslipItem.findUnique({
          where: {
            payrollRunId_employeeId: { payrollRunId: run.id, employeeId },
          },
          include: { linhas: true },
        })
      : null;

    const beneficios = await db.apuracaoBeneficio.findMany({
      where: { employeeId, competencia },
      include: { beneficioTipo: { select: { nome: true, categoria: true } } },
    });

    const custoFolha = payslip ? Number(payslip.proventos) : 0;
    const custoBeneficios = beneficios.reduce(
      (acc, b) => acc + Number(b.valorEmpresa),
      0,
    );

    return {
      employee,
      competencia,
      folha: payslip
        ? {
            origem: payslip.origem,
            proventos: Number(payslip.proventos),
            descontos: Number(payslip.descontos),
            liquido: Number(payslip.liquido),
            rubricas: payslip.linhas.map((l) => ({
              descricao: l.descricao,
              tipo: l.tipo,
              valor: Number(l.valor),
            })),
          }
        : null,
      beneficios: beneficios.map((b) => ({
        tipo: b.beneficioTipo.nome,
        categoria: b.beneficioTipo.categoria,
        valorEmpresa: Number(b.valorEmpresa),
        valorColaborador: Number(b.valorColaborador),
        valorTotal: Number(b.valorTotal),
      })),
      // Custo bruto para a empresa (proventos + benefícios). Não inclui encargos patronais
      // (INSS patronal, FGTS 8%, etc.) porque o sistema não os detalha por colaborador hoje.
      custoTotalEmpresa: custoFolha + custoBeneficios,
    };
  }

  /** Visão gerencial: custo total por colaborador/departamento numa competência. */
  async custoResumo(competencia: string) {
    const db = this.db();
    const tenantId = getRequestContext().tenantId;
    const employees = await db.employee.findMany({
      where: { status: 'ATIVO' },
      select: { id: true, nome: true, departamento: true },
    });

    const run = await db.payrollRun.findUnique({
      where: { tenantId_competencia: { tenantId, competencia } },
    });
    const payslips = run
      ? await db.payslipItem.findMany({ where: { payrollRunId: run.id } })
      : [];
    const payslipPorColaborador = new Map(
      payslips.map((p) => [p.employeeId, p]),
    );

    const beneficios = await db.apuracaoBeneficio.findMany({
      where: { competencia },
      select: { employeeId: true, valorEmpresa: true },
    });
    const beneficiosPorColaborador = new Map<string, number>();
    for (const b of beneficios) {
      beneficiosPorColaborador.set(
        b.employeeId,
        (beneficiosPorColaborador.get(b.employeeId) ?? 0) +
          Number(b.valorEmpresa),
      );
    }

    const porColaborador = employees
      .map((e) => {
        const payslip = payslipPorColaborador.get(e.id);
        const custoFolha = payslip ? Number(payslip.proventos) : 0;
        const custoBeneficios = beneficiosPorColaborador.get(e.id) ?? 0;
        return {
          employeeId: e.id,
          nome: e.nome,
          departamento: e.departamento,
          origemFolha: payslip?.origem ?? null,
          custoFolha,
          custoBeneficios,
          custoTotal: custoFolha + custoBeneficios,
        };
      })
      .sort((a, b) => b.custoTotal - a.custoTotal);

    const porDepartamentoMap = new Map<
      string,
      { departamento: string; custoTotal: number; colaboradores: number }
    >();
    for (const c of porColaborador) {
      const cur = porDepartamentoMap.get(c.departamento) ?? {
        departamento: c.departamento,
        custoTotal: 0,
        colaboradores: 0,
      };
      cur.custoTotal += c.custoTotal;
      cur.colaboradores += 1;
      porDepartamentoMap.set(c.departamento, cur);
    }

    return {
      competencia,
      temFolhaImportada: run !== null,
      porColaborador,
      porDepartamento: Array.from(porDepartamentoMap.values()).sort(
        (a, b) => b.custoTotal - a.custoTotal,
      ),
      totalGeral: porColaborador.reduce((acc, c) => acc + c.custoTotal, 0),
    };
  }

  saveImportTemplate(dto: SaveImportTemplateDto) {
    let mapeamento: unknown;
    try {
      mapeamento = JSON.parse(dto.mapeamento);
    } catch {
      throw new BadRequestException('Mapeamento inválido.');
    }
    const tenantId = getRequestContext().tenantId;
    return this.db().payrollImportTemplate.upsert({
      where: { tenantId_nome: { tenantId, nome: dto.nome } },
      create: { tenantId, nome: dto.nome, mapeamento: mapeamento as object },
      update: { mapeamento: mapeamento as object },
    });
  }
}
