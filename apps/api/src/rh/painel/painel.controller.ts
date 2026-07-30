import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PainelService } from './painel.service';

@UseGuards(AuthGuard)
@Controller('rh/painel')
export class PainelController {
  constructor(private readonly service: PainelService) {}

  @Get()
  get() {
    return this.service.get();
  }
}
