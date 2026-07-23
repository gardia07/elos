import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { BenefitsService } from './benefits.service';
import { CreateBenefitDto, EnrollDto } from './dto/benefits.dto';

@UseGuards(AuthGuard)
@Controller('dp/benefits')
export class BenefitsController {
  constructor(private readonly service: BenefitsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateBenefitDto) {
    return this.service.create(dto);
  }

  @Get(':id/enrollments')
  listEnrollments(@Param('id') id: string) {
    return this.service.listEnrollments(id);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Body() dto: EnrollDto) {
    return this.service.enroll(id, dto);
  }

  @Delete(':id/enroll/:employeeId')
  unenroll(@Param('id') id: string, @Param('employeeId') employeeId: string) {
    return this.service.unenroll(id, employeeId);
  }
}
