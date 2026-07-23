import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { IntegrationsService } from './integrations.service';
import { ToggleIntegrationDto } from './dto/integrations.dto';

@UseGuards(AuthGuard)
@Controller('ferramentas/integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Patch(':id')
  toggle(@Param('id') id: string, @Body() dto: ToggleIntegrationDto) {
    return this.service.toggle(id, dto.conectado);
  }
}
