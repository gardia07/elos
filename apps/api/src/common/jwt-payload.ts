export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  name: string;
  role: string;
}
