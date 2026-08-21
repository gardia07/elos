import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { getRequestContext } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceEngineService } from './compliance-engine.service';
import { RegistrarEventoDto, UpdateRegraConformidadeDto } from './dto/compliance-engine.dto';

@UseGuards(AuthGuard)
@Controller('compliance-engine')
export class ComplianceEngineController {
  constructor(
    private readonly service: ComplianceEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('eventos')
  registrarEvento(@Body() dto: RegistrarEventoDto) {
    const { userId } = getRequestContext();
    return this.service.registrarEvento({
      ...dto,
      dataEvento: dto.dataEvento ? new Date(dto.dataEvento) : undefined,
      usuarioResponsavelId: userId,
    });
  }

  @Get('pendencias')
  listarPendencias(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('bloqueantes') bloqueantes?: string,
    @Query('requerAssinaturaColaborador') requerAssinaturaColaborador?: string,
  ) {
    return this.service.listarPendencias({
      employeeId,
      status,
      bloqueantes: bloqueantes === 'true' ? true : undefined,
      requerAssinaturaColaborador: requerAssinaturaColaborador === undefined ? undefined : requerAssinaturaColaborador === 'true',
    });
  }

  @Patch('pendencias/:id/resolver')
  resolverPendencia(@Param('id') id: string) {
    const { userId } = getRequestContext();
    return this.service.resolverPendencia(id, { responsavelId: userId });
  }

  @Patch('pendencias/:id/descartar')
  descartarPendencia(@Param('id') id: string) {
    const { userId } = getRequestContext();
    return this.service.descartarPendencia(id, userId);
  }

  @Get('colaboradores-irregulares')
  colaboradoresIrregulares() {
    return this.service.colaboradoresIrregulares();
  }

  @Get('indice/colaborador/:employeeId')
  indiceColaborador(@Param('employeeId') employeeId: string) {
    return this.service.indiceConformidade(employeeId);
  }

  @Get('indice/setor')
  indicePorSetor() {
    return this.service.indicePorSetor();
  }

  @Get('indice/geral')
  indiceGeral() {
    return this.service.indiceGeral();
  }

  /** Base de conhecimento (tipos de documento + regras) -- só quem administra a conta configura, sem precisar de deploy. */
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Get('tipos-documento')
  tiposDocumento() {
    return this.prisma.forCurrentTenant().tipoDocumento.findMany({ orderBy: { nome: 'asc' } });
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Get('regras')
  regras() {
    return this.prisma.forCurrentTenant().regraConformidade.findMany({
      include: { documentoExigido: true },
      orderBy: [{ tipoEventoGatilho: 'asc' }],
    });
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Patch('regras/:id')
  updateRegra(@Param('id') id: string, @Body() dto: UpdateRegraConformidadeDto) {
    return this.prisma.forCurrentTenant().regraConformidade.update({ where: { id }, data: dto });
  }
}
