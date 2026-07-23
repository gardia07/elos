import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { EthicsService } from './ethics.service';
import { CreateEthicsCaseDto, UpdateEthicsCaseStatusDto } from './dto/ethics.dto';

@UseGuards(AuthGuard)
@Controller('compliance/ethics-cases')
export class EthicsController {
  constructor(private readonly service: EthicsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateEthicsCaseDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateEthicsCaseStatusDto) {
    return this.service.updateStatus(id, dto);
  }
}
