import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/request-context';
import { CreateJobGradeDto } from './dto/job-grades.dto';

@Injectable()
export class JobGradesService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma.forCurrentTenant();
  }

  list() {
    return this.db().jobGrade.findMany({ orderBy: { cargo: 'asc' } });
  }

  create(dto: CreateJobGradeDto) {
    return this.db().jobGrade.create({ data: { ...dto, tenantId: getRequestContext().tenantId } });
  }
}
