import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AgreementsService } from './agreements.service';
import { ApplyReajusteDto, CreateAgreementDto } from './dto/agreements.dto';

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('dp/agreements')
export class AgreementsController {
  constructor(private readonly service: AgreementsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateAgreementDto) {
    return this.service.create(dto);
  }

  @Post(':id/apply-reajuste')
  applyReajuste(@Param('id') id: string, @Body() dto: ApplyReajusteDto) {
    return this.service.applyReajuste(id, dto);
  }
}
