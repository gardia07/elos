import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { TarefasDoDiaService } from './tarefas-do-dia.service';
import { AdiarDto, CriarTarefaManualDto, DelegarDto } from './dto/tarefas-do-dia.dto';

@UseGuards(AuthGuard)
@Controller('tarefas-do-dia')
export class TarefasDoDiaController {
  constructor(private readonly service: TarefasDoDiaService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post('manual')
  criarManual(@Body() dto: CriarTarefaManualDto) {
    return this.service.criarManual(dto);
  }

  @Patch(':origem/:origemId/concluir')
  concluir(@Param('origem') origem: string, @Param('origemId') origemId: string) {
    return this.service.concluir(origem, origemId);
  }

  @Patch(':origem/:origemId/adiar')
  adiar(@Param('origem') origem: string, @Param('origemId') origemId: string, @Body() dto: AdiarDto) {
    return this.service.adiar(origem, origemId, dto.dias);
  }

  @Patch(':origem/:origemId/delegar')
  delegar(@Param('origem') origem: string, @Param('origemId') origemId: string, @Body() dto: DelegarDto) {
    return this.service.delegar(origem, origemId, dto.userId);
  }

  @Post(':origem/:origemId/fixar')
  fixar(@Param('origem') origem: string, @Param('origemId') origemId: string) {
    return this.service.fixar(origem, origemId);
  }

  @Delete(':origem/:origemId/fixar')
  desfixar(@Param('origem') origem: string, @Param('origemId') origemId: string) {
    return this.service.desfixar(origem, origemId);
  }
}
