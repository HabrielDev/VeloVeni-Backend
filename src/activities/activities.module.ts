import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './activity.entity';
import { User } from '../users/user.entity';
import { ActivityService } from './activity/activity.service';
import { ActivityController } from './activity/activity.controller';
import { TerritoriesModule } from '../territories/territories.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, User]), TerritoriesModule, AuthModule],
  providers: [ActivityService],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivitiesModule {}
