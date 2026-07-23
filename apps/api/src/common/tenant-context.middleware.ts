import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { requestContextStorage } from './request-context';
import { JwtPayload } from './jwt-payload';

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

/**
 * Verifies the auth cookie (if present) and, when valid, runs the rest of
 * the request inside an AsyncLocalStorage context carrying tenantId/userId —
 * this is what PrismaService.forCurrentTenant() and the audit log read from.
 * Requests with no/invalid token simply proceed with no context; routes that
 * require auth are rejected downstream by AuthGuard.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.['elos_token'];
    if (!token) return next();

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      req.user = payload;
      requestContextStorage.run(
        { tenantId: payload.tenantId, userId: payload.sub, userName: payload.name, role: payload.role },
        () => next(),
      );
    } catch {
      next();
    }
  }
}
