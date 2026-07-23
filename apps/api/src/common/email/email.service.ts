import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;

  private getClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) return null;
    if (!this.client) this.client = new Resend(process.env.RESEND_API_KEY);
    return this.client;
  }

  /** Returns true if actually sent, false if RESEND_API_KEY isn't configured (dev mode). */
  async send(to: string, subject: string, html: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      this.logger.warn(`RESEND_API_KEY não configurada — e-mail para ${to} não foi enviado ("${subject}").`);
      return false;
    }
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM ?? 'Plataforma Elos <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    if (error) {
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${error.message}`);
      return false;
    }
    return true;
  }
}
