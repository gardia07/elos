import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PainelService } from './painel.service';

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('rh/painel')
export class PainelController {
  constructor(private readonly service: PainelService) {}

  @Get()
  get() {
    return this.service.get();
  }
}
