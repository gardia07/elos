import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { getRequestContext } from '../../common/request-context';
import {
  deleteDocumento,
  downloadDocumento,
  uploadDocumento,
} from '../../common/blob-storage';
import { nextMatricula } from './matricula.util';
import {
  AddContatoEmergenciaDto,
  AddDependenteDto,
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  PromoteEmployeeDto,
  UpdateEmployeeDto,
} from './dto/employees.dto';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthsBetween(from: Date, to: Date): { anos: number; meses: number } {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return {
    anos: Math.floor(Math.max(months, 0) / 12),
    meses: Math.max(months, 0) % 12,
  };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async create(dto: CreateEmployeeDto) {
    const db = this.db();
    const matricula = dto.matricula || (await nextMatricula(db));
    const dataAdmissao = new Date(dto.dataAdmissao);
    const employee = await db.employee.create({
      data: {
        tenantId: getRequestContext().tenantId,
        matricula,
        nome: dto.nome,
        cargo: dto.cargo,
        departamento: dto.departamento,
        filial: dto.filial,
        status: 'ATIVO',
        dataAdmissao,
        email: dto.email,
        telefone: dto.telefone,
        salario: dto.salario,
        tipoContrato: dto.tipoContrato ?? 'CLT',
        tipoSalario: dto.tipoSalario ?? 'MENSALISTA',
        feriasSaldo: 30,
        feriasVencimento: addMonths(dataAdmissao, 12),
        historico: {
          create: [
            {
              evento: 'Colaborador cadastrado diretamente em Colaboradores',
              categoria: 'Admissão',
              autor: getRequestContext().userName,
            },
          ],
        },
      },
    });
    return employee;
  }

  async list(query: ListEmployeesQueryDto) {
    const where: Prisma.EmployeeWhereInput = {};
    if (query.nome) where.nome = { contains: query.nome, mode: 'insensitive' };
    if (query.departamento) where.departamento = query.departamento;
    if (query.cargo)
      where.cargo = { contains: query.cargo, mode: 'insensitive' };
    if (query.filial) where.filial = query.filial;
    if (query.tipoContrato) where.tipoContrato = query.tipoContrato;
    if (query.tipoSalario) where.tipoSalario = query.tipoSalario;
    if (query.status) where.status = query.status;
    if (query.admissaoDe || query.admissaoAte) {
      where.dataAdmissao = {
        ...(query.admissaoDe ? { gte: new Date(query.admissaoDe) } : {}),
        ...(query.admissaoAte ? { lte: new Date(query.admissaoAte) } : {}),
      };
    }

    const employees = await this.db().employee.findMany({
      where,
      orderBy: { nome: 'asc' },
    });
    const { byEmployee: conformidade } =
      await this.documents.complianceOverview(employees.map((e) => e.id));
    const hoje = new Date();
    let mapped = employees.map((e) => ({
      ...e,
      conformidadeDocumental: conformidade[e.id] ?? e.conformidadeDocumental,
      tempoDeCasa: monthsBetween(e.dataAdmissao, hoje),
      feriasVencimentoAlerta: daysUntil(e.feriasVencimento, hoje) <= 60,
    }));

    if (query.feriasVencendo)
      mapped = mapped.filter((e) => e.feriasVencimentoAlerta);
    if (query.tempoDeCasaMinAnos != null) {
      mapped = mapped.filter(
        (e) => e.tempoDeCasa.anos >= query.tempoDeCasaMinAnos!,
      );
    }

    return mapped;
  }

  async filterOptions() {
    const employees = await this.db().employee.findMany({
      select: { departamento: true, cargo: true, filial: true },
    });
    const uniq = (values: (string | null)[]) =>
      Array.from(new Set(values.filter((v): v is string => !!v))).sort();
    return {
      departamentos: uniq(employees.map((e) => e.departamento)),
      cargos: uniq(employees.map((e) => e.cargo)),
      filiais: uniq(employees.map((e) => e.filial)),
    };
  }

  /** Candidates for the "gestor direto" picker — active CLT/PJ employees, optionally excluding the employee being edited. */
  async managers(excludeId?: string) {
    const employees = await this.db().employee.findMany({
      where: {
        status: 'ATIVO',
        tipoContrato: { in: ['CLT', 'PJ'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, nome: true, cargo: true, tipoContrato: true },
      orderBy: { nome: 'asc' },
    });
    return employees;
  }

  async orgChart() {
    const employees = await this.db().employee.findMany({
      where: { status: 'ATIVO' },
      select: { departamento: true },
    });
    const counts = new Map<string, number>();
    for (const e of employees)
      counts.set(e.departamento, (counts.get(e.departamento) ?? 0) + 1);
    return Array.from(counts.entries()).map(([departamento, total]) => ({
      departamento,
      total,
    }));
  }

  async get(id: string) {
    const employee = await this.db().employee.findUnique({
      where: { id },
      include: {
        dependentes: true,
        contatosEmergencia: true,
        historico: { orderBy: { data: 'desc' } },
        documentos: { orderBy: { uploadEm: 'desc' } },
        feriasHistorico: true,
        cargoSalarioHistorico: { orderBy: { vigenciaDesde: 'desc' } },
        evaluationRecords: { include: { cycle: true } },
        leaveRecords: { orderBy: { inicio: 'desc' } },
        vacationRequests: {
          where: { status: 'APROVADA' },
          orderBy: { inicio: 'asc' },
        },
      },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const { byEmployee: conformidade } =
      await this.documents.complianceOverview([id]);
    const hoje = new Date();
    const proximasFerias =
      employee.vacationRequests.find((r) => r.fim >= hoje) ?? null;

    return {
      ...employee,
      conformidadeDocumental:
        conformidade[id] ?? employee.conformidadeDocumental,
      tempoDeCasa: monthsBetween(employee.dataAdmissao, hoje),
      feriasVencimentoAlerta: daysUntil(employee.feriasVencimento, hoje) <= 60,
      proximasFerias: proximasFerias
        ? { inicio: proximasFerias.inicio, fim: proximasFerias.fim }
        : null,
    };
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const current = await this.mustFind(id);
    const {
      dataNascimento,
      dataAdmissao,
      rgDataExpedicao,
      cnhValidade,
      salario,
      motivoAlteracaoSalario,
      salarioVigenciaDesde,
      ...rest
    } = dto;
    const salarioMudou =
      salario != null && Number(salario) !== Number(current.salario);
    const updated = await this.db().employee.update({
      where: { id },
      data: {
        ...rest,
        ...(dataNascimento ? { dataNascimento: new Date(dataNascimento) } : {}),
        ...(dataAdmissao ? { dataAdmissao: new Date(dataAdmissao) } : {}),
        ...(rgDataExpedicao
          ? { rgDataExpedicao: new Date(rgDataExpedicao) }
          : {}),
        ...(cnhValidade ? { cnhValidade: new Date(cnhValidade) } : {}),
        ...(salario != null ? { salario } : {}),
      },
    });
    if (salarioMudou) {
      const detalhe = motivoAlteracaoSalario
        ? ` — ${motivoAlteracaoSalario}`
        : '';
      await this.addHistorico(
        id,
        `Salário corrigido de ${formatBRL(Number(current.salario))} para ${formatBRL(salario)}${detalhe}`,
        'Correção cadastral',
      );
      await this.addCargoSalarioHistorico(id, {
        vigenciaDesde: salarioVigenciaDesde
          ? new Date(salarioVigenciaDesde)
          : new Date(),
        cargo: updated.cargo,
        salario: salario,
        motivo: 'Correção cadastral',
        observacao: motivoAlteracaoSalario,
      });
    }
    await this.addHistorico(id, 'Dados cadastrais atualizados', 'Documento');
    return updated;
  }

  async promote(id: string, dto: PromoteEmployeeDto) {
    const current = await this.mustFind(id);
    const updated = await this.db().employee.update({
      where: { id },
      data: {
        ...(dto.cargo ? { cargo: dto.cargo } : {}),
        salario: dto.salario,
      },
    });
    const cargoTxt =
      dto.cargo && dto.cargo !== current.cargo
        ? ` — novo cargo: ${dto.cargo}`
        : '';
    await this.addHistorico(
      id,
      `${dto.motivo}: salário de ${formatBRL(Number(current.salario))} para ${formatBRL(dto.salario)}${cargoTxt}`,
      dto.motivo,
    );
    await this.addCargoSalarioHistorico(id, {
      vigenciaDesde: dto.vigenciaDesde
        ? new Date(dto.vigenciaDesde)
        : new Date(),
      cargo: dto.cargo || current.cargo,
      salario: dto.salario,
      motivo: dto.motivo,
    });
    return updated;
  }

  async addDependente(id: string, dto: AddDependenteDto) {
    await this.mustFind(id);
    return this.db().dependente.create({
      data: {
        employeeId: id,
        nome: dto.nome,
        parentesco: dto.parentesco,
        cpf: dto.cpf,
        dataNascimento: dto.dataNascimento
          ? new Date(dto.dataNascimento)
          : undefined,
      },
    });
  }

  async addContatoEmergencia(id: string, dto: AddContatoEmergenciaDto) {
    await this.mustFind(id);
    return this.db().contatoEmergencia.create({
      data: {
        employeeId: id,
        nome: dto.nome,
        parentesco: dto.parentesco,
        telefone: dto.telefone,
      },
    });
  }

  async removeContatoEmergencia(id: string, contatoId: string) {
    await this.mustFind(id);
    const contato = await this.db().contatoEmergencia.findUnique({
      where: { id: contatoId },
    });
    if (!contato || contato.employeeId !== id)
      throw new NotFoundException('Contato não encontrado.');
    await this.db().contatoEmergencia.delete({ where: { id: contatoId } });
    return { ok: true };
  }

  async addDocumento(
    id: string,
    file: Express.Multer.File,
    tipo: string,
    nomeOverride?: string,
  ) {
    const { tenantId } = getRequestContext();
    await this.mustFind(id);
    const uploaded = await uploadDocumento(
      `colaboradores/${tenantId}/${id}/documentos`,
      file,
    );
    const doc = await this.db().employeeDocumento.create({
      data: {
        employeeId: id,
        nome: nomeOverride || file.originalname,
        tipo,
        tamanho: uploaded.tamanho,
        blobPathname: uploaded.pathname,
        contentType: uploaded.contentType,
      },
    });
    await this.addHistorico(
      id,
      `Documento adicionado: ${doc.nome}`,
      'Documento',
    );
    return doc;
  }

  async getDocumentoArquivo(id: string, documentoId: string) {
    const doc = await this.db().employeeDocumento.findUnique({
      where: { id: documentoId },
    });
    if (!doc || doc.employeeId !== id)
      throw new NotFoundException('Documento não encontrado.');
    const arquivo = doc.blobPathname
      ? await downloadDocumento(doc.blobPathname)
      : null;
    if (!arquivo)
      throw new NotFoundException('Arquivo não encontrado no armazenamento.');
    return { ...arquivo, nome: doc.nome };
  }

  async removeDocumento(id: string, documentoId: string) {
    await this.mustFind(id);
    const doc = await this.db().employeeDocumento.findUnique({
      where: { id: documentoId },
    });
    if (!doc || doc.employeeId !== id)
      throw new NotFoundException('Documento não encontrado.');
    await this.db().employeeDocumento.delete({ where: { id: documentoId } });
    await deleteDocumento(doc.blobPathname);
    await this.addHistorico(id, `Documento removido: ${doc.nome}`, 'Documento');
    return { ok: true };
  }

  private async addHistorico(
    employeeId: string,
    evento: string,
    categoria: string,
  ) {
    const { userName } = getRequestContext();
    return this.db().historicoEvento.create({
      data: { employeeId, evento, categoria, autor: userName },
    });
  }

  private async addCargoSalarioHistorico(
    employeeId: string,
    entry: {
      vigenciaDesde: Date;
      cargo: string;
      salario: number;
      motivo: string;
      observacao?: string;
    },
  ) {
    const { userName } = getRequestContext();
    return this.db().cargoSalarioHistorico.create({
      data: { employeeId, registradoPor: userName, ...entry },
    });
  }

  private async mustFind(id: string) {
    const employee = await this.db().employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    return employee;
  }
}

function daysUntil(date: Date, from: Date): number {
  return Math.round((date.getTime() - from.getTime()) / 86_400_000);
}
