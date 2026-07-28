import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import {
  AddDependentePlanoSaudeDto,
  CreateAdesaoAcademiaDto,
  CreateAdesaoPlanoSaudeDto,
  CreateAdesaoValeDiarioDto,
  CreateBeneficioTipoDto,
  CreateConvenioAcademiaDto,
  CreateFaixaEtariaDto,
  CreateFeriadoDto,
  CreatePlanoSaudeDto,
  SetCoparticipacaoDto,
} from './dto/benefits.dto';

@Injectable()
export class BenefitsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  private tenantId() {
    return getRequestContext().tenantId;
  }

  // ── Tipos de benefício + coparticipação ──────────────────────

  listTipos() {
    return this.db().beneficioTipo.findMany({
      orderBy: { nome: 'asc' },
      include: { coparticipacao: true },
    });
  }

  createTipo(dto: CreateBeneficioTipoDto) {
    return this.db().beneficioTipo.create({ data: { ...dto, tenantId: this.tenantId() } });
  }

  async setCoparticipacao(tipoId: string, dto: SetCoparticipacaoDto) {
    const tipo = await this.db().beneficioTipo.findUnique({ where: { id: tipoId } });
    if (!tipo) throw new NotFoundException('Tipo de benefício não encontrado.');
    return this.db().coparticipacaoRegra.upsert({
      where: { beneficioTipoId: tipoId },
      create: { beneficioTipoId: tipoId, tenantId: this.tenantId(), ...dto },
      update: dto,
    });
  }

  // ── Convênios de academia ─────────────────────────────────────

  listConveniosAcademia() {
    return this.db().convenioAcademia.findMany({ orderBy: { nome: 'asc' } });
  }

  createConvenioAcademia(dto: CreateConvenioAcademiaDto) {
    return this.db().convenioAcademia.create({ data: { ...dto, tenantId: this.tenantId() } });
  }

  async removeConvenioAcademia(id: string) {
    await this.db().convenioAcademia.delete({ where: { id } });
    return { ok: true };
  }

  // ── Planos de saúde + faixas etárias ──────────────────────────

  listPlanosSaude() {
    return this.db().planoSaude.findMany({
      orderBy: { nome: 'asc' },
      include: { faixasEtarias: { orderBy: { idadeMin: 'asc' } } },
    });
  }

  createPlanoSaude(dto: CreatePlanoSaudeDto) {
    return this.db().planoSaude.create({ data: { ...dto, tenantId: this.tenantId() } });
  }

  async removePlanoSaude(id: string) {
    await this.db().planoSaude.delete({ where: { id } });
    return { ok: true };
  }

  async addFaixaEtaria(planoId: string, dto: CreateFaixaEtariaDto) {
    const plano = await this.db().planoSaude.findUnique({ where: { id: planoId } });
    if (!plano) throw new NotFoundException('Plano de saúde não encontrado.');
    return this.db().planoSaudeFaixaEtaria.create({ data: { ...dto, planoId, tenantId: this.tenantId() } });
  }

  async removeFaixaEtaria(planoId: string, faixaId: string) {
    const faixa = await this.db().planoSaudeFaixaEtaria.findUnique({ where: { id: faixaId } });
    if (!faixa || faixa.planoId !== planoId) throw new NotFoundException('Faixa etária não encontrada.');
    await this.db().planoSaudeFaixaEtaria.delete({ where: { id: faixaId } });
    return { ok: true };
  }

  // ── Feriados ───────────────────────────────────────────────────

  listFeriados() {
    return this.db().feriado.findMany({ orderBy: { data: 'asc' } });
  }

  createFeriado(dto: CreateFeriadoDto) {
    return this.db().feriado.create({
      data: { ...dto, data: new Date(dto.data), tenantId: this.tenantId() },
    });
  }

  async removeFeriado(id: string) {
    await this.db().feriado.delete({ where: { id } });
    return { ok: true };
  }

  // ── Adesão por colaborador ────────────────────────────────────

  async resumoEmployee(employeeId: string) {
    const db = this.db();
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const [valeDiario, academia, planoSaude] = await Promise.all([
      db.adesaoValeDiario.findMany({
        where: { employeeId },
        include: { beneficioTipo: true },
        orderBy: { dataInicio: 'desc' },
      }),
      db.adesaoAcademia.findMany({
        where: { employeeId },
        include: { convenio: true },
        orderBy: { dataAdesao: 'desc' },
      }),
      db.adesaoPlanoSaude.findMany({
        where: { employeeId },
        include: { plano: true, dependentes: true },
        orderBy: { dataAdesao: 'desc' },
      }),
    ]);

    return { valeDiario, academia, planoSaude };
  }

  createAdesaoValeDiario(employeeId: string, dto: CreateAdesaoValeDiarioDto) {
    return this.db().adesaoValeDiario.create({
      data: {
        employeeId,
        tenantId: this.tenantId(),
        beneficioTipoId: dto.beneficioTipoId,
        valorDiario: dto.valorDiario,
        dataInicio: new Date(dto.dataInicio),
      },
    });
  }

  async cancelAdesaoValeDiario(employeeId: string, adesaoId: string) {
    const adesao = await this.db().adesaoValeDiario.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().adesaoValeDiario.update({ where: { id: adesaoId }, data: { dataFim: new Date() } });
  }

  createAdesaoAcademia(employeeId: string, dto: CreateAdesaoAcademiaDto) {
    return this.db().adesaoAcademia.create({
      data: {
        employeeId,
        tenantId: this.tenantId(),
        convenioId: dto.convenioId,
        dataAdesao: new Date(dto.dataAdesao),
      },
    });
  }

  async cancelAdesaoAcademia(employeeId: string, adesaoId: string) {
    const adesao = await this.db().adesaoAcademia.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().adesaoAcademia.update({ where: { id: adesaoId }, data: { dataCancelamento: new Date() } });
  }

  createAdesaoPlanoSaude(employeeId: string, dto: CreateAdesaoPlanoSaudeDto) {
    return this.db().adesaoPlanoSaude.create({
      data: {
        employeeId,
        tenantId: this.tenantId(),
        planoId: dto.planoId,
        dataAdesao: new Date(dto.dataAdesao),
      },
    });
  }

  async cancelAdesaoPlanoSaude(employeeId: string, adesaoId: string) {
    const adesao = await this.db().adesaoPlanoSaude.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().adesaoPlanoSaude.update({ where: { id: adesaoId }, data: { dataCancelamento: new Date() } });
  }

  async addDependentePlanoSaude(employeeId: string, adesaoId: string, dto: AddDependentePlanoSaudeDto) {
    const adesao = await this.db().adesaoPlanoSaude.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().dependentePlanoSaude.create({
      data: {
        adesaoId,
        tenantId: this.tenantId(),
        nome: dto.nome,
        dataNascimento: new Date(dto.dataNascimento),
        parentesco: dto.parentesco,
      },
    });
  }

  async removeDependentePlanoSaude(employeeId: string, adesaoId: string, dependenteId: string) {
    const adesao = await this.db().adesaoPlanoSaude.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    const dependente = await this.db().dependentePlanoSaude.findUnique({ where: { id: dependenteId } });
    if (!dependente || dependente.adesaoId !== adesaoId) throw new NotFoundException('Dependente não encontrado.');
    await this.db().dependentePlanoSaude.delete({ where: { id: dependenteId } });
    return { ok: true };
  }
}
