import { SetMetadata } from '@nestjs/common';

export const PORTAL_SAFE_KEY = 'portalSafe';

/** Marca um controller/rota como seguro para o papel COLABORADOR (só dado do próprio colaborador, nunca da empresa). Ver ColaboradorScopeGuard. */
export const PortalSafe = () => SetMetadata(PORTAL_SAFE_KEY, true);
