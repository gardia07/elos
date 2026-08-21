import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { AuditService } from '../../audit/audit.service';
import { ComplianceEngineService } from '../../compliance-engine/compliance-engine.service';
import { CreateAfastamentoDto } from './dto/afastamentos.dto';
import {
  AfastamentoParaEpisodio,
  calcularEpisodio,
  calcularResponsabilidadeDoAfastamento,
  dentroDaJanelaDeRecaida,
  diasCorridos,
} from './afastamento-episodio.util';

/** Únicas roles com acesso ao CID (dado de saúde sensível, LGPD art. 5º, II) -- mesma dupla tratada como "RH completo" em todo o resto do sistema. */
const ROLES_COM_ACESSO_AO_CID = ['ADMIN', 'RH_GENERALISTA'];

const ESTABILIDADE_MESES = 12;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

@Injectable()
export class AfastamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly complianceEngine: ComplianceEngineService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  private podeVerCid(): boolean {
    return ROLES_COM_ACESSO_AO_CID.includes(getRequestContext().role);
  }

  /** Remove os campos sensíveis da resposta pra quem não tem permissão -- o mascaramento real é aqui, o front só reflete o que chega. */
  private mascarar<T extends { cid: string | null; cidDescricao: string | null }>(row: T): T {
    if (this.podeVerCid()) return row;
    return { ...row, cid: null, cidDescricao: null };
  }

  listMotivos() {
    return this.db().motivoAfastamento.findMany({ where: { ativo: true }, orderBy: { descricao: 'asc' } });
  }

  async list() {
    const rows = await this.db().leaveRecord.findMany({
      include: { employee: { select: { nome: true } }, motivoAfastamento: true },
      orderBy: { inicio: 'desc' },
    });
    return rows.map((r) => ({ ...this.mascarar(r), diasCorridos: diasCorridos(r), situacao: r.retorno ? 'ENCERRADO' : 'EM_ANDAMENTO' }));
  }

  async findOne(id: string) {
    const row = await this.db().leaveRecord.findUnique({
      where: { id },
      include: { employee: { select: { nome: true } }, motivoAfastamento: true },
    });
    if (!row) throw new NotFoundException('Afastamento não encontrado.');

    let episodio: ReturnType<typeof calcularEpisodio> | null = null;
    let responsabilidade: ReturnType<typeof calcularResponsabilidadeDoAfastamento> | null = null;
    if (row.episodioId) {
      const doEpisodio = await this.db().leaveRecord.findMany({ where: { episodioId: row.episodioId } });
      const ordenados = [...doEpisodio].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
      episodio = calcularEpisodio(ordenados);
      const antes = ordenados.filter((a) => a.inicio.getTime() < row.inicio.getTime());
      const diasAcumuladosAntes = antes.reduce((soma, a) => soma + diasCorridos(a), 0);
      responsabilidade = calcularResponsabilidadeDoAfastamento(diasAcumuladosAntes, row);
    }

    const estabilidadeAte =
      row.retorno && row.motivoAfastamento?.geraEstabilidade ? addMonths(row.retorno, ESTABILIDADE_MESES) : null;

    const mascarado = this.mascarar(row);
    if (this.podeVerCid() && row.cid) {
      await this.audit.log('LeaveRecord', id, 'cid_visualizado');
    }
    return { ...mascarado, diasCorridos: diasCorridos(row), situacao: row.retorno ? 'ENCERRADO' : 'EM_ANDAMENTO', episodio, responsabilidade, estabilidadeAte };
  }

  async create(dto: CreateAfastamentoDto) {
    const { tenantId } = getRequestContext();
    const db = this.db();
    const motivo = await db.motivoAfastamento.findUnique({ where: { id: dto.motivoAfastamentoId } });
    if (!motivo || !motivo.ativo) throw new NotFoundException('Motivo de afastamento não encontrado.');
    if (motivo.exigeCid && !dto.cid) {
      throw new BadRequestException('Este motivo exige o CID do atestado.');
    }

    const inicio = new Date(dto.inicio);
    const novoAfastamento: AfastamentoParaEpisodio = {
      id: 'novo',
      inicio,
      retorno: null,
      dataFimPrevista: dto.dataFimPrevista ? new Date(dto.dataFimPrevista) : null,
    };

    // Motor de episódio (spec §4.2): só entra em jogo quando o motivo exige CID -- licenças
    // administrativas (maternidade, sem vencimento etc.) não somam entre si.
    let episodioId: string | null = null;
    let diasAcumuladosAntes = 0;
    if (dto.cid) {
      const candidatos = await db.afastamentoEpisodio.findMany({
        where: { employeeId: dto.employeeId, cid: dto.cid },
        include: { leaveRecords: true },
      });
      for (const candidato of candidatos) {
        if (candidato.leaveRecords.length === 0) continue;
        const calc = calcularEpisodio(candidato.leaveRecords);
        if (calc.status === 'ABERTO' && dentroDaJanelaDeRecaida(calc.dataLimiteJanela60Dias, inicio)) {
          episodioId = candidato.id;
          diasAcumuladosAntes = calc.diasAcumulados;
          break;
        }
      }
      if (!episodioId) {
        const criado = await db.afastamentoEpisodio.create({ data: { tenantId, employeeId: dto.employeeId, cid: dto.cid } });
        episodioId = criado.id;
      }
    }

    const responsabilidade = calcularResponsabilidadeDoAfastamento(diasAcumuladosAntes, novoAfastamento);

    const leave = await db.leaveRecord.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        tipo: motivo.descricao,
        inicio,
        dataFimPrevista: novoAfastamento.dataFimPrevista ?? undefined,
        motivoAfastamentoId: motivo.id,
        cid: dto.cid,
        cidDescricao: dto.cidDescricao,
        medicoNome: dto.medicoNome,
        medicoCrm: dto.medicoCrm,
        episodioId: episodioId ?? undefined,
      },
    });

    await this.complianceEngine.registrarEvento({
      employeeId: dto.employeeId,
      tipoEvento: motivo.natureza === 'OCUPACIONAL' ? 'ACIDENTE_TRABALHO' : 'INICIO_AFASTAMENTO',
      dataEvento: inicio,
      dadosNovos: { motivo: motivo.descricao, cid: dto.cid ?? null },
    });

    // Cruzou o limiar de 15 dias acumulados pela primeira vez nesta gravação -- dispara a
    // pendência de comunicar a recaída ao INSS (infoMesmoMtv do S-2230), sem bloquear o salvamento.
    if (diasAcumuladosAntes < 15 && diasAcumuladosAntes + responsabilidade.diasCorridos >= 15) {
      await this.complianceEngine.registrarEvento({
        employeeId: dto.employeeId,
        tipoEvento: 'AFASTAMENTO_RECAIDA_15_DIAS',
        dataEvento: inicio,
        dadosNovos: { cid: dto.cid, diasAcumulados: diasAcumuladosAntes + responsabilidade.diasCorridos },
      });
    }

    return { ...this.mascarar(leave), responsabilidade };
  }

  /** Fecha um afastamento em aberto. Mesma regra de vacations.service.ts::registrarRetorno (ASO de retorno NR-7 ≥30 dias) -- o motor de episódio não precisa de recálculo escrito, é sempre derivado na leitura. */
  async registrarRetorno(id: string, dataRetorno: string) {
    const db = this.db();
    const leave = await db.leaveRecord.findUnique({ where: { id }, include: { motivoAfastamento: true } });
    if (!leave) throw new NotFoundException('Afastamento não encontrado.');
    const retorno = new Date(dataRetorno);
    const updated = await db.leaveRecord.update({ where: { id }, data: { retorno } });

    const diasAfastado = Math.round((retorno.getTime() - leave.inicio.getTime()) / 86_400_000);
    if (diasAfastado >= 30) {
      await this.complianceEngine.registrarEvento({
        employeeId: leave.employeeId,
        tipoEvento: 'RETORNO_AFASTAMENTO',
        dataEvento: retorno,
        dadosAnteriores: { inicio: leave.inicio },
        dadosNovos: { retorno, diasAfastado },
      });
    }

    const estabilidadeAte = leave.motivoAfastamento?.geraEstabilidade ? addMonths(retorno, ESTABILIDADE_MESES) : null;
    return { ...this.mascarar(updated), estabilidadeAte };
  }
}
