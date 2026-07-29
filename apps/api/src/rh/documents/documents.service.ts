import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import {
  deleteDocumento,
  downloadDocumento,
  uploadDocumento,
} from '../../common/blob-storage';
import {
  CreateDocumentRequirementDto,
  SetDocumentStatusDto,
  UpdateDocumentRequirementDto,
} from './dto/documents.dto';

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
const MANDATORY_FIELDS: {
  key: keyof EmployeeMandatoryFields;
  label: string;
}[] = [
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

function appliesToEmployee(
  requirement: RequirementLike,
  employee: EmployeeLike,
): boolean {
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
    return this.db().documentRequirement.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
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
    await this.audit.log('document_requirement', requirement.id, 'criado', {
      nome: dto.nome,
    });
    return requirement;
  }

  async updateRequirement(id: string, dto: UpdateDocumentRequirementDto) {
    await this.mustFindRequirement(id);
    const requirement = await this.db().documentRequirement.update({
      where: { id },
      data: dto,
    });
    await this.audit.log(
      'document_requirement',
      id,
      'atualizado',
      dto as Record<string, unknown>,
    );
    return requirement;
  }

  async deleteRequirement(id: string) {
    const requirement = await this.mustFindRequirement(id);
    if (requirement.sistema) {
      throw new ForbiddenException(
        'Documentos obrigatórios por lei não podem ser excluídos. Marque "não se aplica" no colaborador quando não for o caso.',
      );
    }
    await this.db().documentRequirement.delete({ where: { id } });
    await this.audit.log('document_requirement', id, 'excluido', {
      nome: requirement.nome,
    });
  }

  private async syncForEmployee(employeeId: string) {
    const db = this.db();
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const requirements = await db.documentRequirement.findMany({
      where: { ativo: true },
    });
    const applicable = requirements.filter((r) =>
      appliesToEmployee(r, employee),
    );

    // One batched insert instead of an upsert per requirement — the update
    // branch was always a no-op ({}), so this only ever needed "create the
    // rows that don't exist yet", which createMany does in a single round
    // trip. The per-row loop was the main cost of computing compliance for a
    // whole tenant (N employees × ~11 sequential awaits each).
    if (applicable.length > 0) {
      await db.employeeDocumentRequirement.createMany({
        data: applicable.map((r) => ({ employeeId, requirementId: r.id })),
        skipDuplicates: true,
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
        await db.employeeDocumentRequirement.update({
          where: { id: row.id },
          data: { status: 'EXPIRED' },
        });
        row.status = 'EXPIRED';
      }
    }

    const { compliance, missingFields } = await this.recalcCompliance(
      employeeId,
      rows,
      employee,
    );
    return { compliance, missingFields, documentos: rows };
  }

  async setStatus(
    employeeId: string,
    requirementId: string,
    dto: SetDocumentStatusDto,
  ) {
    const db = this.db();
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const requirement = await db.documentRequirement.findUnique({
      where: { id: requirementId },
    });
    if (!requirement) throw new NotFoundException('Requisito não encontrado.');

    // Attaching a file always marks the item compliant — the file itself is
    // the evidence of compliance, overriding whatever status was sent. A
    // plain status change (no arquivoNome) leaves any previously attached
    // file untouched.
    const status = dto.arquivoNome ? 'COMPLIANT' : dto.status;
    const expiraEm =
      status === 'COMPLIANT' && requirement.validadeDias
        ? new Date(Date.now() + requirement.validadeDias * 24 * 60 * 60 * 1000)
        : null;
    const arquivoFields = dto.arquivoNome
      ? { arquivoNome: dto.arquivoNome, anexadoEm: new Date() }
      : {};

    await db.employeeDocumentRequirement.upsert({
      where: { employeeId_requirementId: { employeeId, requirementId } },
      create: {
        employeeId,
        requirementId,
        status,
        expiraEm,
        observacao: dto.observacao,
        ...arquivoFields,
      },
      update: {
        status,
        expiraEm,
        observacao: dto.observacao,
        ...arquivoFields,
      },
    });

    const rows = await db.employeeDocumentRequirement.findMany({
      where: { employeeId },
      include: { requirement: true },
    });
    const { compliance, missingFields } = await this.recalcCompliance(
      employeeId,
      rows,
      employee,
    );
    await this.audit.log(
      'employee',
      employeeId,
      'documento_status_atualizado',
      { requirementId, status: dto.status },
    );
    return { compliance, missingFields };
  }

  /** Anexa o arquivo de verdade pro requisito — marca COMPLIANT, igual ao setStatus com arquivoNome, mas com o binário armazenado. */
  async uploadRequirementFile(
    employeeId: string,
    requirementId: string,
    file: Express.Multer.File,
  ) {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const requirement = await db.documentRequirement.findUnique({
      where: { id: requirementId },
    });
    if (!requirement) throw new NotFoundException('Requisito não encontrado.');

    const existing = await db.employeeDocumentRequirement.findUnique({
      where: { employeeId_requirementId: { employeeId, requirementId } },
    });
    await deleteDocumento(existing?.blobPathname);

    const uploaded = await uploadDocumento(
      `colaboradores/${tenantId}/${employeeId}/requisitos`,
      file,
    );
    const expiraEm = requirement.validadeDias
      ? new Date(Date.now() + requirement.validadeDias * 24 * 60 * 60 * 1000)
      : null;

    await db.employeeDocumentRequirement.upsert({
      where: { employeeId_requirementId: { employeeId, requirementId } },
      create: {
        employeeId,
        requirementId,
        status: 'COMPLIANT',
        expiraEm,
        arquivoNome: file.originalname,
        blobPathname: uploaded.pathname,
        contentType: uploaded.contentType,
        anexadoEm: new Date(),
      },
      update: {
        status: 'COMPLIANT',
        expiraEm,
        arquivoNome: file.originalname,
        blobPathname: uploaded.pathname,
        contentType: uploaded.contentType,
        anexadoEm: new Date(),
      },
    });

    const rows = await db.employeeDocumentRequirement.findMany({
      where: { employeeId },
      include: { requirement: true },
    });
    const { compliance, missingFields } = await this.recalcCompliance(
      employeeId,
      rows,
      employee,
    );
    await this.audit.log('employee', employeeId, 'documento_anexado', {
      requirementId,
      arquivo: file.originalname,
    });
    return { compliance, missingFields };
  }

  async getRequirementArquivo(employeeId: string, requirementId: string) {
    const row = await this.db().employeeDocumentRequirement.findUnique({
      where: { employeeId_requirementId: { employeeId, requirementId } },
    });
    if (!row) throw new NotFoundException('Documento não encontrado.');
    const arquivo = row.blobPathname
      ? await downloadDocumento(row.blobPathname)
      : null;
    if (!arquivo)
      throw new NotFoundException('Arquivo não encontrado no armazenamento.');
    return { ...arquivo, nome: row.arquivoNome ?? 'documento' };
  }

  private async recalcCompliance(
    employeeId: string,
    rows: { status: string; requirement: { obrigatorio: boolean } }[],
    employee: EmployeeMandatoryFields,
  ) {
    // NAO_SE_APLICA is excluded entirely (neither counted as missing nor compliant).
    const required = rows.filter(
      (r) => r.requirement.obrigatorio && r.status !== 'NAO_SE_APLICA',
    );
    const missingFields = missingMandatoryFields(employee);

    const totalItems = required.length + MANDATORY_FIELDS.length;
    const compliantItems =
      required.filter((r) => r.status === 'COMPLIANT').length +
      (MANDATORY_FIELDS.length - missingFields.length);
    const compliance = totalItems
      ? Math.round((100 * compliantItems) / totalItems)
      : 100;

    await this.db().employee.update({
      where: { id: employeeId },
      data: { conformidadeDocumental: compliance },
    });
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

    // Independent per-employee, so run concurrently instead of one at a time
    // — sequential awaits here is what made this scale linearly (and badly)
    // with headcount.
    const results = await Promise.all(
      employees.map(async (employee) => {
        const { applicable } = await this.syncForEmployee(employee.id);
        const rows = await db.employeeDocumentRequirement.findMany({
          where: {
            employeeId: employee.id,
            requirementId: { in: applicable.map((r) => r.id) },
          },
          include: { requirement: true },
        });
        const required = rows.filter(
          (r) => r.requirement.obrigatorio && r.status !== 'NAO_SE_APLICA',
        );
        const missingFields = missingMandatoryFields(employee);
        const { compliance } = await this.recalcCompliance(
          employee.id,
          rows,
          employee,
        );
        return {
          employeeId: employee.id,
          compliance,
          requiredCount: required.length + MANDATORY_FIELDS.length,
          compliantCount:
            required.filter((r) => r.status === 'COMPLIANT').length +
            (MANDATORY_FIELDS.length - missingFields.length),
        };
      }),
    );

    const byEmployee: Record<string, number> = {};
    let totalItems = 0;
    let totalCompliant = 0;
    for (const r of results) {
      byEmployee[r.employeeId] = r.compliance;
      totalItems += r.requiredCount;
      totalCompliant += r.compliantCount;
    }

    const overall = totalItems
      ? Math.round((100 * totalCompliant) / totalItems)
      : 100;
    return { overall, byEmployee };
  }

  /** Tenant-wide aggregation across every active employee — for Ferramentas > Documentos. */
  async listAllEmployees() {
    const db = this.db();
    const employees = await db.employee.findMany({
      where: { status: 'ATIVO' },
    });

    await Promise.all(
      employees.map((employee) => this.syncForEmployee(employee.id)),
    );

    const rows = await db.employeeDocumentRequirement.findMany({
      include: { requirement: true, employee: { select: { nome: true } } },
      orderBy: [{ status: 'asc' }, { requirement: { nome: 'asc' } }],
    });

    const today = new Date();
    const withEffectiveStatus = rows.map((r) =>
      r.status === 'COMPLIANT' && r.expiraEm && r.expiraEm < today
        ? { ...r, status: 'EXPIRED' as const }
        : r,
    );

    const counts = {
      MISSING: 0,
      PENDING: 0,
      COMPLIANT: 0,
      EXPIRED: 0,
      REJECTED: 0,
      NAO_SE_APLICA: 0,
    };
    for (const r of withEffectiveStatus) counts[r.status] += 1;

    return { counts, documentos: withEffectiveStatus };
  }

  private async mustFindRequirement(id: string) {
    const requirement = await this.db().documentRequirement.findUnique({
      where: { id },
    });
    if (!requirement) throw new NotFoundException('Requisito não encontrado.');
    return requirement;
  }
}
