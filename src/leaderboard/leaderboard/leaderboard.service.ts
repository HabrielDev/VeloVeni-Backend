import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Territory } from '../../territories/territory.entity';
import { Activity } from '../../activities/activity.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getFriendsLeaderboard(userId: number, stravaToken: string) {
    // Fetch who the user follows on Strava
    const following = await this.fetchStravaFollowing(stravaToken);
    const followingStravaIds = following.map((a: Record<string, unknown>) => String(a['id']));

    // Include the current user themselves
    const currentUser = await this.userRepo.findOne({ where: { id: userId } });
    const allStravaIds = [...followingStravaIds, currentUser?.stravaId].filter(Boolean) as string[];

    // Map Strava IDs → DB user IDs
    const matchedUsers = await this.userRepo.find({ where: { stravaId: In(allStravaIds) } });
    const dbUserIds = new Set(matchedUsers.map((u) => u.id));

    // Filter full leaderboard and re-rank
    const full = await this.getLeaderboard();
    return full
      .filter((e) => dbUserIds.has(e.userId))
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  private async fetchStravaFollowing(token: string): Promise<Record<string, unknown>[]> {
    try {
      const res = await fetch(
        'https://www.strava.com/api/v3/athlete/following?page=1&per_page=200',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return [];
      return res.json() as Promise<Record<string, unknown>[]>;
    } catch {
      return [];
    }
  }

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
