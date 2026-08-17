import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { MetasService } from './metas.service';
import { HabitosService } from './habitos.service';
import { FinancasService } from './financas.service';
import { HumorService } from './humor.service';
import { CicloService } from './ciclo.service';
import { PesoMedidaService } from './peso-medida.service';
import { RodaDaVidaService } from './roda-da-vida.service';
import { RevisaoMensalService } from './revisao-mensal.service';
import { MelhorEuPossivelService } from './melhor-eu-possivel.service';
import { IkigaiService } from './ikigai.service';
import { SwotPessoalService } from './swot-pessoal.service';
import {
  CreateCategoriaFinanceiraDto,
  CreateCicloDto,
  CreateHabitoDto,
  CreateMetaDto,
  SetHumorDto,
  SetIkigaiDto,
  SetLancamentoDto,
  SetMelhorEuPossivelDto,
  SetPesoMedidaDto,
  SetRevisaoMensalDto,
  SetRodaDaVidaDto,
  SetSwotPessoalDto,
  ToggleHabitoDto,
  UpdateCategoriaFinanceiraDto,
  UpdateCicloDto,
  UpdateHabitoDto,
  UpdateMetaDto,
} from './dto/planner.dto';

/** Todo o módulo é dado pessoal — só AuthGuard (qualquer usuário autenticado), nunca RolesGuard: RH/admin não tem endpoint pra ver o planner de outra pessoa. */
@UseGuards(AuthGuard)
@Controller('planner')
export class PlannerController {
  constructor(
    private readonly metas: MetasService,
    private readonly habitos: HabitosService,
    private readonly financas: FinancasService,
    private readonly humor: HumorService,
    private readonly ciclo: CicloService,
    private readonly pesoMedida: PesoMedidaService,
    private readonly rodaDaVida: RodaDaVidaService,
    private readonly revisaoMensal: RevisaoMensalService,
    private readonly melhorEuPossivel: MelhorEuPossivelService,
    private readonly ikigai: IkigaiService,
    private readonly swotPessoal: SwotPessoalService,
  ) {}

  // ── Metas ────────────────────────────────────────────────────

  @Get('metas')
  listMetas(@Query('ano') ano: string) {
    return this.metas.list(Number(ano));
  }

  @Post('metas')
  createMeta(@Body() dto: CreateMetaDto) {
    return this.metas.create(dto);
  }

  @Patch('metas/:id')
  updateMeta(@Param('id') id: string, @Body() dto: UpdateMetaDto) {
    return this.metas.update(id, dto);
  }

  @Delete('metas/:id')
  deleteMeta(@Param('id') id: string) {
    return this.metas.delete(id);
  }

  // ── Hábitos ──────────────────────────────────────────────────

  @Get('habitos')
  listHabitos(@Query('ano') ano: string) {
    return this.habitos.list(Number(ano));
  }

  @Post('habitos')
  createHabito(@Body() dto: CreateHabitoDto) {
    return this.habitos.create(dto);
  }

  @Patch('habitos/:id')
  updateHabito(@Param('id') id: string, @Body() dto: UpdateHabitoDto) {
    return this.habitos.update(id, dto);
  }

  @Delete('habitos/:id')
  deleteHabito(@Param('id') id: string) {
    return this.habitos.delete(id);
  }

  @Post('habitos/:id/toggle')
  toggleHabito(@Param('id') id: string, @Body() dto: ToggleHabitoDto) {
    return this.habitos.toggle(id, dto);
  }

  // ── Finanças pessoais ────────────────────────────────────────

  @Get('financas')
  listFinancas(@Query('ano') ano: string) {
    return this.financas.list(Number(ano));
  }

  @Post('financas/categorias')
  createCategoriaFinanceira(@Body() dto: CreateCategoriaFinanceiraDto) {
    return this.financas.createCategoria(dto);
  }

  @Patch('financas/categorias/:id')
  updateCategoriaFinanceira(@Param('id') id: string, @Body() dto: UpdateCategoriaFinanceiraDto) {
    return this.financas.updateCategoria(id, dto);
  }

  @Delete('financas/categorias/:id')
  deleteCategoriaFinanceira(@Param('id') id: string) {
    return this.financas.deleteCategoria(id);
  }

  @Put('financas/categorias/:id/lancamentos/:mes')
  setLancamento(@Param('id') id: string, @Param('mes') mes: string, @Body() dto: SetLancamentoDto) {
    return this.financas.setLancamento(id, Number(mes), dto);
  }

  // ── Humor ────────────────────────────────────────────────────

  @Get('humor')
  listHumor(@Query('ano') ano: string) {
    return this.humor.list(Number(ano));
  }

  @Put('humor')
  setHumor(@Body() dto: SetHumorDto) {
    return this.humor.set(dto);
  }

  // ── Ciclo menstrual ──────────────────────────────────────────

  @Get('ciclo')
  listCiclo() {
    return this.ciclo.list();
  }

  @Post('ciclo')
  createCiclo(@Body() dto: CreateCicloDto) {
    return this.ciclo.create(dto);
  }

  @Patch('ciclo/:id')
  updateCiclo(@Param('id') id: string, @Body() dto: UpdateCicloDto) {
    return this.ciclo.update(id, dto);
  }

  @Delete('ciclo/:id')
  deleteCiclo(@Param('id') id: string) {
    return this.ciclo.delete(id);
  }

  // ── Peso e medidas ───────────────────────────────────────────

  @Get('peso-medida')
  listPesoMedida(@Query('ano') ano: string) {
    return this.pesoMedida.list(Number(ano));
  }

  @Put('peso-medida')
  setPesoMedida(@Body() dto: SetPesoMedidaDto) {
    return this.pesoMedida.set(dto);
  }

  // ── Roda da vida ─────────────────────────────────────────────

  @Get('roda-da-vida')
  listRodaDaVida() {
    return this.rodaDaVida.list();
  }

  @Put('roda-da-vida')
  setRodaDaVida(@Body() dto: SetRodaDaVidaDto) {
    return this.rodaDaVida.set(dto);
  }

  // ── Revisão mensal ───────────────────────────────────────────

  @Get('revisao-mensal')
  listRevisaoMensal(@Query('ano') ano: string) {
    return this.revisaoMensal.list(Number(ano));
  }

  @Put('revisao-mensal')
  setRevisaoMensal(@Body() dto: SetRevisaoMensalDto) {
    return this.revisaoMensal.set(dto);
  }

  // ── Melhor eu possível ───────────────────────────────────────

  @Get('melhor-eu-possivel')
  listMelhorEuPossivel() {
    return this.melhorEuPossivel.list();
  }

  @Put('melhor-eu-possivel')
  setMelhorEuPossivel(@Body() dto: SetMelhorEuPossivelDto) {
    return this.melhorEuPossivel.set(dto);
  }

  // ── Ikigai ────────────────────────────────────────────────────

  @Get('ikigai')
  listIkigai() {
    return this.ikigai.list();
  }

  @Put('ikigai')
  setIkigai(@Body() dto: SetIkigaiDto) {
    return this.ikigai.set(dto);
  }

  // ── SWOT pessoal ──────────────────────────────────────────────

  @Get('swot-pessoal')
  listSwotPessoal() {
    return this.swotPessoal.list();
  }

  @Put('swot-pessoal')
  setSwotPessoal(@Body() dto: SetSwotPessoalDto) {
    return this.swotPessoal.set(dto);
  }
}
