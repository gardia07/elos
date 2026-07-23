import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { EvaluationsService } from './evaluations.service';
import {
  CreateCycleDto,
  CreateGoalDto,
  CreatePdiActionDto,
  UpdateGoalDto,
  UpdatePdiActionDto,
  UpsertRecordDto,
} from './dto/evaluations.dto';

@UseGuards(AuthGuard)
@Controller('rh/evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}

  @Get('cycles')
  listCycles() {
    return this.service.listCycles();
  }

  @Post('cycles')
  createCycle(@Body() dto: CreateCycleDto) {
    return this.service.createCycle(dto);
  }

  @Get('cycles/:id/records')
  getRecords(@Param('id') id: string) {
    return this.service.getRecords(id);
  }

  @Put('cycles/:id/records/:employeeId')
  upsertRecord(@Param('id') id: string, @Param('employeeId') employeeId: string, @Body() dto: UpsertRecordDto) {
    return this.service.upsertRecord(id, employeeId, dto);
  }

  @Get('cycles/:id/summary')
  getSummary(@Param('id') id: string) {
    return this.service.getSummary(id);
  }

  @Get('cycles/:id/goals')
  listGoals(@Param('id') id: string) {
    return this.service.listGoals(id);
  }

  @Post('cycles/:id/goals')
  createGoal(@Param('id') id: string, @Body() dto: CreateGoalDto) {
    return this.service.createGoal(id, dto);
  }

  @Patch('goals/:id')
  updateGoal(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.service.updateGoal(id, dto);
  }

  @Get('pdi/:employeeId')
  listPdi(@Param('employeeId') employeeId: string) {
    return this.service.listPdi(employeeId);
  }

  @Post('pdi/:employeeId')
  createPdiAction(@Param('employeeId') employeeId: string, @Body() dto: CreatePdiActionDto) {
    return this.service.createPdiAction(employeeId, dto);
  }

  @Patch('pdi-actions/:id')
  updatePdiAction(@Param('id') id: string, @Body() dto: UpdatePdiActionDto) {
    return this.service.updatePdiAction(id, dto);
  }
}
