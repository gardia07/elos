import { Module } from '@nestjs/common';
import { AgendaGeralController } from './agenda-geral/agenda-geral.controller';
import { AgendaGeralService } from './agenda-geral/agenda-geral.service';
import { IntegrationsController } from './integrations/integrations.controller';
import { IntegrationsService } from './integrations/integrations.service';
import { AnnouncementsController } from './announcements/announcements.controller';
import { AnnouncementsService } from './announcements/announcements.service';
import { AtalhosExternosController } from './atalhos-externos/atalhos-externos.controller';
import { AtalhosExternosService } from './atalhos-externos/atalhos-externos.service';

@Module({
  controllers: [AgendaGeralController, IntegrationsController, AnnouncementsController, AtalhosExternosController],
  providers: [AgendaGeralService, IntegrationsService, AnnouncementsService, AtalhosExternosService],
})
export class FerramentasModule {}
