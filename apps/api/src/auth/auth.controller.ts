import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipLicenseCheck } from '../common/decorators/skip-license-check.decorator';
import type { JwtPayload } from '../common/jwt-payload';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
};

@SkipLicenseCheck()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register-tenant')
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.auth.registerTenant(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.ip ?? 'unknown');
  }

  @Post('verify-mfa')
  @HttpCode(200)
  async verifyMfa(@Body() dto: VerifyMfaDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.verifyMfa(dto);
    res.cookie('elos_token', result.accessToken, COOKIE_OPTIONS);
    return { user: result.user, tenant: result.tenant };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('elos_token');
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }
}
