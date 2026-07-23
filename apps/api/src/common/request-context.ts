import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  tenantId: string;
  userId: string;
  userName: string;
  role: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error('Request context is not set — this code path must run within an authenticated request.');
  }
  return ctx;
}

export function tryGetRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
