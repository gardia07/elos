import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PORTAL_SAFE_KEY } from '../decorators/portal-safe.decorator';

/**
 * Registrado globalmente (ver app.module.ts). O papel COLABORADOR só pode
 * acessar rotas marcadas explicitamente com @PortalSafe() -- allowlist, não
 * blocklist: um controller novo que ninguém lembre de restringir fica
 * bloqueado por padrão, em vez de vazar dado da empresa por omissão.
 *
 * No-ops para requisições não autenticadas (AuthGuard, por controller, é
 * quem rejeita essas) e para qualquer papel que não seja COLABORADOR --
 * RH/gestor/admin continuam com acesso pleno ao hub interno E ao próprio
 * Portal (autoatendimento não é exclusivo de quem tem o papel COLABORADOR).
 */
@Injectable()
export class ColaboradorScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user || req.user.role !== 'COLABORADOR') return true;

    const portalSafe = this.reflector.getAllAndOverride<boolean>(PORTAL_SAFE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!portalSafe) {
      throw new ForbiddenException('Seu acesso é restrito ao Portal do Colaborador.');
    }
    return true;
  }
}
