import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { EmployeesService } from './employees.service';
import {
  AddDependenteDto,
  AddDocumentoDto,
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  PromoteEmployeeDto,
  UpdateEmployeeDto,
} from './dto/employees.dto';

@UseGuards(AuthGuard)
@Controller('rh/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  list(@Query() query: ListEmployeesQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Get('org-chart')
  orgChart() {
    return this.service.orgChart();
  }

  @Get('filter-options')
  filterOptions() {
    return this.service.filterOptions();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string, @Body() dto: PromoteEmployeeDto) {
    return this.service.promote(id, dto);
  }

  @Post(':id/dependentes')
  addDependente(@Param('id') id: string, @Body() dto: AddDependenteDto) {
    return this.service.addDependente(id, dto);
  }

  @Post(':id/documentos')
  addDocumento(@Param('id') id: string, @Body() dto: AddDocumentoDto) {
    return this.service.addDocumento(id, dto);
  }

  @Delete(':id/documentos/:documentoId')
  removeDocumento(@Param('id') id: string, @Param('documentoId') documentoId: string) {
    return this.service.removeDocumento(id, documentoId);
  }
}
