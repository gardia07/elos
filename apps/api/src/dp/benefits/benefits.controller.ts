import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { BenefitsService } from './benefits.service';
import {
  AddDependentePlanoSaudeDto,
  CalcularApuracaoDto,
  CreateAdesaoAcademiaDto,
  CreateAdesaoBeneficioFixoDto,
  CreateAdesaoPlanoSaudeDto,
  CreateAdesaoValeDiarioDto,
  CreateBeneficioTipoDto,
  CreateConvenioAcademiaDto,
  CreateFaixaEtariaDto,
  CreateFeriadoDto,
  CreatePlanoSaudeDto,
  SetCoparticipacaoDto,
} from './dto/benefits.dto';

@UseGuards(AuthGuard)
@Controller('dp/benefits')
export class BenefitsController {
  constructor(private readonly service: BenefitsService) {}

  @Get('tipos')
  listTipos() {
    return this.service.listTipos();
  }

  @Post('tipos')
  createTipo(@Body() dto: CreateBeneficioTipoDto) {
    return this.service.createTipo(dto);
  }

  @Post('tipos/:id/coparticipacao')
  setCoparticipacao(@Param('id') id: string, @Body() dto: SetCoparticipacaoDto) {
    return this.service.setCoparticipacao(id, dto);
  }

  @Get('convenios-academia')
  listConveniosAcademia() {
    return this.service.listConveniosAcademia();
  }

  @Post('convenios-academia')
  createConvenioAcademia(@Body() dto: CreateConvenioAcademiaDto) {
    return this.service.createConvenioAcademia(dto);
  }

  @Delete('convenios-academia/:id')
  removeConvenioAcademia(@Param('id') id: string) {
    return this.service.removeConvenioAcademia(id);
  }

  @Get('planos-saude')
  listPlanosSaude() {
    return this.service.listPlanosSaude();
  }

  @Post('planos-saude')
  createPlanoSaude(@Body() dto: CreatePlanoSaudeDto) {
    return this.service.createPlanoSaude(dto);
  }

  @Delete('planos-saude/:id')
  removePlanoSaude(@Param('id') id: string) {
    return this.service.removePlanoSaude(id);
  }

  @Post('planos-saude/:id/faixas')
  addFaixaEtaria(@Param('id') id: string, @Body() dto: CreateFaixaEtariaDto) {
    return this.service.addFaixaEtaria(id, dto);
  }

  @Delete('planos-saude/:id/faixas/:faixaId')
  removeFaixaEtaria(@Param('id') id: string, @Param('faixaId') faixaId: string) {
    return this.service.removeFaixaEtaria(id, faixaId);
  }

  @Get('feriados')
  listFeriados() {
    return this.service.listFeriados();
  }

  @Post('feriados')
  createFeriado(@Body() dto: CreateFeriadoDto) {
    return this.service.createFeriado(dto);
  }

  @Delete('feriados/:id')
  removeFeriado(@Param('id') id: string) {
    return this.service.removeFeriado(id);
  }

  @Get('employees/:employeeId')
  resumoEmployee(@Param('employeeId') employeeId: string) {
    return this.service.resumoEmployee(employeeId);
  }

  @Post('employees/:employeeId/vale-diario')
  createAdesaoValeDiario(@Param('employeeId') employeeId: string, @Body() dto: CreateAdesaoValeDiarioDto) {
    return this.service.createAdesaoValeDiario(employeeId, dto);
  }

  @Delete('employees/:employeeId/vale-diario/:adesaoId')
  cancelAdesaoValeDiario(@Param('employeeId') employeeId: string, @Param('adesaoId') adesaoId: string) {
    return this.service.cancelAdesaoValeDiario(employeeId, adesaoId);
  }

  @Post('employees/:employeeId/academia')
  createAdesaoAcademia(@Param('employeeId') employeeId: string, @Body() dto: CreateAdesaoAcademiaDto) {
    return this.service.createAdesaoAcademia(employeeId, dto);
  }

  @Delete('employees/:employeeId/academia/:adesaoId')
  cancelAdesaoAcademia(@Param('employeeId') employeeId: string, @Param('adesaoId') adesaoId: string) {
    return this.service.cancelAdesaoAcademia(employeeId, adesaoId);
  }

  @Post('employees/:employeeId/plano-saude')
  createAdesaoPlanoSaude(@Param('employeeId') employeeId: string, @Body() dto: CreateAdesaoPlanoSaudeDto) {
    return this.service.createAdesaoPlanoSaude(employeeId, dto);
  }

  @Delete('employees/:employeeId/plano-saude/:adesaoId')
  cancelAdesaoPlanoSaude(@Param('employeeId') employeeId: string, @Param('adesaoId') adesaoId: string) {
    return this.service.cancelAdesaoPlanoSaude(employeeId, adesaoId);
  }

  @Post('employees/:employeeId/plano-saude/:adesaoId/dependentes')
  addDependentePlanoSaude(
    @Param('employeeId') employeeId: string,
    @Param('adesaoId') adesaoId: string,
    @Body() dto: AddDependentePlanoSaudeDto,
  ) {
    return this.service.addDependentePlanoSaude(employeeId, adesaoId, dto);
  }

  @Delete('employees/:employeeId/plano-saude/:adesaoId/dependentes/:dependenteId')
  removeDependentePlanoSaude(
    @Param('employeeId') employeeId: string,
    @Param('adesaoId') adesaoId: string,
    @Param('dependenteId') dependenteId: string,
  ) {
    return this.service.removeDependentePlanoSaude(employeeId, adesaoId, dependenteId);
  }

  @Post('employees/:employeeId/outros')
  createAdesaoBeneficioFixo(@Param('employeeId') employeeId: string, @Body() dto: CreateAdesaoBeneficioFixoDto) {
    return this.service.createAdesaoBeneficioFixo(employeeId, dto);
  }

  @Delete('employees/:employeeId/outros/:adesaoId')
  cancelAdesaoBeneficioFixo(@Param('employeeId') employeeId: string, @Param('adesaoId') adesaoId: string) {
    return this.service.cancelAdesaoBeneficioFixo(employeeId, adesaoId);
  }

  @Get('apuracao')
  listApuracao(@Query('competencia') competencia: string) {
    return this.service.listApuracao(competencia);
  }

  @Post('apuracao/calcular')
  calcularApuracao(@Body() dto: CalcularApuracaoDto) {
    return this.service.calcularApuracao(dto);
  }
}
