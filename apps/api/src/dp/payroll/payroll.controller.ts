import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PayrollService } from './payroll.service';
import { CreateRunDto } from './dto/payroll.dto';

@UseGuards(AuthGuard)
@Controller('dp/payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('runs')
  listRuns() {
    return this.service.listRuns();
  }

  @Post('runs')
  createRun(@Body() dto: CreateRunDto) {
    return this.service.createRun(dto);
  }

  @Get('runs/:id')
  getRun(@Param('id') id: string) {
    return this.service.getRun(id);
  }

  @Post('runs/:id/process')
  process(@Param('id') id: string) {
    return this.service.process(id);
  }

  @Post('runs/:id/reopen')
  reopen(@Param('id') id: string) {
    return this.service.reopen(id);
  }

  @Post('runs/:id/esocial')
  sendEsocial(@Param('id') id: string) {
    return this.service.sendEsocial(id);
  }

  @Post('guides/:id/generate')
  generateGuide(@Param('id') id: string) {
    return this.service.generateGuide(id);
  }
}
