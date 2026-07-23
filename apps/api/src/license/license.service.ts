import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLicenseDto } from './dto/update-license.dto';

const STATUS_LABEL: Record<string, string> = {
  TRIAL: 'Em teste',
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
};

const TRIAL_DAYS = 30;

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  plans() {
    return this.prisma.licensePlan.findMany({ where: { ativo: true }, orderBy: { maxUsuarios: 'asc' } });
  }

  /** Self-heals tenants created before licensing existed by giving them a trial. */
  private async ensureLicense(tenantId: string) {
    const db = this.db();
    const existing = await db.tenantLicense.findUnique({ where: { tenantId } });
    if (existing) return existing;

    const trialPlan = await this.prisma.licensePlan.findUnique({ where: { code: 'trial' } });
    if (!trialPlan) return null;

    return db.tenantLicense.create({
      data: {
        tenantId,
        planId: trialPlan.id,
        status: 'TRIAL',
        expiraEm: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        maxUsuarios: trialPlan.maxUsuarios,
        maxColaboradores: trialPlan.maxColaboradores,
        modulos: trialPlan.modulos,
      },
    });
  }

  async publicLicense(tenantId: string) {
    const db = this.db();
    const [license, usuarios, colaboradores] = await Promise.all([
      this.ensureLicense(tenantId),
      // users has no RLS policy (see enable_rls migration notes — auth flows
      // need cross-tenant lookups), so this count must filter explicitly.
      db.user.count({ where: { tenantId } }),
      db.employee.count({ where: { status: 'ATIVO' } }),
    ]);

    if (!license) {
      return {
        configured: false,
        blocked: false,
        status: 'TRIAL',
        statusLabel: 'Não configurada',
        message: 'Licença ainda não configurada.',
        planCode: null,
        planName: null,
        expiraEm: null,
        maxUsuarios: 0,
        maxColaboradores: 0,
        usuarios,
        colaboradores,
        modulos: [] as string[],
      };
    }

    const plan = await this.prisma.licensePlan.findUnique({ where: { id: license.planId } });
    const usuariosExcedido = license.maxUsuarios > 0 && usuarios > license.maxUsuarios;
    const colaboradoresExcedido = license.maxColaboradores > 0 && colaboradores > license.maxColaboradores;
    const statusBloqueado = ['SUSPENSA', 'CANCELADA', 'EXPIRADA'].includes(license.status);
    const expirada = license.expiraEm != null && license.expiraEm.getTime() < Date.now();
    const blocked = statusBloqueado || expirada || usuariosExcedido || colaboradoresExcedido;

    let message = 'Licença válida.';
    if (expirada) message = 'Licença expirada.';
    else if (statusBloqueado) message = `Licença ${STATUS_LABEL[license.status].toLowerCase()}.`;
    else if (usuariosExcedido) message = 'Limite de usuários da licença excedido.';
    else if (colaboradoresExcedido) message = 'Limite de colaboradores da licença excedido.';

    return {
      configured: true,
      blocked,
      status: license.status,
      statusLabel: STATUS_LABEL[license.status] ?? license.status,
      message,
      planCode: plan?.code ?? null,
      planName: plan?.nome ?? null,
      expiraEm: license.expiraEm,
      maxUsuarios: license.maxUsuarios,
      maxColaboradores: license.maxColaboradores,
      usuarios,
      colaboradores,
      modulos: license.modulos,
    };
  }

  async update(tenantId: string, dto: UpdateLicenseDto) {
    const db = this.db();
    await this.ensureLicense(tenantId);

    let plan: Awaited<ReturnType<typeof this.prisma.licensePlan.findUnique>> = null;
    if (dto.planCode) {
      plan = await this.prisma.licensePlan.findUnique({ where: { code: dto.planCode } });
      if (!plan) throw new NotFoundException('Plano comercial não encontrado.');
    }

    await db.tenantLicense.update({
      where: { tenantId },
      data: {
        ...(plan ? { planId: plan.id } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.expiraEm ? { expiraEm: new Date(dto.expiraEm) } : {}),
        ...(dto.maxUsuarios != null ? { maxUsuarios: dto.maxUsuarios } : plan ? { maxUsuarios: plan.maxUsuarios } : {}),
        ...(dto.maxColaboradores != null
          ? { maxColaboradores: dto.maxColaboradores }
          : plan
            ? { maxColaboradores: plan.maxColaboradores }
            : {}),
        ...(plan ? { modulos: plan.modulos } : {}),
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
      },
    });

    return this.publicLicense(tenantId);
  }
}
