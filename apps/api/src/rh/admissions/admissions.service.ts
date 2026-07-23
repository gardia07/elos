import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import { nextMatricula } from '../employees/matricula.util';
import { SetChecklistConfigDto, ToggleDocDto } from './dto/admissions.dto';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().admission.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const admission = await this.db().admission.findUnique({ where: { id } });
    if (!admission) throw new NotFoundException('Admissão não encontrada.');
    const checklist = await this.db().checklistItemDef.findMany({
      where: { scope: 'ADMISSAO', filial: admission.filial, ativo: true },
      orderBy: { ordem: 'asc' },
    });
    const auditLog = await this.audit.listForEntity('admission', id);
    return { ...admission, checklist, auditLog };
  }

  private async checklistComplete(filial: string, docs: Record<string, boolean>): Promise<boolean> {
    const activeDefs = await this.db().checklistItemDef.findMany({
      where: { scope: 'ADMISSAO', filial, ativo: true },
    });
    if (activeDefs.length === 0) return true;
    return activeDefs.every((d) => docs[d.key] === true);
  }

  async toggleDoc(id: string, dto: ToggleDocDto) {
    const admission = await this.mustFind(id);
    const docs = { ...(admission.docs as Record<string, boolean>), [dto.key]: dto.checked };

    const data: Record<string, unknown> = { docs };
    if (admission.status !== 'EFETIVADO') {
      const complete = await this.checklistComplete(admission.filial, docs);
      data.status = complete ? 'PRONTO_PARA_EFETIVAR' : 'PENDENTE_DOCUMENTO';
    }

    const updated = await this.db().admission.update({ where: { id }, data });
    await this.audit.log('admission', id, dto.checked ? 'documento_recebido' : 'documento_desmarcado', { key: dto.key });
    return updated;
  }

  async sendEsocial(id: string) {
    const admission = await this.mustFind(id);
    const complete = await this.checklistComplete(admission.filial, admission.docs as Record<string, boolean>);
    if (!complete) throw new BadRequestException('Checklist de documentos incompleto.');

    const updated = await this.db().admission.update({ where: { id }, data: { esocialSent: true } });
    await this.audit.log('admission', id, 'esocial_s2200_enviado');
    return updated;
  }

  async generateContract(id: string) {
    const admission = await this.mustFind(id);
    if (!admission.esocialSent) throw new BadRequestException('Envie o evento eSocial S-2200 antes de gerar o contrato.');

    const updated = await this.db().admission.update({ where: { id }, data: { contratoGerado: true } });
    await this.audit.log('admission', id, 'contrato_gerado');
    return updated;
  }

  async signContract(id: string) {
    const admission = await this.mustFind(id);
    if (!admission.contratoGerado) throw new BadRequestException('Gere o contrato antes de assiná-lo.');
    if (admission.contratoAssinado) throw new BadRequestException('Contrato já assinado.');

    const updated = await this.db().admission.update({ where: { id }, data: { contratoAssinado: true } });
    await this.audit.log('admission', id, 'contrato_assinado');
    // Cross-hub integration point (out of scope for this build): auto-assign
    // onboarding training tracks in Compliance once contratoAssinado flips.
    return updated;
  }

  async efetivar(id: string) {
    const admission = await this.mustFind(id);
    if (admission.status === 'EFETIVADO') throw new BadRequestException('Admissão já efetivada.');

    const complete = await this.checklistComplete(admission.filial, admission.docs as Record<string, boolean>);
    if (!complete) throw new BadRequestException('Checklist de documentos incompleto.');
    if (!admission.esocialSent) throw new BadRequestException('Evento eSocial S-2200 não enviado.');
    if (!admission.contratoAssinado) throw new BadRequestException('Contrato ainda não assinado.');

    const db = this.db();
    const matricula = await nextMatricula(db);
    const employee = await db.employee.create({
      data: {
        tenantId: getRequestContext().tenantId,
        matricula,
        nome: admission.nome,
        cargo: admission.cargo,
        departamento: admission.filial,
        filial: admission.filial,
        status: 'ATIVO',
        dataAdmissao: admission.dataInicio,
        salario: admission.salario,
        tipoContrato: 'CLT',
        feriasSaldo: 30,
        feriasVencimento: addMonths(admission.dataInicio, 12),
        historico: {
          create: [{ evento: 'Admissão efetivada', categoria: 'Admissão', autor: 'Sistema' }],
        },
      },
    });

    const updated = await db.admission.update({
      where: { id },
      data: { status: 'EFETIVADO', employeeId: employee.id },
    });
    await this.audit.log('admission', id, 'efetivada', { employeeId: employee.id });
    return updated;
  }

  async getChecklistConfig(filial: string) {
    return this.db().checklistItemDef.findMany({
      where: { scope: 'ADMISSAO', filial },
      orderBy: { ordem: 'asc' },
    });
  }

  async setChecklistConfig(dto: SetChecklistConfigDto) {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const results: Awaited<ReturnType<typeof db.checklistItemDef.upsert>>[] = [];
    for (const [ordem, item] of dto.items.entries()) {
      results.push(
        await db.checklistItemDef.upsert({
          where: { tenantId_scope_filial_key: { tenantId, scope: 'ADMISSAO', filial: dto.filial, key: item.key } },
          create: { tenantId, scope: 'ADMISSAO', filial: dto.filial, key: item.key, nome: item.nome, ativo: item.ativo, ordem },
          update: { nome: item.nome, ativo: item.ativo, ordem },
        }),
      );
    }
    return results;
  }

  private async mustFind(id: string) {
    const admission = await this.db().admission.findUnique({ where: { id } });
    if (!admission) throw new NotFoundException('Admissão não encontrada.');
    return admission;
  }
}
