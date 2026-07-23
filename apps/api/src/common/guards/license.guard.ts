import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { LicenseService } from '../../license/license.service';
import { SKIP_LICENSE_CHECK_KEY } from '../decorators/skip-license-check.decorator';

/**
 * Registered globally (see app.module.ts). No-ops for unauthenticated
 * requests — AuthGuard is what rejects those, per-controller. Runs after
 * TenantContextMiddleware, so forCurrentTenant() is safe to use here.
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly license: LicenseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_LICENSE_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const license = await this.license.publicLicense(req.user.tenantId);
    if (license.blocked) {
      throw new HttpException({ message: license.message, license }, HttpStatus.PAYMENT_REQUIRED);
    }
    return true;
  }
}
