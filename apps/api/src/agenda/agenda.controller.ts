import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AgendaService } from './agenda.service';
import { CreateAgendaItemDto, CreateComentarioDto, SaveNotepadDto, SaveRevisaoDto, UpdateAgendaItemDto } from './dto/agenda.dto';
import { CreateSubtarefaDto, UpdateSubtarefaDto } from './dto/subtarefas.dto';

@UseGuards(AuthGuard)
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get('categorias')
  listCategorias() {
    return this.service.listCategorias();
  }

  @Get('usuarios')
  listUsuarios() {
    return this.service.listUsuariosRh();
  }

  @Get('items')
  listItems(@Query('data') date?: string, @Query('dataInicio') dataInicio?: string, @Query('dataFim') dataFim?: string) {
    return this.service.listItems(date, dataInicio, dataFim);
  }

  @Post('items')
  createItem(@Body() dto: CreateAgendaItemDto) {
    return this.service.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateAgendaItemDto) {
    return this.service.updateItem(id, dto);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(id);
  }

  @Delete('recorrencias/:id')
  deleteSeries(@Param('id') id: string) {
    return this.service.deleteSeries(id);
  }

  @Post('items/:id/restore')
  restoreItem(@Param('id') id: string) {
    return this.service.restoreItem(id);
  }

  @Get('items/:id/comentarios')
  listComentarios(@Param('id') id: string) {
    return this.service.listComentarios(id);
  }

  @Post('items/:id/comentarios')
  criarComentario(@Param('id') id: string, @Body() dto: CreateComentarioDto) {
    return this.service.criarComentario(id, dto);
  }

  @Get('notepad/:date')
  getNotepad(@Param('date') date: string) {
    return this.service.getNotepad(date);
  }

  @Put('notepad/:date')
  saveNotepad(@Param('date') date: string, @Body() dto: SaveNotepadDto) {
    return this.service.saveNotepad(date, dto);
  }

  @Get('revisao/:date')
  getRevisao(@Param('date') date: string) {
    return this.service.getRevisao(date);
  }

  @Put('revisao/:date')
  saveRevisao(@Param('date') date: string, @Body() dto: SaveRevisaoDto) {
    return this.service.saveRevisao(date, dto);
  }

  @Get('items/:id/subtarefas')
  listSubtarefas(@Param('id') id: string) {
    return this.service.listSubtarefas(id);
  }

  @Post('items/:id/subtarefas')
  criarSubtarefa(@Param('id') id: string, @Body() dto: CreateSubtarefaDto) {
    return this.service.criarSubtarefa(id, dto);
  }

  @Patch('items/:id/subtarefas/:subtarefaId')
  atualizarSubtarefa(@Param('id') id: string, @Param('subtarefaId') subtarefaId: string, @Body() dto: UpdateSubtarefaDto) {
    return this.service.atualizarSubtarefa(id, subtarefaId, dto);
  }

  @Delete('items/:id/subtarefas/:subtarefaId')
  excluirSubtarefa(@Param('id') id: string, @Param('subtarefaId') subtarefaId: string) {
    return this.service.excluirSubtarefa(id, subtarefaId);
  }

  @Get('notificacoes')
  listNotificacoes() {
    return this.service.listNotificacoes();
  }

  @Post('notificacoes/:id/marcar-lida')
  marcarNotificacaoLida(@Param('id') id: string) {
    return this.service.marcarNotificacaoLida(id);
  }
}
