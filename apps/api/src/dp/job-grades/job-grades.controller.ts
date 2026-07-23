import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { JobGradesService } from './job-grades.service';
import { CreateJobGradeDto } from './dto/job-grades.dto';

@UseGuards(AuthGuard)
@Controller('dp/job-grades')
export class JobGradesController {
  constructor(private readonly service: JobGradesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateJobGradeDto) {
    return this.service.create(dto);
  }
}
