import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentRequirementDto,
  SetDocumentStatusDto,
  UpdateDocumentRequirementDto,
} from './dto/documents.dto';

const documentoUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const ok = /\.(pdf|jpe?g|png|docx?)$/i.test(file.originalname);
    cb(
      ok
        ? null
        : new BadRequestException(
            'Envie um arquivo .pdf, .jpg, .png ou .doc/.docx.',
          ),
      ok,
    );
  },
};

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
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
  updateRequirement(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentRequirementDto,
  ) {
    return this.service.updateRequirement(id, dto);
  }

  @Delete('requirements/:id')
  deleteRequirement(@Param('id') id: string) {
    return this.service.deleteRequirement(id);
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

  @Post('employees/:employeeId/requirements/:requirementId/upload')
  @UseInterceptors(FileInterceptor('arquivo', documentoUploadOptions))
  uploadRequirementFile(
    @Param('employeeId') employeeId: string,
    @Param('requirementId') requirementId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file)
      throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    return this.service.uploadRequirementFile(employeeId, requirementId, file);
  }

  @Get('employees/:employeeId/requirements/:requirementId/arquivo')
  async getRequirementArquivo(
    @Param('employeeId') employeeId: string,
    @Param('requirementId') requirementId: string,
  ) {
    const { stream, contentType, nome } =
      await this.service.getRequirementArquivo(employeeId, requirementId);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `inline; filename="${encodeURIComponent(nome)}"`,
    });
  }
}
