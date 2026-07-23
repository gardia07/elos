import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { AcknowledgePolicyDto, CreatePolicyDto, UpdatePolicyDto } from './dto/policies.dto';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  async list() {
    const db = this.db();
    const policies = await db.compliancePolicy.findMany({ orderBy: { titulo: 'asc' } });
    const totalAtivos = await db.employee.count({ where: { status: 'ATIVO' } });
    return Promise.all(
      policies.map(async (p) => {
        const aceites = await db.policyAcknowledgment.count({ where: { policyId: p.id } });
        return { ...p, aceites, totalAtivos, cobertura: totalAtivos ? Math.round((100 * aceites) / totalAtivos) : 0 };
      }),
    );
  }

  async get(id: string) {
    const db = this.db();
    const policy = await this.mustFind(id);
    const acknowledgments = await db.policyAcknowledgment.findMany({
      where: { policyId: id },
      include: { employee: { select: { nome: true, departamento: true } } },
      orderBy: { aceitoEm: 'desc' },
    });
    return { ...policy, acknowledgments };
  }

  async create(dto: CreatePolicyDto) {
    const { tenantId } = getRequestContext();
    const created = await this.db().compliancePolicy.create({ data: { tenantId, ...dto } });
    await this.audit.log('compliance_policy', created.id, 'criada', { titulo: dto.titulo });
    return created;
  }

  async update(id: string, dto: UpdatePolicyDto) {
    const db = this.db();
    const policy = await this.mustFind(id);
    const conteudoMudou = dto.conteudo !== undefined && dto.conteudo !== policy.conteudo;

    const updated = await db.compliancePolicy.update({
      where: { id },
      data: { ...dto, versao: conteudoMudou ? policy.versao + 1 : policy.versao },
    });

    if (conteudoMudou) {
      // A new version requires re-acknowledgment from everyone.
      await db.policyAcknowledgment.deleteMany({ where: { policyId: id } });
      await this.audit.log('compliance_policy', id, 'nova_versao', { versao: updated.versao });
    } else {
      await this.audit.log('compliance_policy', id, 'atualizada', dto as Record<string, unknown>);
    }
    return updated;
  }

  async acknowledge(id: string, dto: AcknowledgePolicyDto) {
    await this.mustFind(id);
    const ack = await this.db().policyAcknowledgment.upsert({
      where: { policyId_employeeId: { policyId: id, employeeId: dto.employeeId } },
      create: { policyId: id, employeeId: dto.employeeId },
      update: {},
    });
    await this.audit.log('compliance_policy', id, 'aceite_registrado', { employeeId: dto.employeeId });
    return ack;
  }

  private async mustFind(id: string) {
    const policy = await this.db().compliancePolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Política não encontrada.');
    return policy;
  }
}
