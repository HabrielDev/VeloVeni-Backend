import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StravaWebhookController } from './strava-webhook.controller';
import { StravaWebhookService } from './strava-webhook.service';
import { ActivitiesModule } from '../activities/activities.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { Activity } from '../activities/activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Activity]), ActivitiesModule, UsersModule, AuthModule],
  controllers: [StravaWebhookController],
  providers: [StravaWebhookService],
})
export class StravaWebhookModule {}
