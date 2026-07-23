import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentRequirementDto, SetDocumentStatusDto, UpdateDocumentRequirementDto } from './dto/documents.dto';

@UseGuards(AuthGuard)
@Controller('rh/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('requirements')
  listRequirements() {
    return this.service.listRequirements();
  }

  @Post('requirements')
  createRequirement(@Body() dto: CreateDocumentRequirementDto) {
    return this.service.createRequirement(dto);
  }

  @Patch('requirements/:id')
  updateRequirement(@Param('id') id: string, @Body() dto: UpdateDocumentRequirementDto) {
    return this.service.updateRequirement(id, dto);
  }

  @Get('all-employees')
  listAllEmployees() {
    return this.service.listAllEmployees();
  }

  @Get('employees/:employeeId')
  listForEmployee(@Param('employeeId') employeeId: string) {
    return this.service.listForEmployee(employeeId);
  }

  @Patch('employees/:employeeId/requirements/:requirementId')
  setStatus(
    @Param('employeeId') employeeId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: SetDocumentStatusDto,
  ) {
    return this.service.setStatus(employeeId, requirementId, dto);
  }
}
