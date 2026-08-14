import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayrollService } from './payroll.service';
import {
  CalcularCustoQueryDto,
  CreateRunDto,
  SaveImportTemplateDto,
} from './dto/payroll.dto';

const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const ok = /\.(csv|xls|xlsx)$/i.test(file.originalname);
    cb(
      ok
        ? null
        : new BadRequestException('Envie um arquivo .csv, .xls ou .xlsx.'),
      ok,
    );
  },
};

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
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

  @Post('runs/:id/import/preview')
  @UseInterceptors(FileInterceptor('arquivo', uploadOptions))
  previewImport(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    return this.service.previewImport(id, file);
  }

  @Post('runs/:id/import/commit')
  @UseInterceptors(FileInterceptor('arquivo', uploadOptions))
  commitImport(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('mapeamento') mapeamento: string,
  ) {
    if (!file)
      throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    if (!mapeamento)
      throw new BadRequestException('Envie o mapeamento confirmado.');
    return this.service.commitImport(id, file, mapeamento);
  }

  @Get('import-templates')
  listImportTemplates() {
    return this.service.listImportTemplates();
  }

  @Post('import-templates')
  saveImportTemplate(@Body() dto: SaveImportTemplateDto) {
    return this.service.saveImportTemplate(dto);
  }

  @Get('custos/colaborador/:employeeId')
  custoColaborador(
    @Param('employeeId') employeeId: string,
    @Query() query: CalcularCustoQueryDto,
  ) {
    return this.service.custoColaborador(employeeId, query.competencia);
  }

  @Get('custos/resumo')
  custoResumo(@Query() query: CalcularCustoQueryDto) {
    return this.service.custoResumo(query.competencia);
  }
}
