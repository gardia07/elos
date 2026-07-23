import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RecruitmentService } from './recruitment.service';
import {
  CreateJobDto,
  CreateCandidateDto,
  RejectCandidateDto,
  BlockCandidateDto,
  UpdateScorecardDto,
  UpdateCandidateDto,
  CreateJobCostDto,
  CreateRequisitionDto,
  ScheduleInterviewDto,
} from './dto/recruitment.dto';

@UseGuards(AuthGuard)
@Controller('rh/recruitment')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  @Get('jobs')
  listJobs() {
    return this.service.listJobs();
  }

  @Post('jobs')
  createJob(@Body() dto: CreateJobDto) {
    return this.service.createJob(dto);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.service.getJob(id);
  }

  @Post('jobs/:id/candidates')
  addCandidate(@Param('id') id: string, @Body() dto: CreateCandidateDto) {
    return this.service.addCandidate(id, dto);
  }

  @Post('jobs/:id/costs')
  addCost(@Param('id') id: string, @Body() dto: CreateJobCostDto) {
    return this.service.addCost(id, dto);
  }

  @Post('jobs/:id/interviews')
  scheduleInterview(@Param('id') id: string, @Body() dto: ScheduleInterviewDto) {
    return this.service.scheduleInterview(id, dto);
  }

  @Post('candidates/:id/advance')
  advanceCandidate(@Param('id') id: string, @Body('salario') salario?: number) {
    return this.service.advanceCandidate(id, salario);
  }

  @Post('candidates/:id/reject')
  rejectCandidate(@Param('id') id: string, @Body() _dto: RejectCandidateDto) {
    return this.service.rejectCandidate(id);
  }

  @Post('candidates/:id/talent-bank')
  moveToTalentBank(@Param('id') id: string) {
    return this.service.moveToTalentBank(id);
  }

  @Post('candidates/:id/block')
  blockCandidate(@Param('id') id: string, @Body() dto: BlockCandidateDto) {
    return this.service.blockCandidate(id, dto.motivo);
  }

  @Patch('candidates/:id/scorecard')
  updateScorecard(@Param('id') id: string, @Body() dto: UpdateScorecardDto) {
    return this.service.updateScorecard(id, dto);
  }

  @Patch('candidates/:id')
  updateCandidate(@Param('id') id: string, @Body() dto: UpdateCandidateDto) {
    return this.service.updateCandidate(id, dto);
  }

  @Get('requisitions')
  listRequisitions() {
    return this.service.listRequisitions();
  }

  @Post('requisitions')
  createRequisition(@Body() dto: CreateRequisitionDto) {
    return this.service.createRequisition(dto);
  }

  @Post('requisitions/:id/approve')
  approveRequisition(@Param('id') id: string) {
    return this.service.approveRequisition(id);
  }

  @Post('requisitions/:id/reject')
  rejectRequisition(@Param('id') id: string) {
    return this.service.rejectRequisition(id);
  }

  @Get('pool')
  listPool(@Query('type') type: 'TALENT_BANK' | 'BLOCKED') {
    return this.service.listPool(type);
  }
}
