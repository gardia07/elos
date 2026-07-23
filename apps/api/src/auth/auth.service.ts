import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from '../common/jwt-payload';

const DIACRITICS: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => DIACRITICS[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_BY_EMAIL = 5;
const MAX_FAILED_BY_IP = 20;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const slug = slugify(dto.companyName);
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Já existe uma empresa cadastrada com esse nome.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const trialPlan = await this.prisma.licensePlan.findUnique({ where: { code: 'trial' } });

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug,
        users: {
          create: {
            email: dto.email.toLowerCase(),
            passwordHash,
            name: dto.adminName,
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
    });

    // tenant_licenses is RLS-protected, so this write has to go through the
    // tenant-scoped client (there's no request context yet at this point in
    // the flow, hence forTenant(id) rather than forCurrentTenant()).
    if (trialPlan) {
      await this.prisma.forTenant(tenant.id).tenantLicense.create({
        data: {
          tenantId: tenant.id,
          planId: trialPlan.id,
          status: 'TRIAL',
          expiraEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maxUsuarios: trialPlan.maxUsuarios,
          maxColaboradores: trialPlan.maxColaboradores,
          modulos: trialPlan.modulos,
        },
      });
    }

    return { tenantSlug: tenant.slug };
  }

  /** Step 1: validate credentials, issue a short-lived MFA ticket + 6-digit code. */
  async login(dto: LoginDto, ip: string) {
    await this.assertLoginAllowed(dto.email.toLowerCase(), ip);

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (!tenant) {
      await this.recordLoginAttempt(dto.email, ip, false);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase() } },
    });
    if (!user) {
      await this.recordLoginAttempt(dto.email, ip, false);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      await this.recordLoginAttempt(dto.email, ip, false);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.recordLoginAttempt(dto.email, ip, true);

    const code = generateSixDigitCode();
    const mfaCodeHash = await bcrypt.hash(code, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaCodeHash, mfaCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });

    const loginTicket = this.jwt.sign({ sub: user.id, purpose: 'mfa' }, { expiresIn: '5m' });

    const sent = await this.email.send(
      user.email,
      'Seu código de acesso — Plataforma Elos',
      `<p>Seu código de verificação é:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Válido por 5 minutos.</p>`,
    );

    // Falls back to returning the code directly when no email provider is
    // configured (RESEND_API_KEY unset), so local/dev usage keeps working.
    return sent ? { loginTicket } : { loginTicket, devCode: code };
  }

  /** Step 2: verify the 6-digit code, issue the real access token as an httpOnly cookie. */
  async verifyMfa(dto: VerifyMfaDto) {
    let ticketPayload: { sub: string; purpose: string };
    try {
      ticketPayload = this.jwt.verify(dto.loginTicket);
    } catch {
      throw new UnauthorizedException('Sessão de login expirada, tente novamente.');
    }
    if (ticketPayload.purpose !== 'mfa') throw new UnauthorizedException('Ticket inválido.');

    const user = await this.prisma.user.findUnique({ where: { id: ticketPayload.sub } });
    if (!user || !user.mfaCodeHash || !user.mfaCodeExpiresAt || user.mfaCodeExpiresAt < new Date()) {
      throw new UnauthorizedException('Código expirado, tente novamente.');
    }

    const codeOk = await bcrypt.compare(dto.code, user.mfaCodeHash);
    if (!codeOk) throw new BadRequestException('Código inválido.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaCodeHash: null, mfaCodeExpiresAt: null },
    });

    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });

    const payload: JwtPayload = { sub: user.id, tenantId: user.tenantId, name: user.name, role: user.role };
    const accessToken = this.jwt.sign(payload, { expiresIn: '8h' });

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { slug: tenant.slug, name: tenant.name },
    };
  }

  /** Brute-force protection — checked before password comparison, across all tenants. */
  private async assertLoginAllowed(email: string, ip: string) {
    const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS);
    const [byEmail, byIp] = await Promise.all([
      this.prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
      this.prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
    ]);
    if (byEmail >= MAX_FAILED_BY_EMAIL || byIp >= MAX_FAILED_BY_IP) {
      throw new HttpException('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordLoginAttempt(email: string, ip: string, success: boolean) {
    await this.prisma.loginAttempt.create({ data: { email: email.toLowerCase(), ip, success } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Senha atual incorreta.');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  /** Always returns a generic success message, whether or not the account exists — avoids user enumeration. */
  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = { ok: true, message: 'Se o e-mail informado existir, enviamos um link de recuperação.' };

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (!tenant) return generic;

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase() } },
    });
    if (!user) return generic;

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });

    const resetUrl = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/redefinir-senha?token=${token}`;
    const sent = await this.email.send(
      user.email,
      'Redefinir senha — Plataforma Elos',
      `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Válido por 30 minutos. Se não foi você, ignore este e-mail.</p>`,
    );

    // Dev fallback mirrors the MFA code pattern: surface the link directly
    // when there's no email provider configured, instead of silently failing.
    return sent ? generic : { ...generic, devResetUrl: resetUrl };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new BadRequestException('Link de redefinição inválido ou expirado.');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { slug: tenant.slug, name: tenant.name },
    };
  }
}
