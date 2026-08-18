import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto, SetParticipantesDto, UpdateProjetoDto } from './dto/projetos.dto';
import { CreateMarcoDto, UpdateMarcoDto } from './dto/marcos.dto';
import { SalvarComoModeloDto } from './dto/modelos.dto';

@UseGuards(AuthGuard)
@Controller('agenda/projetos')
export class ProjetosController {
  constructor(private readonly service: ProjetosService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateProjetoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjetoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Put(':id/participantes')
  setParticipantes(@Param('id') id: string, @Body() dto: SetParticipantesDto) {
    return this.service.setParticipantes(id, dto);
  }

  @Get(':id/tarefas')
  listTarefas(@Param('id') id: string) {
    return this.service.listTarefas(id);
  }

  @Get(':id/auditoria')
  listAuditoria(@Param('id') id: string) {
    return this.service.listAuditoria(id);
  }

  @Get(':id/marcos')
  listMarcos(@Param('id') id: string) {
    return this.service.listMarcos(id);
  }

  @Post(':id/marcos')
  criarMarco(@Param('id') id: string, @Body() dto: CreateMarcoDto) {
    return this.service.criarMarco(id, dto);
  }

  @Patch(':id/marcos/:marcoId')
  atualizarMarco(@Param('id') id: string, @Param('marcoId') marcoId: string, @Body() dto: UpdateMarcoDto) {
    return this.service.atualizarMarco(id, marcoId, dto);
  }

  @Delete(':id/marcos/:marcoId')
  excluirMarco(@Param('id') id: string, @Param('marcoId') marcoId: string) {
    return this.service.excluirMarco(id, marcoId);
  }

  @Get('modelos')
  listModelos() {
    return this.service.listModelos();
  }

  @Post(':id/salvar-como-modelo')
  salvarComoModelo(@Param('id') id: string, @Body() dto: SalvarComoModeloDto) {
    return this.service.salvarComoModelo(id, dto);
  }

  @Delete('modelos/:modeloId')
  excluirModelo(@Param('modeloId') modeloId: string) {
    return this.service.excluirModelo(modeloId);
  }
}
