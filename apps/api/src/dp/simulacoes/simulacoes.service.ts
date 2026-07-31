import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AVISO_SIMULACAO, calcularRescisao } from './calculo-rescisao';
import { SimularFeriasDto, SimularRescisaoDto } from './dto/simulacoes.dto';
import { computeFeriasStatus } from '../../rh/vacations/vacation-cycles.util';

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
        vacationRequests: {
          where: { status: 'APROVADA' },
          select: { inicio: true, fim: true, diasAbono: true },
        },
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

    const feriasStatus = computeFeriasStatus(
      employee.dataAdmissao,
      new Date(),
      employee.vacationRequests,
    );
    const resultado = calcularRescisao({
      salario: Number(employee.salario),
      dataAdmissao: employee.dataAdmissao,
      feriasSaldo: feriasStatus.saldoDisponivel,
      tipo: dto.tipo,
      dataPrevista,
      saldoFgtsEstimado: dto.saldoFgtsEstimado,
    });

    return { employee: { id: employee.id, nome: employee.nome }, ...resultado };
  }
}
