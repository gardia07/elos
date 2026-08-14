import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateTenantDto } from '../tenant/dto/tenant.dto';
import { CLT_DOCUMENT_REQUIREMENTS } from '../rh/documents/clt-requirements';
import { DEFAULT_DOCUMENT_TEMPLATES } from '../rh/document-templates/default-templates';
import { JwtPayload } from '../common/jwt-payload';

// Sem 0/O/1/I/L — caracteres fáceis de confundir quando o código é digitado à mão no login.
const COMPANY_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const COMPANY_CODE_LENGTH = 6;

function generateCompanyCode(): string {
  let code = '';
  for (let i = 0; i < COMPANY_CODE_LENGTH; i++) {
    code += COMPANY_CODE_CHARS[Math.floor(Math.random() * COMPANY_CODE_CHARS.length)];
  }
  return code;
}

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_BY_EMAIL = 5;
const MAX_FAILED_BY_IP = 20;
const MAX_MFA_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
export const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

  private async generateUniqueCompanyCode(): Promise<string> {
    let code = generateCompanyCode();
    while (await this.prisma.tenant.findUnique({ where: { slug: code } })) {
      code = generateCompanyCode();
    }
    return code;
  }

  async registerTenant(dto: RegisterTenantDto) {
    const slug = await this.generateUniqueCompanyCode();

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

    await this.provisionNewTenant(tenant.id, trialPlan);

    await this.email.send(
      dto.email,
      'Bem-vindo à Plataforma Elos',
      `<p>Olá, ${dto.adminName}!</p><p>Sua empresa <strong>${dto.companyName}</strong> foi cadastrada com sucesso na Plataforma Elos.</p><p>Para entrar, use o código da empresa: <strong>${slug}</strong></p>`,
    );

    return { tenantSlug: tenant.slug };
  }

  /** Shared by registerTenant (public signup) and createCompany (adding a company from within an existing account). */
  private async provisionNewTenant(
    tenantId: string,
    trialPlan: { id: string; maxUsuarios: number; maxColaboradores: number; modulos: string[] } | null,
  ) {
    // tenant_licenses is RLS-protected, so this write has to go through the
    // tenant-scoped client (there's no request context yet at this point in
    // the flow, hence forTenant(id) rather than forCurrentTenant()).
    if (trialPlan) {
      await this.prisma.forTenant(tenantId).tenantLicense.create({
        data: {
          tenantId,
          planId: trialPlan.id,
          status: 'TRIAL',
          expiraEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maxUsuarios: trialPlan.maxUsuarios,
          maxColaboradores: trialPlan.maxColaboradores,
          modulos: trialPlan.modulos,
        },
      });
    }

    // Same RLS-scoping caveat as tenantLicense above.
    await this.prisma.forTenant(tenantId).documentRequirement.createMany({
      data: CLT_DOCUMENT_REQUIREMENTS.map((r) => ({
        tenantId,
        nome: r.nome,
        categoria: r.categoria,
        obrigatorio: true,
        sistema: true,
      })),
    });

    await this.prisma.forTenant(tenantId).documentTemplate.createMany({
      data: DEFAULT_DOCUMENT_TEMPLATES.map((d) => ({
        tenantId,
        tipo: d.tipo,
        nome: d.nome,
        corpo: d.corpo,
        aplicaTipos: d.aplicaTipos,
        sistema: true,
      })),
    });
  }

  /** Lists every company (tenant) the current user's e-mail has an account in, for the "minhas empresas" screen. */
  async listCompanies(userId: string) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // users has no RLS policy (auth flows need cross-tenant lookups by e-mail).
    const accounts = await this.prisma.user.findMany({
      where: { email: me.email },
      select: { tenantId: true, tenant: { select: { id: true, slug: true, name: true, nomeFantasia: true, logoUrl: true } } },
    });

    return accounts.map((a) => ({ ...a.tenant, current: a.tenantId === me.tenantId }));
  }

  /** Loads full profile data for a company the user's e-mail has an account in (not necessarily the active one). */
  async getCompany(userId: string, tenantId: string) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const account = await this.prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: me.email } } });
    if (!account) throw new NotFoundException('Empresa não encontrada.');

    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  /** Updates full profile data for a company the user's e-mail has an ADMIN account in. */
  async updateCompany(userId: string, tenantId: string, dto: UpdateTenantDto) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const account = await this.prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: me.email } } });
    if (!account) throw new NotFoundException('Empresa não encontrada.');
    if (account.role !== 'ADMIN') throw new ForbiddenException('Apenas administradores podem editar esta empresa.');

    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
  }

  /** Adds a new, independent company under the same e-mail/password, so the user can switch between them without a second signup. */
  async createCompany(userId: string, dto: CreateCompanyDto) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const slug = await this.generateUniqueCompanyCode();

    const trialPlan = await this.prisma.licensePlan.findUnique({ where: { code: 'trial' } });

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug,
        users: {
          create: {
            email: me.email,
            passwordHash: me.passwordHash,
            name: me.name,
            role: 'ADMIN',
          },
        },
      },
    });

    await this.provisionNewTenant(tenant.id, trialPlan);

    return { tenantSlug: tenant.slug, name: tenant.name };
  }

  /**
   * Step 1: validate credentials. If the request carries a token for a
   * device this user already verified via MFA (and it hasn't expired),
   * skips straight to issuing the session — same "remember this browser"
   * pattern as Google/etc. Otherwise issues a short-lived MFA ticket +
   * 6-digit code as before.
   */
  async login(dto: LoginDto, ip: string, deviceToken?: string) {
    await this.assertLoginAllowed(dto.email.toLowerCase(), ip);

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug.trim().toUpperCase() }  });
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

    if (deviceToken && (await this.isDeviceTrusted(user.id, deviceToken))) {
      return this.issueSession(user);
    }

    const code = generateSixDigitCode();
    const mfaCodeHash = await bcrypt.hash(code, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaCodeHash, mfaCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000), mfaAttempts: 0 },
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

  private async isDeviceTrusted(userId: string, deviceToken: string): Promise<boolean> {
    const device = await this.prisma.trustedDevice.findUnique({ where: { tokenHash: hashToken(deviceToken) } });
    return !!device && device.userId === userId && device.expiresAt > new Date();
  }

  /** Issues the real access token (httpOnly cookie) — shared by verifyMfa and the trusted-device skip path in login(). */
  private async issueSession(user: { id: string; tenantId: string; name: string; email: string; role: string }) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });

    const payload: JwtPayload = { sub: user.id, tenantId: user.tenantId, name: user.name, role: user.role };
    const accessToken = this.jwt.sign(payload, { expiresIn: '8h' });

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { slug: tenant.slug, name: tenant.name, nomeFantasia: tenant.nomeFantasia, logoUrl: tenant.logoUrl },
    };
  }

  /** Step 2: verify the 6-digit code, issue the real access token, and mark this device as trusted going forward. */
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

    // Limita tentativas de força bruta contra o código de 6 dígitos dentro
    // da janela de 5 minutos do ticket — sem isso, o TTL sozinho não impede
    // um script de testar as 1 milhão de combinações nesse tempo.
    if (user.mfaAttempts >= MAX_MFA_ATTEMPTS) {
      throw new HttpException('Muitas tentativas. Solicite um novo código.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const codeOk = await bcrypt.compare(dto.code, user.mfaCodeHash);
    if (!codeOk) {
      await this.prisma.user.update({ where: { id: user.id }, data: { mfaAttempts: { increment: 1 } } });
      throw new BadRequestException('Código inválido.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaCodeHash: null, mfaCodeExpiresAt: null, mfaAttempts: 0 },
    });

    const deviceToken = randomBytes(32).toString('hex');
    await this.prisma.trustedDevice.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(deviceToken),
        expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
      },
    });

    const session = await this.issueSession(user);
    return { ...session, deviceToken };
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
    // Uma senha comprometida pode ter sido usada num navegador atacante já
    // marcado como confiável — trocar a senha revoga esse "atalho" de MFA.
    await this.prisma.trustedDevice.deleteMany({ where: { userId } });
    return { ok: true };
  }

  /** Always returns a generic success message, whether or not the account exists — avoids user enumeration. */
  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = { ok: true, message: 'Se o e-mail informado existir, enviamos um link de recuperação.' };

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug.trim().toUpperCase() }  });
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
    await this.prisma.trustedDevice.deleteMany({ where: { userId: record.userId } });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { slug: tenant.slug, name: tenant.name, nomeFantasia: tenant.nomeFantasia, logoUrl: tenant.logoUrl },
    };
  }

  /** Lets a user with an account in more than one tenant (same e-mail) jump between them without re-entering a password. */
  async switchTenant(userId: string, dto: SwitchTenantDto) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const targetTenant = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug.trim().toUpperCase() }  });
    if (!targetTenant) throw new BadRequestException('Empresa não encontrada.');

    const targetUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: targetTenant.id, email: me.email } },
    });
    if (!targetUser) throw new UnauthorizedException('Você não tem uma conta nessa empresa.');

    const payload: JwtPayload = { sub: targetUser.id, tenantId: targetTenant.id, name: targetUser.name, role: targetUser.role };
    const accessToken = this.jwt.sign(payload, { expiresIn: '8h' });

    return {
      accessToken,
      user: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetUser.role },
      tenant: { slug: targetTenant.slug, name: targetTenant.name, nomeFantasia: targetTenant.nomeFantasia, logoUrl: targetTenant.logoUrl },
    };
  }
}
