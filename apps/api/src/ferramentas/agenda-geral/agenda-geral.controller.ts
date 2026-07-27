import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AgendaGeralService } from './agenda-geral.service';
import { ConcluirEventoDto } from './dto/concluir.dto';

@UseGuards(AuthGuard)
@Controller('ferramentas/agenda-geral')
export class AgendaGeralController {
  constructor(private readonly service: AgendaGeralService) {}

  @Get()
  list(@Query('data') data?: string) {
    return this.service.list(data);
  }

  @Post('concluir')
  concluir(@Body() dto: ConcluirEventoDto) {
    return this.service.concluir(dto.origem, dto.id);
  }
}
