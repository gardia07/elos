import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/equipment.dto';

@UseGuards(AuthGuard)
@Controller('dp/equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateEquipmentDto) {
    return this.service.create(dto);
  }
}
