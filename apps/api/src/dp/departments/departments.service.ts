import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateDepartmentDto } from './dto/departments.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().department.findMany({ orderBy: { nome: 'asc' } });
  }

  create(dto: CreateDepartmentDto) {
    return this.db().department.create({ data: { ...dto, tenantId: getRequestContext().tenantId } });
  }
}
