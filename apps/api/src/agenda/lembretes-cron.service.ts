import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { hojeBrasiliaUtc } from './date-utils';

const UM_DIA_MS = 86_400_000;

@Injectable()
export class LembretesCronService {
  private readonly logger = new Logger(LembretesCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async enviarLembretesDoDia() {
    const hojeUtc = hojeBrasiliaUtc();
    const limite = new Date(hojeUtc.getTime() + 7 * UM_DIA_MS);
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    for (const t of tenants) {
      const db = this.prisma.forTenant(t.id);
      const pendentes = await db.agendaLembrete.findMany({
        where: { enviado: false, agendaItem: { deletedAt: null, data: { gte: hojeUtc, lte: limite } } },
        include: { agendaItem: true },
      });

      for (const lembrete of pendentes) {
        const diasParaAlvo = Math.round((lembrete.agendaItem.data.getTime() - hojeUtc.getTime()) / UM_DIA_MS);
        if (diasParaAlvo !== lembrete.antecedenciaDias) continue;

        await db.agendaNotificacao.create({
          data: {
            tenantId: t.id,
            userId: lembrete.userId,
            agendaItemId: lembrete.agendaItemId,
            titulo: `Lembrete: ${lembrete.agendaItem.descricao}`,
          },
        });

        if (lembrete.notificarEmail) {
          const user = await this.prisma.user.findUnique({ where: { id: lembrete.userId } });
          if (user) {
            const dataFormatada = lembrete.agendaItem.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            await this.email.send(user.email, 'Lembrete — Plataforma Elos', `<p>${lembrete.agendaItem.descricao}</p><p>Data: ${dataFormatada}</p>`);
          }
        }

        await db.agendaLembrete.update({ where: { id: lembrete.id }, data: { enviado: true } });
      }
    }

    this.logger.log('Varredura diária de lembretes concluída.');
  }
}
