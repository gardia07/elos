import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { DocumentsService } from '../rh/documents/documents.service';
import { VacationsService } from '../rh/vacations/vacations.service';
import { RequestPortalVacationDto } from './dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly vacations: VacationsService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  /** Users has no RLS (see enable_rls migration notes); scope explicitly by the current session's userId. */
  private async myEmployeeId(): Promise<string> {
    const { userId } = getRequestContext();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.employeeId) {
      throw new ForbiddenException('Sua conta não está vinculada a um cadastro de colaborador.');
    }
    return user.employeeId;
  }

  async me() {
    const employeeId = await this.myEmployeeId();
    return this.db().employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: {
        nome: true,
        cargo: true,
        departamento: true,
        filial: true,
        matricula: true,
        dataAdmissao: true,
        status: true,
        email: true,
        telefone: true,
        feriasSaldo: true,
        feriasVencimento: true,
      },
    });
  }

  async documentos() {
    const employeeId = await this.myEmployeeId();
    return this.documents.listForEmployee(employeeId);
  }

  async historico() {
    const employeeId = await this.myEmployeeId();
    return this.db().historicoEvento.findMany({ where: { employeeId }, orderBy: { data: 'desc' } });
  }

  async ferias() {
    const employeeId = await this.myEmployeeId();
    return this.db().vacationRequest.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
  }

  async requestFerias(dto: RequestPortalVacationDto) {
    const employeeId = await this.myEmployeeId();
    return this.vacations.createRequest({ employeeId, inicio: dto.inicio, fim: dto.fim });
  }

  async holerites() {
    const employeeId = await this.myEmployeeId();
    return this.db().payslipItem.findMany({
      where: { employeeId },
      include: { payrollRun: { select: { competencia: true, status: true } } },
      orderBy: { payrollRun: { competencia: 'desc' } },
    });
  }
}
