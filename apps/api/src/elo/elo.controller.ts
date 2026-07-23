import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { EloService } from './elo.service';
import { AskEloDto } from './dto/elo.dto';

@UseGuards(AuthGuard)
@Controller('elo')
export class EloController {
  constructor(private readonly service: EloService) {}

  @Post('ask')
  ask(@Body() dto: AskEloDto) {
    return this.service.chat(dto.pergunta, dto.modoAgente ?? false);
  }

  @Get('history')
  history() {
    return this.service.history();
  }
}
