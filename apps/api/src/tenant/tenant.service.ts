import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { getRequestContext } from '../common/request-context';
import { CreateUserDto, UpdateTenantDto, UpdateUserRoleDto } from './dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const { tenantId } = getRequestContext();
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  async update(dto: UpdateTenantDto) {
    const { tenantId } = getRequestContext();
    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
  }

  async listUsers() {
    const { tenantId } = getRequestContext();
    // users has no RLS policy (auth flows need cross-tenant lookups) — must
    // filter explicitly, see prisma/migrations/*_enable_rls notes.
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async createUser(dto: CreateUserDto) {
    const { tenantId } = getRequestContext();
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email.toLowerCase() } },
    });
    if (existing) throw new ConflictException('Já existe um usuário com esse e-mail nesta empresa.');

    if (dto.employeeId) {
      const employee = await this.prisma.forTenant(tenantId).employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) throw new NotFoundException('Colaborador não encontrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.role ?? 'COLABORADOR',
        employeeId: dto.employeeId,
      },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto) {
    const { tenantId } = getRequestContext();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.tenantId !== tenantId) throw new NotFoundException('Usuário não encontrado.');
    return this.prisma.user.update({ where: { id: userId }, data: { role: dto.role } });
  }
}
