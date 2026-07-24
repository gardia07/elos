import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { CreateDocumentRequirementDto, SetDocumentStatusDto, UpdateDocumentRequirementDto } from './dto/documents.dto';

interface EmployeeLike {
  status: string;
  tipoContrato: string;
  departamento: string;
  cargo: string;
}

interface EmployeeMandatoryFields {
  cpf: string | null;
  rg: string | null;
  pis: string | null;
  ctps: string | null;
  dataNascimento: Date | null;
  endereco: string | null;
}

// Core CLT/eSocial identification data — always counted against compliance,
// even for a tenant with no DocumentRequirement configured yet, so a
// freshly-created employee with nothing filled in doesn't read as "100%
// conforme" just because there's nothing to compare against.
const MANDATORY_FIELDS: { key: keyof EmployeeMandatoryFields; label: string }[] = [
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'pis', label: 'PIS' },
  { key: 'ctps', label: 'CTPS' },
  { key: 'dataNascimento', label: 'Data de nascimento' },
  { key: 'endereco', label: 'Endereço' },
];

function missingMandatoryFields(employee: EmployeeMandatoryFields): string[] {
  return MANDATORY_FIELDS.filter((f) => !employee[f.key]).map((f) => f.label);
}

interface RequirementLike {
  ativo: boolean;
  aplicaStatus: string[];
  aplicaTipoContrato: string[];
  aplicaDepartamento: string[];
  aplicaCargo: string[];
}

// Empty list = applies to everyone; otherwise the employee's value must be
// in the list. Mirrors the conditional-applicability engine from the legacy
// document_requirements table (applies_statuses/employment_types/etc).
function matches(list: string[], value: string): boolean {
  return list.length === 0 || list.includes(value);
}

function appliesToEmployee(requirement: RequirementLike, employee: EmployeeLike): boolean {
  if (!requirement.ativo) return false;
  return (
    matches(requirement.aplicaStatus, employee.status) &&
    matches(requirement.aplicaTipoContrato, employee.tipoContrato) &&
    matches(requirement.aplicaDepartamento, employee.departamento) &&
    matches(requirement.aplicaCargo, employee.cargo)
  );
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  listRequirements() {
    return this.db().documentRequirement.findMany({ orderBy: [{ categoria: 'asc' }, { nome: 'asc' }] });
  }

  async createRequirement(dto: CreateDocumentRequirementDto) {
    const { tenantId } = getRequestContext();
    const requirement = await this.db().documentRequirement.create({
      data: {
        tenantId,
        nome: dto.nome,
        categoria: dto.categoria,
        obrigatorio: dto.obrigatorio ?? true,
        validadeDias: dto.validadeDias,
        aplicaStatus: dto.aplicaStatus ?? [],
        aplicaTipoContrato: dto.aplicaTipoContrato ?? [],
        aplicaDepartamento: dto.aplicaDepartamento ?? [],
        aplicaCargo: dto.aplicaCargo ?? [],
      },
    });
    await this.audit.log('document_requirement', requirement.id, 'criado', { nome: dto.nome });
    return requirement;
  }

  async updateRequirement(id: string, dto: UpdateDocumentRequirementDto) {
    await this.mustFindRequirement(id);
    const requirement = await this.db().documentRequirement.update({ where: { id }, data: dto });
    await this.audit.log('document_requirement', id, 'atualizado', dto as Record<string, unknown>);
    return requirement;
  }

  private async syncForEmployee(employeeId: string) {
    const db = this.db();
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const requirements = await db.documentRequirement.findMany({ where: { ativo: true } });
    const applicable = requirements.filter((r) => appliesToEmployee(r, employee));

    for (const requirement of applicable) {
      await db.employeeDocumentRequirement.upsert({
        where: { employeeId_requirementId: { employeeId, requirementId: requirement.id } },
        create: { employeeId, requirementId: requirement.id },
        update: {},
      });
    }

    return { employee, applicable };
  }

  async listForEmployee(employeeId: string) {
    const { employee, applicable } = await this.syncForEmployee(employeeId);
    const db = this.db();

    const rows = await db.employeeDocumentRequirement.findMany({
      where: { employeeId, requirementId: { in: applicable.map((r) => r.id) } },
      include: { requirement: true },
      orderBy: { requirement: { nome: 'asc' } },
    });

    const today = new Date();
    for (const row of rows) {
      if (row.status === 'COMPLIANT' && row.expiraEm && row.expiraEm < today) {
        await db.employeeDocumentRequirement.update({ where: { id: row.id }, data: { status: 'EXPIRED' } });
        row.status = 'EXPIRED';
      }
    }

    const { compliance, missingFields } = await this.recalcCompliance(employeeId, rows, employee);
    return { compliance, missingFields, documentos: rows };
  }

  async setStatus(employeeId: string, requirementId: string, dto: SetDocumentStatusDto) {
    const db = this.db();
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const requirement = await db.documentRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement) throw new NotFoundException('Requisito não encontrado.');

    const expiraEm = dto.status === 'COMPLIANT' && requirement.validadeDias
      ? new Date(Date.now() + requirement.validadeDias * 24 * 60 * 60 * 1000)
      : null;

    await db.employeeDocumentRequirement.upsert({
      where: { employeeId_requirementId: { employeeId, requirementId } },
      create: { employeeId, requirementId, status: dto.status, expiraEm, observacao: dto.observacao },
      update: { status: dto.status, expiraEm, observacao: dto.observacao },
    });

    const rows = await db.employeeDocumentRequirement.findMany({ where: { employeeId }, include: { requirement: true } });
    const { compliance, missingFields } = await this.recalcCompliance(employeeId, rows, employee);
    await this.audit.log('employee', employeeId, 'documento_status_atualizado', { requirementId, status: dto.status });
    return { compliance, missingFields };
  }

  private async recalcCompliance(
    employeeId: string,
    rows: { status: string; requirement: { obrigatorio: boolean } }[],
    employee: EmployeeMandatoryFields,
  ) {
    const required = rows.filter((r) => r.requirement.obrigatorio);
    const missingFields = missingMandatoryFields(employee);

    const totalItems = required.length + MANDATORY_FIELDS.length;
    const compliantItems = required.filter((r) => r.status === 'COMPLIANT').length + (MANDATORY_FIELDS.length - missingFields.length);
    const compliance = totalItems ? Math.round((100 * compliantItems) / totalItems) : 100;

    await this.db().employee.update({ where: { id: employeeId }, data: { conformidadeDocumental: compliance } });
    return { compliance, missingFields };
  }

  /**
   * Recomputes document compliance for a set of employees (defaults to every
   * active employee) in one pass — used by the employees list, employee
   * profile, and the dashboard-wide KPI so they never show a stale
   * conformidadeDocumental left over from before someone last opened the
   * Documentos tab.
   */
  async complianceOverview(employeeIds?: string[]) {
    const db = this.db();
    const employees = await db.employee.findMany({
      where: employeeIds ? { id: { in: employeeIds } } : { status: 'ATIVO' },
    });

    const byEmployee: Record<string, number> = {};
    let totalItems = 0;
    let totalCompliant = 0;

    for (const employee of employees) {
      const { applicable } = await this.syncForEmployee(employee.id);
      const rows = await db.employeeDocumentRequirement.findMany({
        where: { employeeId: employee.id, requirementId: { in: applicable.map((r) => r.id) } },
        include: { requirement: true },
      });
      const required = rows.filter((r) => r.requirement.obrigatorio);
      const missingFields = missingMandatoryFields(employee);
      totalItems += required.length + MANDATORY_FIELDS.length;
      totalCompliant += required.filter((r) => r.status === 'COMPLIANT').length + (MANDATORY_FIELDS.length - missingFields.length);
      byEmployee[employee.id] = (await this.recalcCompliance(employee.id, rows, employee)).compliance;
    }

    const overall = totalItems ? Math.round((100 * totalCompliant) / totalItems) : 100;
    return { overall, byEmployee };
  }

  /** Tenant-wide aggregation across every active employee — for Ferramentas > Documentos. */
  async listAllEmployees() {
    const db = this.db();
    const employees = await db.employee.findMany({ where: { status: 'ATIVO' } });

    for (const employee of employees) {
      await this.syncForEmployee(employee.id);
    }

    const rows = await db.employeeDocumentRequirement.findMany({
      include: { requirement: true, employee: { select: { nome: true } } },
      orderBy: [{ status: 'asc' }, { requirement: { nome: 'asc' } }],
    });

    const today = new Date();
    const withEffectiveStatus = rows.map((r) =>
      r.status === 'COMPLIANT' && r.expiraEm && r.expiraEm < today ? { ...r, status: 'EXPIRED' as const } : r,
    );

    const counts = { MISSING: 0, PENDING: 0, COMPLIANT: 0, EXPIRED: 0, REJECTED: 0 };
    for (const r of withEffectiveStatus) counts[r.status] += 1;

    return { counts, documentos: withEffectiveStatus };
  }

  private async mustFindRequirement(id: string) {
    const requirement = await this.db().documentRequirement.findUnique({ where: { id } });
    if (!requirement) throw new NotFoundException('Requisito não encontrado.');
    return requirement;
  }
}
