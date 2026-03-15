import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard/leaderboard.service';
import { LeaderboardController } from './leaderboard/leaderboard.controller';
import { Territory } from '../territories/territory.entity';
import { Activity } from '../activities/activity.entity';
import { User } from '../users/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Territory, Activity, User]), AuthModule],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
