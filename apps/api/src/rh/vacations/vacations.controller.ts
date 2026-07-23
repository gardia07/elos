import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { VacationsService } from './vacations.service';
import { CreateLeaveDto, CreateVacationRequestDto } from './dto/vacations.dto';

@UseGuards(AuthGuard)
@Controller('rh/vacations')
export class VacationsController {
  constructor(private readonly service: VacationsService) {}

  @Get('requests')
  listRequests(@Query('status') status?: 'PENDENTE' | 'APROVADA' | 'RECUSADA') {
    return this.service.listRequests(status);
  }

  @Post('requests')
  createRequest(@Body() dto: CreateVacationRequestDto) {
    return this.service.createRequest(dto);
  }

  @Post('requests/:id/approve')
  approveRequest(@Param('id') id: string) {
    return this.service.approveRequest(id);
  }

  @Post('requests/:id/reject')
  rejectRequest(@Param('id') id: string) {
    return this.service.rejectRequest(id);
  }

  @Get('calendar')
  calendar(@Query('month') month: string, @Query('year') year: string) {
    return this.service.calendar(Number(month), Number(year));
  }

  @Get('balances')
  balances() {
    return this.service.balances();
  }

  @Get('leaves')
  listLeaves() {
    return this.service.listLeaves();
  }

  @Post('leaves')
  createLeave(@Body() dto: CreateLeaveDto) {
    return this.service.createLeave(dto);
  }

  @Post('leaves/:id/esocial')
  sendLeaveEsocial(@Param('id') id: string) {
    return this.service.sendLeaveEsocial(id);
  }
}
