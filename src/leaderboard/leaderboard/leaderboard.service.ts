import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Territory } from '../../territories/territory.entity';
import { Activity } from '../../activities/activity.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
  ) {}

  async getLeaderboard() {
    const territories = await this.territoryRepo.find({
      relations: ['user'],
      order: { tileCount: 'DESC' },
    });

    return Promise.all(
      territories.map(async (t, index) => {
        const routeCount = await this.activityRepo.count({
          where: { userId: t.userId, qualifying: true },
        });
        return {
          rank: index + 1,
          userId: t.userId,
          firstname: t.user?.firstname ?? '',
          lastname: t.user?.lastname ?? '',
          profilePicture: t.user?.profilePicture ?? '',
          color: t.color,
          tileCount: t.tileCount,
          areaKm2: Number((t.areaKm2 ?? 0).toFixed(1)),
          routeCount,
        };
      }),
    );
  }
}
