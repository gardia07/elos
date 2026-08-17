import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto, SetParticipantesDto, UpdateProjetoDto } from './dto/projetos.dto';

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
}
