import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TimeclockService } from './timeclock.service';
import { CreateJustificationDto } from './dto/timeclock.dto';

@UseGuards(AuthGuard)
@Controller('dp/timeclock')
export class TimeclockController {
  constructor(private readonly service: TimeclockService) {}

  @Get('justifications')
  listJustifications() {
    return this.service.listJustifications();
  }

  @Get('kpis')
  kpis() {
    return this.service.kpis();
  }

  @Post('justifications')
  createJustification(@Body() dto: CreateJustificationDto) {
    return this.service.createJustification(dto);
  }

  @Post('justifications/:id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Post('justifications/:id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }
}
