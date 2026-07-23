import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { DashboardService } from './dashboard.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/dashboard.dto';

@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  kpis() {
    return this.service.kpis();
  }

  @Get('alerts')
  alerts() {
    return this.service.alerts();
  }

  @Get('tasks')
  tasks() {
    return this.service.tasks();
  }

  @Post('tasks')
  createTask(@Body() dto: CreateTaskDto) {
    return this.service.createTask(dto);
  }

  @Patch('tasks/:id')
  updateTaskStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.service.setTaskStatus(id, dto.status);
  }
}
