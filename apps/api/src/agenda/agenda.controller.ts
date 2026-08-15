import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AgendaService } from './agenda.service';
import { CreateAgendaItemDto, SaveNotepadDto, UpdateAgendaItemDto } from './dto/agenda.dto';

@UseGuards(AuthGuard)
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get('categorias')
  listCategorias() {
    return this.service.listCategorias();
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

  @Get('notepad/:date')
  getNotepad(@Param('date') date: string) {
    return this.service.getNotepad(date);
  }

  @Put('notepad/:date')
  saveNotepad(@Param('date') date: string, @Body() dto: SaveNotepadDto) {
    return this.service.saveNotepad(date, dto);
  }
}
