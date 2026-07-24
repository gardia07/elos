import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/departments.dto';

@UseGuards(AuthGuard)
@Controller('dp/departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }
}
