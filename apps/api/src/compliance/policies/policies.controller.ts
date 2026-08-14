import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PoliciesService } from './policies.service';
import { AcknowledgePolicyDto, CreatePolicyDto, UpdatePolicyDto } from './dto/policies.dto';

@Roles('ADMIN', 'COMPLIANCE', 'COMITE_ETICA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('compliance/policies')
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreatePolicyDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() dto: AcknowledgePolicyDto) {
    return this.service.acknowledge(id, dto);
  }
}
