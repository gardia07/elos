import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AgendaGeralService } from './agenda-geral.service';

@UseGuards(AuthGuard)
@Controller('ferramentas/agenda-geral')
export class AgendaGeralController {
  constructor(private readonly service: AgendaGeralService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
