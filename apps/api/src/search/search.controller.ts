import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) return { colaboradores: [] };

    const db = this.prisma.forCurrentTenant();
    const colaboradores = await db.employee.findMany({
      where: {
        OR: [
          { nome: { contains: query, mode: 'insensitive' } },
          { matricula: { contains: query, mode: 'insensitive' } },
          { cargo: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, nome: true, matricula: true, cargo: true, departamento: true },
      take: 8,
      orderBy: { nome: 'asc' },
    });

    return { colaboradores };
  }
}
