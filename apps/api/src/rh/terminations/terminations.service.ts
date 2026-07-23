import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { getRequestContext } from '../../common/request-context';
import {
  CreateTerminationDto,
  ExitInterviewDto,
  SetTerminationChecklistDto,
  ToggleTerminationDocDto,
  UpdateTerminationStatusDto,
} from './dto/terminations.dto';

const TIPO_LABEL: Record<string, string> = {
  SEM_JUSTA_CAUSA: 'Sem justa causa',
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  ACORDO: 'Acordo (art. 484-A)',
};

function formatBr(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

@Injectable()
export class TerminationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().termination.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const termination = await this.mustFind(id);
    const checklist = await this.listChecklistDefs();
    const auditLog = await this.audit.listForEntity('termination', id);
    const readiness = await this.checklistReadiness(termination.docs as Record<string, boolean>);
    return { ...termination, checklist, auditLog, readiness };
  }

  async create(dto: CreateTerminationDto) {
    const db = this.db();
    const employee = await db.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Colaborador não encontrado.');

    const checklistDefs = await this.listChecklistDefs();
    const docs = Object.fromEntries(checklistDefs.filter((d) => d.ativo).map((d) => [d.key, false]));

    const termination = await db.termination.create({
      data: {
        tenantId: getRequestContext().tenantId,
        employeeId: dto.employeeId,
        nome: employee.nome,
        cargo: employee.cargo,
        data: new Date(dto.data),
        tipo: dto.tipo,
        motivo: dto.motivo,
        docs,
      },
    });

    await db.employee.update({ where: { id: dto.employeeId }, data: { status: 'INATIVO' } });
    await db.historicoEvento.create({
      data: {
        employeeId: dto.employeeId,
        evento: `Desligamento iniciado (${TIPO_LABEL[dto.tipo]})`,
        categoria: 'Desligamento',
        autor: getRequestContext().userName,
      },
    });
    await this.audit.log('termination', termination.id, 'criado', { tipo: dto.tipo });

    return termination;
  }

  private async listChecklistDefs() {
    return this.db().terminationChecklistDef.findMany({ orderBy: { ordem: 'asc' } });
  }

  /**
   * Only items marked `bloqueante` gate conclusion — informational items can
   * stay pending without blocking the desligamento (mirrors the per-item
   * blocking flag from the legacy termination_checklist model).
   */
  private async checklistReadiness(docs: Record<string, boolean>) {
    const activeDefs = await this.db().terminationChecklistDef.findMany({ where: { ativo: true } });
    const pendingBlocking = activeDefs.filter((d) => d.bloqueante && docs[d.key] !== true).map((d) => d.nome);
    const pendingInfo = activeDefs.filter((d) => !d.bloqueante && docs[d.key] !== true).map((d) => d.nome);
    return { ready: pendingBlocking.length === 0, pendingBlocking, pendingInfo };
  }

  async toggleDoc(id: string, dto: ToggleTerminationDocDto) {
    const termination = await this.mustFind(id);
    const docs = { ...(termination.docs as Record<string, boolean>), [dto.key]: dto.checked };
    const updated = await this.db().termination.update({ where: { id }, data: { docs } });
    await this.audit.log('termination', id, dto.checked ? 'documento_recebido' : 'documento_desmarcado', { key: dto.key });
    return updated;
  }

  async sendEsocial(id: string) {
    await this.mustFind(id);
    const updated = await this.db().termination.update({ where: { id }, data: { esocialSent: true } });
    await this.audit.log('termination', id, 'esocial_s2299_enviado');
    return updated;
  }

  async generateTermo(id: string) {
    const t = await this.mustFind(id);
    if (!t.termoGerado) {
      await this.db().termination.update({ where: { id }, data: { termoGerado: true } });
      await this.audit.log('termination', id, 'termo_rescisao_gerado');
    }
    const texto = `Pelo presente termo, formaliza-se a rescisão do contrato de trabalho de ${t.nome}, ocupante do cargo de ${t.cargo}, com data de desligamento em ${formatBr(t.data)}, na modalidade "${TIPO_LABEL[t.tipo]}".`;
    return { texto };
  }

  async generateCarta(id: string) {
    const t = await this.mustFind(id);
    if (!t.cartaGerada) {
      await this.db().termination.update({ where: { id }, data: { cartaGerada: true } });
      await this.audit.log('termination', id, 'carta_referencia_gerada');
    }
    const texto = `A empresa atesta que ${t.nome} exerceu a função de ${t.cargo} em nossa empresa até ${formatBr(t.data)}.`;
    return { texto };
  }

  async updateStatus(id: string, dto: UpdateTerminationStatusDto) {
    const t = await this.mustFind(id);
    if (dto.status === 'CONCLUIDO') {
      const readiness = await this.checklistReadiness(t.docs as Record<string, boolean>);
      if (!readiness.ready) {
        throw new BadRequestException(`Conclusão bloqueada: ${readiness.pendingBlocking.join(', ')}`);
      }
    }
    const updated = await this.db().termination.update({ where: { id }, data: { status: dto.status } });
    await this.audit.log('termination', id, dto.status === 'CONCLUIDO' ? 'concluido' : 'reaberto');
    return updated;
  }

  async updateExitInterview(id: string, dto: ExitInterviewDto) {
    await this.mustFind(id);
    return this.db().termination.update({ where: { id }, data: dto });
  }

  getChecklistConfig() {
    return this.listChecklistDefs();
  }

  async setChecklistConfig(dto: SetTerminationChecklistDto) {
    const db = this.db();
    const { tenantId } = getRequestContext();
    const results: Awaited<ReturnType<typeof db.terminationChecklistDef.upsert>>[] = [];
    for (const [ordem, item] of dto.items.entries()) {
      results.push(
        await db.terminationChecklistDef.upsert({
          where: { tenantId_key: { tenantId, key: item.key } },
          create: { tenantId, key: item.key, nome: item.nome, ativo: item.ativo, bloqueante: item.bloqueante ?? true, ordem },
          update: { nome: item.nome, ativo: item.ativo, bloqueante: item.bloqueante ?? true, ordem },
        }),
      );
    }
    return results;
  }

  private async mustFind(id: string) {
    const termination = await this.db().termination.findUnique({ where: { id } });
    if (!termination) throw new NotFoundException('Desligamento não encontrado.');
    return termination;
  }
}
