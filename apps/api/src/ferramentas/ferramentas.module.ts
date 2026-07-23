import { Module } from '@nestjs/common';
import { AgendaGeralController } from './agenda-geral/agenda-geral.controller';
import { AgendaGeralService } from './agenda-geral/agenda-geral.service';
import { IntegrationsController } from './integrations/integrations.controller';
import { IntegrationsService } from './integrations/integrations.service';
import { AnnouncementsController } from './announcements/announcements.controller';
import { AnnouncementsService } from './announcements/announcements.service';

@Module({
  controllers: [AgendaGeralController, IntegrationsController, AnnouncementsController],
  providers: [AgendaGeralService, IntegrationsService, AnnouncementsService],
})
export class FerramentasModule {}
