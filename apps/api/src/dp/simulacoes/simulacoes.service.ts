import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AVISO_INDENIZADO_FRACAO_POR_TIPO,
  FGTS_ALIQUOTA,
  MULTA_FGTS_POR_TIPO,
  anosCompletos,
  diasAvisoPrevio,
  mesesCompletos,
} from './constantes-trabalhistas';
import { SimularFeriasDto, SimularRescisaoDto } from './dto/simulacoes.dto';

const AVISO_SIMULACAO =
  'Simulação estimada — não substitui o cálculo oficial da contabilidade.';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class SimulacoesService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async simularFerias(dto: SimularFeriasDto) {
    const employee = await this.db().employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, nome: true, salario: true },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const salario = Number(employee.salario);
    const valorDiaria = salario / 30;
    const abonoDias = dto.abonoDias ?? 0;

    const valorFerias = valorDiaria * dto.dias;
    const tercoConstitucional = valorFerias / 3;
    const valorAbono = valorDiaria * abonoDias;
    const tercoAbono = valorAbono / 3;

    return {
      employee: { id: employee.id, nome: employee.nome },
      parametros: { dias: dto.dias, abonoDias },
      valorDiaria: round2(valorDiaria),
      valorFerias: round2(valorFerias),
      tercoConstitucional: round2(tercoConstitucional),
      valorAbono: round2(valorAbono),
      tercoAbono: round2(tercoAbono),
      totalBruto: round2(
        valorFerias + tercoConstitucional + valorAbono + tercoAbono,
      ),
      aviso: AVISO_SIMULACAO,
    };
  }

  async simularRescisao(dto: SimularRescisaoDto) {
    const employee = await this.db().employee.findUnique({
      where: { id: dto.employeeId },
      select: {
        id: true,
        nome: true,
        salario: true,
        dataAdmissao: true,
        feriasSaldo: true,
      },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const dataPrevista = new Date(dto.dataPrevista);
    if (Number.isNaN(dataPrevista.getTime()))
      throw new BadRequestException('dataPrevista inválida.');
    if (dataPrevista < employee.dataAdmissao) {
      throw new BadRequestException(
        'dataPrevista não pode ser anterior à admissão.',
      );
    }

    const salario = Number(employee.salario);
    const valorDiaria = salario / 30;
    const tipo = dto.tipo;

    const anos = anosCompletos(employee.dataAdmissao, dataPrevista);
    const mesesTotais = mesesCompletos(employee.dataAdmissao, dataPrevista);

    // Saldo de salário: dias trabalhados no mês da rescisão.
    const saldoSalario = round2(valorDiaria * dataPrevista.getDate());

    // Aviso prévio indenizado: integral sem justa causa, metade no acordo, zero no pedido de demissão.
    const diasAviso = diasAvisoPrevio(anos);
    const avisoIndenizado = round2(
      valorDiaria * diasAviso * AVISO_INDENIZADO_FRACAO_POR_TIPO[tipo],
    );

    // 13º proporcional: meses completos trabalhados desde janeiro do ano da rescisão (mês com 15+ dias conta como completo).
    const inicioAno = new Date(dataPrevista.getFullYear(), 0, 1);
    const mesesNoAno = Math.min(
      12,
      mesesCompletos(inicioAno, dataPrevista) + 1,
    );
    const decimoTerceiroProporcional = round2((salario / 12) * mesesNoAno);

    // Férias a indenizar: usa o saldo de dias já rastreado pelo cadastro do colaborador (Employee.feriasSaldo),
    // que já reflete vencidas + proporcionais descontado do que foi gozado — evita recalcular em paralelo e divergir do módulo de férias.
    const diasFerias = employee.feriasSaldo;
    const valorFerias = round2(valorDiaria * diasFerias);
    const tercoFerias = round2(valorFerias / 3);

    // Multa do FGTS: usa o saldo informado pelo usuário, ou uma estimativa grosseira de 8% do salário por mês trabalhado
    // (não considera saques, variações salariais ao longo do tempo nem outros depósitos — por isso é só um ponto de partida).
    const saldoFgts =
      dto.saldoFgtsEstimado ?? round2(salario * FGTS_ALIQUOTA * mesesTotais);
    const multaFgts = round2(saldoFgts * MULTA_FGTS_POR_TIPO[tipo]);

    const totalBruto = round2(
      saldoSalario +
        avisoIndenizado +
        decimoTerceiroProporcional +
        valorFerias +
        tercoFerias +
        multaFgts,
    );

    return {
      employee: { id: employee.id, nome: employee.nome },
      parametros: { tipo, dataPrevista: dto.dataPrevista, anosCompletos: anos },
      saldoSalario,
      avisoPrevio: { dias: diasAviso, valorIndenizado: avisoIndenizado },
      decimoTerceiroProporcional,
      ferias: {
        dias: diasFerias,
        valor: valorFerias,
        tercoConstitucional: tercoFerias,
      },
      fgts: {
        saldoConsiderado: saldoFgts,
        saldoInformadoPeloUsuario: dto.saldoFgtsEstimado != null,
        percentualMulta: MULTA_FGTS_POR_TIPO[tipo],
        valorMulta: multaFgts,
      },
      totalBruto,
      aviso: AVISO_SIMULACAO,
    };
  }
}
