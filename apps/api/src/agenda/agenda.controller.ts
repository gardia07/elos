import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AgendaService } from './agenda.service';
import { CreateAgendaItemDto, SaveNotepadDto, UpdateAgendaItemDto } from './dto/agenda.dto';

@UseGuards(AuthGuard)
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get('items')
  listItems(@Query('data') date: string) {
    return this.service.listItems(date);
  }

  @Post('items')
  createItem(@Body() dto: CreateAgendaItemDto) {
    return this.service.createItem(dto);
  }

  @Patch('items/:id')
  toggleItem(@Param('id') id: string, @Body() dto: UpdateAgendaItemDto) {
    return this.service.toggleItem(id, dto);
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
