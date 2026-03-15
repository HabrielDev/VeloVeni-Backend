import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard/leaderboard.service';
import { LeaderboardController } from './leaderboard/leaderboard.controller';
import { Territory } from '../territories/territory.entity';
import { Activity } from '../activities/activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Territory, Activity])],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
