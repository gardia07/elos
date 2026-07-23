import { Module } from '@nestjs/common';
import { JobGradesController } from './job-grades.controller';
import { JobGradesService } from './job-grades.service';

@Module({
  controllers: [JobGradesController],
  providers: [JobGradesService],
})
export class JobGradesModule {}
