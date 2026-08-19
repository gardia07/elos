import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { competenciaRange, diasUteisPagos, idadeEm, splitCoparticipacao } from './apuracao.util';
import {
  AddDependentePlanoSaudeDto,
  CalcularApuracaoDto,
  CreateAdesaoAcademiaDto,
  CreateAdesaoBeneficioFixoDto,
  CreateAdesaoPlanoSaudeDto,
  CreateAdesaoValeDiarioDto,
  CreateBeneficioTipoDto,
  CreateConvenioAcademiaDto,
  CreateFaixaEtariaDto,
  CreateFeriadoDto,
  CreatePlanoSaudeDto,
  SetCoparticipacaoDto,
  UpdateAdesaoBeneficioFixoDto,
  UpdateAdesaoValeDiarioDto,
  UpdateBeneficioTipoDto,
  UpdateConvenioAcademiaDto,
  UpdateFaixaEtariaDto,
  UpdatePlanoSaudeDto,
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

  async updateTipo(id: string, dto: UpdateBeneficioTipoDto) {
    const tipo = await this.db().beneficioTipo.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de benefício não encontrado.');
    return this.db().beneficioTipo.update({ where: { id }, data: dto });
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

  async updateConvenioAcademia(id: string, dto: UpdateConvenioAcademiaDto) {
    const convenio = await this.db().convenioAcademia.findUnique({ where: { id } });
    if (!convenio) throw new NotFoundException('Convênio não encontrado.');
    return this.db().convenioAcademia.update({ where: { id }, data: dto });
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

  async updatePlanoSaude(id: string, dto: UpdatePlanoSaudeDto) {
    const plano = await this.db().planoSaude.findUnique({ where: { id } });
    if (!plano) throw new NotFoundException('Plano de saúde não encontrado.');
    return this.db().planoSaude.update({ where: { id }, data: dto });
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

  async updateFaixaEtaria(planoId: string, faixaId: string, dto: UpdateFaixaEtariaDto) {
    const faixa = await this.db().planoSaudeFaixaEtaria.findUnique({ where: { id: faixaId } });
    if (!faixa || faixa.planoId !== planoId) throw new NotFoundException('Faixa etária não encontrada.');
    return this.db().planoSaudeFaixaEtaria.update({ where: { id: faixaId }, data: dto });
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

    const [valeDiario, academia, planoSaude, beneficioFixo] = await Promise.all([
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
      db.adesaoBeneficioFixo.findMany({
        where: { employeeId },
        include: { beneficioTipo: true },
        orderBy: { dataInicio: 'desc' },
      }),
    ]);

    return { valeDiario, academia, planoSaude, beneficioFixo };
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

  async updateAdesaoValeDiario(employeeId: string, adesaoId: string, dto: UpdateAdesaoValeDiarioDto) {
    const adesao = await this.db().adesaoValeDiario.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().adesaoValeDiario.update({ where: { id: adesaoId }, data: dto });
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

  createAdesaoBeneficioFixo(employeeId: string, dto: CreateAdesaoBeneficioFixoDto) {
    return this.db().adesaoBeneficioFixo.create({
      data: {
        employeeId,
        tenantId: this.tenantId(),
        beneficioTipoId: dto.beneficioTipoId,
        valorMensal: dto.valorMensal,
        dataInicio: new Date(dto.dataInicio),
      },
    });
  }

  async updateAdesaoBeneficioFixo(employeeId: string, adesaoId: string, dto: UpdateAdesaoBeneficioFixoDto) {
    const adesao = await this.db().adesaoBeneficioFixo.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().adesaoBeneficioFixo.update({ where: { id: adesaoId }, data: dto });
  }

  async cancelAdesaoBeneficioFixo(employeeId: string, adesaoId: string) {
    const adesao = await this.db().adesaoBeneficioFixo.findUnique({ where: { id: adesaoId } });
    if (!adesao || adesao.employeeId !== employeeId) throw new NotFoundException('Adesão não encontrada.');
    return this.db().adesaoBeneficioFixo.update({ where: { id: adesaoId }, data: { dataFim: new Date() } });
  }

  // ── Apuração mensal ───────────────────────────────────────────

  listApuracao(competencia: string) {
    return this.db().apuracaoBeneficio.findMany({
      where: { competencia },
      include: {
        employee: { select: { id: true, nome: true, matricula: true, departamento: true } },
        beneficioTipo: { select: { id: true, nome: true, categoria: true } },
      },
      orderBy: { employee: { nome: 'asc' } },
    });
  }

  async calcularApuracao(dto: CalcularApuracaoDto) {
    const db = this.db();
    const tenantId = this.tenantId();
    const { competencia } = dto;
    const { inicio, fim } = competenciaRange(competencia);

    const employees = await db.employee.findMany({ where: { status: 'ATIVO' } });
    const feriados = (await db.feriado.findMany()).map((f) => f.data);

    const tipos = await db.beneficioTipo.findMany({ include: { coparticipacao: true } });
    const tipoAcademia = tipos.find((t) => t.categoria === 'ACADEMIA');
    const tipoSaude = tipos.find((t) => t.categoria === 'SAUDE');

    const upsertApuracao = (
      employeeId: string,
      beneficioTipoId: string,
      valores: { valorEmpresa: number; valorColaborador: number; valorTotal: number },
      detalhamento: Prisma.InputJsonValue,
    ) =>
      db.apuracaoBeneficio.upsert({
        where: { tenantId_employeeId_beneficioTipoId_competencia: { tenantId, employeeId, beneficioTipoId, competencia } },
        create: { tenantId, employeeId, beneficioTipoId, competencia, ...valores, detalhamento },
        update: { ...valores, detalhamento },
      });

    const regra = (coparticipacao: { percentualEmpresa: unknown } | null) =>
      coparticipacao ? { percentualEmpresa: Number(coparticipacao.percentualEmpresa) } : null;

    let itensApurados = 0;

    for (const employee of employees) {
      const feriasAprovadas = await db.fracaoDeFerias.findMany({
        where: { periodoAquisitivo: { employeeId: employee.id }, status: 'APROVADA', dataInicio: { lte: fim }, dataFim: { gte: inicio } },
      });
      const feriasPeriodos = feriasAprovadas.map((f) => ({ inicio: f.dataInicio, fim: f.dataFim as Date | null }));

      const afastamentos = await db.leaveRecord.findMany({
        where: { employeeId: employee.id, inicio: { lte: fim }, OR: [{ retorno: null }, { retorno: { gte: inicio } }] },
      });
      const afastamentoPeriodos = afastamentos.map((a) => ({ inicio: a.inicio, fim: a.retorno }));

      // Vale-alimentação / vale-refeição
      const valesDiarios = await db.adesaoValeDiario.findMany({
        where: { employeeId: employee.id, dataInicio: { lte: fim }, OR: [{ dataFim: null }, { dataFim: { gte: inicio } }] },
        include: { beneficioTipo: { include: { coparticipacao: true } } },
      });
      for (const v of valesDiarios) {
        const { diasUteis, diasDescontados } = diasUteisPagos(
          competencia,
          { inicio: v.dataInicio, fim: v.dataFim },
          feriados,
          feriasPeriodos,
          afastamentoPeriodos,
        );
        const valorDiario = Number(v.valorDiario);
        const valorTotal = Math.round(diasUteis * valorDiario * 100) / 100;
        const { valorEmpresa, valorColaborador } = splitCoparticipacao(valorTotal, regra(v.beneficioTipo.coparticipacao));
        await upsertApuracao(employee.id, v.beneficioTipoId, { valorEmpresa, valorColaborador, valorTotal }, {
          tipo: 'vale_diario',
          diasUteis,
          diasDescontados,
          valorDiario,
        });
        itensApurados++;
      }

      // Academia
      if (tipoAcademia) {
        const academias = await db.adesaoAcademia.findMany({
          where: { employeeId: employee.id, dataAdesao: { lte: fim }, OR: [{ dataCancelamento: null }, { dataCancelamento: { gte: inicio } }] },
          include: { convenio: true },
        });
        if (academias.length > 0) {
          const valorTotal = academias.reduce((sum, a) => sum + Number(a.convenio.valorMensalidade), 0);
          const { valorEmpresa, valorColaborador } = splitCoparticipacao(valorTotal, regra(tipoAcademia.coparticipacao));
          await upsertApuracao(employee.id, tipoAcademia.id, { valorEmpresa, valorColaborador, valorTotal }, {
            tipo: 'academia',
            convenios: academias.map((a) => a.convenio.nome),
          });
          itensApurados++;
        }
      }

      // Plano de saúde
      if (tipoSaude) {
        const adesoesSaude = await db.adesaoPlanoSaude.findMany({
          where: { employeeId: employee.id, dataAdesao: { lte: fim }, OR: [{ dataCancelamento: null }, { dataCancelamento: { gte: inicio } }] },
          include: { plano: { include: { faixasEtarias: true } }, dependentes: true },
        });
        if (adesoesSaude.length > 0) {
          let valorTotal = 0;
          const beneficiarios: { quem: string; idade: number | null; valor: number }[] = [];
          for (const s of adesoesSaude) {
            const idadeTitular = employee.dataNascimento ? idadeEm(employee.dataNascimento, fim) : null;
            const faixaTitular = idadeTitular != null ? s.plano.faixasEtarias.find((f) => idadeTitular >= f.idadeMin && idadeTitular <= f.idadeMax) : undefined;
            const valorTitular = faixaTitular ? Number(faixaTitular.valor) : 0;
            valorTotal += valorTitular;
            beneficiarios.push({ quem: 'titular', idade: idadeTitular, valor: valorTitular });

            for (const dep of s.dependentes) {
              const idadeDep = idadeEm(dep.dataNascimento, fim);
              const faixaDep = s.plano.faixasEtarias.find((f) => idadeDep >= f.idadeMin && idadeDep <= f.idadeMax);
              const valorDep = faixaDep ? Number(faixaDep.valor) : 0;
              valorTotal += valorDep;
              beneficiarios.push({ quem: dep.nome, idade: idadeDep, valor: valorDep });
            }
          }
          const { valorEmpresa, valorColaborador } = splitCoparticipacao(valorTotal, regra(tipoSaude.coparticipacao));
          await upsertApuracao(employee.id, tipoSaude.id, { valorEmpresa, valorColaborador, valorTotal }, {
            tipo: 'plano_saude',
            planos: adesoesSaude.map((s) => s.plano.nome),
            beneficiarios,
          });
          itensApurados++;
        }
      }

      // Outros benefícios (valor fixo mensal)
      const fixos = await db.adesaoBeneficioFixo.findMany({
        where: { employeeId: employee.id, dataInicio: { lte: fim }, OR: [{ dataFim: null }, { dataFim: { gte: inicio } }] },
        include: { beneficioTipo: { include: { coparticipacao: true } } },
      });
      const fixosPorTipo = new Map<string, { nome: string; coparticipacao: { percentualEmpresa: number } | null; valor: number }>();
      for (const f of fixos) {
        const atual = fixosPorTipo.get(f.beneficioTipoId) ?? { nome: f.beneficioTipo.nome, coparticipacao: f.beneficioTipo.coparticipacao ? { percentualEmpresa: Number(f.beneficioTipo.coparticipacao.percentualEmpresa) } : null, valor: 0 };
        atual.valor += Number(f.valorMensal);
        fixosPorTipo.set(f.beneficioTipoId, atual);
      }
      for (const [beneficioTipoId, info] of fixosPorTipo) {
        const { valorEmpresa, valorColaborador } = splitCoparticipacao(info.valor, info.coparticipacao);
        await upsertApuracao(employee.id, beneficioTipoId, { valorEmpresa, valorColaborador, valorTotal: info.valor }, {
          tipo: 'fixo',
          nome: info.nome,
        });
        itensApurados++;
      }
    }

    return { competencia, colaboradoresProcessados: employees.length, itensApurados };
  }
}
