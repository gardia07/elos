import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { DocumentsService } from '../rh/documents/documents.service';
import { FeriasService } from '../rh/ferias/ferias.service';
import { RequestPortalVacationDto } from './dto/portal.dto';
import { ComplianceEngineService } from '../compliance-engine/compliance-engine.service';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly feriasService: FeriasService,
    private readonly complianceEngine: ComplianceEngineService,
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
    const [employee, feriasStatus] = await Promise.all([
      this.db().employee.findUniqueOrThrow({
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
        },
      }),
      this.feriasService.saldoAtual(employeeId),
    ]);
    return {
      ...employee,
      feriasSaldo: feriasStatus.saldoDisponivel,
      feriasVencimento: feriasStatus.proximoVencimento,
    };
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
    const { periodos } = await this.feriasService.historicoColaborador(employeeId);
    return periodos
      .flatMap((p) =>
        p.fracoes.map((f) => ({
          id: f.id,
          inicio: f.dataInicio,
          fim: f.dataFim,
          dias: f.dias,
          diasAbono: f.diasAbono,
          status: f.statusEfetivo,
          createdAt: f.createdAt,
        })),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async requestFerias(dto: RequestPortalVacationDto) {
    const employeeId = await this.myEmployeeId();
    return this.feriasService.programarPortal(employeeId, dto);
  }

  async pendencias() {
    const employeeId = await this.myEmployeeId();
    return this.complianceEngine.listarPendencias({ employeeId });
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
