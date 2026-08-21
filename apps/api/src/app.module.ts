import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './common/email/email.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { LicenseModule } from './license/license.module';
import { LicenseGuard } from './common/guards/license.guard';
import { ColaboradorScopeGuard } from './common/guards/colaborador-scope.guard';
import { TenantContextMiddleware } from './common/tenant-context.middleware';
import { RecruitmentModule } from './rh/recruitment/recruitment.module';
import { AdmissionsModule } from './rh/admissions/admissions.module';
import { EmployeesModule } from './rh/employees/employees.module';
import { DocumentsModule } from './rh/documents/documents.module';
import { EvaluationsModule } from './rh/evaluations/evaluations.module';
import { VacationsModule } from './rh/vacations/vacations.module';
import { FeriasModule } from './rh/ferias/ferias.module';
import { TerminationsModule } from './rh/terminations/terminations.module';
import { PainelModule } from './rh/painel/painel.module';
import { DocumentTemplatesModule } from './rh/document-templates/document-templates.module';
import { DeadlinesModule } from './dp/deadlines/deadlines.module';
import { AfastamentosModule } from './dp/afastamentos/afastamentos.module';
import { AgreementsModule } from './dp/agreements/agreements.module';
import { JobGradesModule } from './dp/job-grades/job-grades.module';
import { DepartmentsModule } from './dp/departments/departments.module';
import { BenefitsModule } from './dp/benefits/benefits.module';
import { EquipmentModule } from './dp/equipment/equipment.module';
import { TimeclockModule } from './dp/timeclock/timeclock.module';
import { PayrollModule } from './dp/payroll/payroll.module';
import { SimulacoesModule } from './dp/simulacoes/simulacoes.module';
import { AgendaModule } from './agenda/agenda.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RiskModule } from './risk/risk.module';
import { ComplianceEngineModule } from './compliance-engine/compliance-engine.module';
import { TarefasDoDiaModule } from './tarefas-do-dia/tarefas-do-dia.module';
import { AccidentsModule } from './sst/accidents/accidents.module';
import { ExamsModule } from './sst/exams/exams.module';
import { NrTrainingsModule } from './sst/nr-trainings/nr-trainings.module';
import { PgrModule } from './sst/pgr/pgr.module';
import { RiskMapModule } from './sst/risk-map/risk-map.module';
import { ComplianceModule } from './compliance/compliance.module';
import { IndicadoresModule } from './indicadores/indicadores.module';
import { AprovacoesModule } from './aprovacoes/aprovacoes.module';
import { EloModule } from './elo/elo.module';
import { FerramentasModule } from './ferramentas/ferramentas.module';
import { PlannerModule } from './planner/planner.module';
import { TenantModule } from './tenant/tenant.module';
import { PortalModule } from './portal/portal.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuditModule,
    AuthModule,
    LicenseModule,
    RecruitmentModule,
    AdmissionsModule,
    EmployeesModule,
    DocumentsModule,
    EvaluationsModule,
    VacationsModule,
    FeriasModule,
    TerminationsModule,
    PainelModule,
    DocumentTemplatesModule,
    DeadlinesModule,
    AfastamentosModule,
    AgreementsModule,
    JobGradesModule,
    DepartmentsModule,
    BenefitsModule,
    EquipmentModule,
    TimeclockModule,
    PayrollModule,
    SimulacoesModule,
    AgendaModule,
    DashboardModule,
    RiskModule,
    ComplianceEngineModule,
    TarefasDoDiaModule,
    AccidentsModule,
    ExamsModule,
    NrTrainingsModule,
    PgrModule,
    RiskMapModule,
    ComplianceModule,
    IndicadoresModule,
    AprovacoesModule,
    EloModule,
    FerramentasModule,
    PlannerModule,
    TenantModule,
    PortalModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: LicenseGuard },
    { provide: APP_GUARD, useClass: ColaboradorScopeGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
