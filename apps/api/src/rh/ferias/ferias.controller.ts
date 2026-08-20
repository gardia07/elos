import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeriasService } from './ferias.service';
import { CreateFaltaDto, ListarPeriodosQueryDto, ProgramarFeriasDto, ReprovarFracaoDto } from './dto/ferias.dto';

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('rh/ferias')
export class FeriasController {
  constructor(private readonly service: FeriasService) {}

  @Get('visao-geral')
  visaoGeral() {
    return this.service.visaoGeral();
  }

  @Get('periodos')
  listarPeriodos(@Query() query: ListarPeriodosQueryDto) {
    return this.service.listarPeriodos(query);
  }

  @Get('fracoes')
  listarFracoes(@Query() query: ListarPeriodosQueryDto) {
    const status = (query.statusFracao ?? 'PENDENTES') as 'PENDENTES' | 'APROVADAS' | 'EM_FERIAS';
    return this.service.listarFracoes(status, query);
  }

  @Get('colaboradores/:employeeId/historico')
  historico(@Param('employeeId') employeeId: string) {
    return this.service.historicoColaborador(employeeId);
  }

  @Get('colaboradores/:employeeId/faltas')
  listarFaltas(@Param('employeeId') employeeId: string) {
    return this.service.listarFaltas(employeeId);
  }

  @Post('colaboradores/:employeeId/faltas')
  criarFalta(@Param('employeeId') employeeId: string, @Body() dto: CreateFaltaDto) {
    return this.service.criarFalta(employeeId, dto);
  }

  @Delete('colaboradores/:employeeId/faltas/:faltaId')
  removerFalta(@Param('employeeId') employeeId: string, @Param('faltaId') faltaId: string) {
    return this.service.removerFalta(employeeId, faltaId);
  }

  @Get('colaboradores/:employeeId/saldo')
  saldoAtual(@Param('employeeId') employeeId: string) {
    return this.service.saldoAtual(employeeId);
  }

  @Post('colaboradores/:employeeId/programar')
  programar(@Param('employeeId') employeeId: string, @Body() dto: ProgramarFeriasDto) {
    return this.service.programar(employeeId, dto);
  }

  @Get('periodos/:periodoAquisitivoId/preview-alertas')
  previewAlertas(
    @Param('periodoAquisitivoId') periodoAquisitivoId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dias') dias?: string,
    @Query('diasAbono') diasAbono?: string,
    @Query('historico') historico?: string,
  ) {
    return this.service.previewAlertas(
      periodoAquisitivoId,
      dataInicio,
      dias ? Number(dias) : undefined,
      diasAbono ? Number(diasAbono) : undefined,
      historico === 'true',
    );
  }

  @Patch('fracoes/:id/aprovar')
  aprovar(@Param('id') id: string) {
    return this.service.aprovar(id);
  }

  @Patch('fracoes/:id/reprovar')
  reprovar(@Param('id') id: string, @Body() dto: ReprovarFracaoDto) {
    return this.service.reprovar(id, dto);
  }

  @Delete('fracoes/:id')
  cancelar(@Param('id') id: string) {
    return this.service.cancelar(id);
  }
}
