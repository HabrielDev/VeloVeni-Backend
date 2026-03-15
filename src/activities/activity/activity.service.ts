import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activity.entity';
import { User } from '../../users/user.entity';
import { TerritoryService } from '../../territories/territory/territory.service';

const QUALIFYING_SPORT_TYPES = [
  'Ride', 'EBikeRide', 'GravelRide', 'MountainBikeRide', 'Handcycle', 'Velomobile',
];
const GERMANY_BOUNDS = { latMin: 47.27, latMax: 55.06, lngMin: 5.87, lngMax: 15.04 };

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly territoryService: TerritoryService,
  ) {}

  private checkQualifying(a: Record<string, unknown>): { qualifying: boolean; reason?: string } {
    const sportType = (a['sport_type'] as string) ?? '';
    const distance = (a['distance'] as number) ?? 0;
    const startLatlng = a['start_latlng'] as [number, number] | null;
    const summaryPolyline = (a['map'] as Record<string, string>)?.['summary_polyline'];

    if (!QUALIFYING_SPORT_TYPES.includes(sportType))
      return { qualifying: false, reason: 'Kein Rad-Sport' };
    if (!Array.isArray(startLatlng) || startLatlng.length < 2)
      return { qualifying: false, reason: 'Kein GPS' };
    if (distance < 1000)
      return { qualifying: false, reason: 'Zu kurz (< 1 km)' };
    const [lat, lng] = startLatlng;
    if (lat < GERMANY_BOUNDS.latMin || lat > GERMANY_BOUNDS.latMax ||
        lng < GERMANY_BOUNDS.lngMin || lng > GERMANY_BOUNDS.lngMax)
      return { qualifying: false, reason: 'Außerhalb Deutschlands' };
    if (!summaryPolyline)
      return { qualifying: false, reason: 'Kein GPS-Track' };

    return { qualifying: true };
  }

  async syncForUser(userId: number, stravaAccessToken: string): Promise<number> {
    const activities = await this.fetchStravaActivities(stravaAccessToken);
    let synced = 0;

    for (const stravaActivity of activities) {
      const existing = await this.activityRepo.findOne({
        where: { stravaActivityId: String(stravaActivity['id']), userId },
      });
      if (existing) continue;

      const { qualifying, reason } = this.checkQualifying(stravaActivity);
      const startLatlng = stravaActivity['start_latlng'] as [number, number] | null;

      const entity = this.activityRepo.create();
      entity.stravaActivityId = String(stravaActivity['id']);
      entity.userId = userId;
      entity.name = stravaActivity['name'] as string;
      entity.distance = stravaActivity['distance'] as number;
      entity.movingTime = stravaActivity['moving_time'] as number;
      entity.elevationGain = (stravaActivity['total_elevation_gain'] as number) ?? 0;
      entity.sportType = stravaActivity['sport_type'] as string;
      entity.startDate = new Date(stravaActivity['start_date_local'] as string);
      entity.startLat = startLatlng?.[0] ?? null;
      entity.startLng = startLatlng?.[1] ?? null;
      entity.summaryPolyline = (stravaActivity['map'] as Record<string, string>)?.['summary_polyline'] ?? null;
      entity.qualifying = qualifying;
      entity.qualifyingReason = reason ?? null;
      await this.activityRepo.save(entity);
      synced++;
    }

    const qualifyingActivities = await this.activityRepo.find({ where: { userId, qualifying: true } });
    await this.territoryService.recalculateForUser(userId, qualifyingActivities);

    return synced;
  }

  private async fetchStravaActivities(token: string, page = 1, perPage = 100) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch Strava activities');
    return res.json() as Promise<Record<string, unknown>[]>;
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

  async recalculateAllFromDb(): Promise<number> {
    const activities = await this.activityRepo.find({ where: { qualifying: true } });
    const byUser = new Map<number, typeof activities>();
    for (const a of activities) {
      const list = byUser.get(a.userId) ?? [];
      list.push(a);
      byUser.set(a.userId, list);
    }
    for (const [userId, userActivities] of byUser) {
      await this.territoryService.recalculateForUser(userId, userActivities);
    }
    return byUser.size;
  }

  async getForUser(userId: number): Promise<object[]> {
    const activities = await this.activityRepo.find({
      where: { userId },
      order: { startDate: 'DESC' },
    });
    return activities.map((a) => this.toApiFormat(a));
  }

  // Returns qualifying activities of Strava friends who have shareRides=true
  async getFriendsActivities(userId: number, stravaToken: string): Promise<object[]> {
    const following = await this.fetchStravaFollowing(stravaToken);
    const followingStravaIds = new Set(following.map((a: Record<string, unknown>) => String(a['id'])));

    // Find friends in DB who share rides
    const allUsers = await this.userRepo.find();
    const friendUserIds = allUsers
      .filter((u) => u.id !== userId && followingStravaIds.has(u.stravaId) && u.shareRides)
      .map((u) => u.id);

    if (friendUserIds.length === 0) return [];

    const activities = await this.activityRepo.find({
      where: friendUserIds.map((id) => ({ userId: id, qualifying: true })),
      order: { startDate: 'DESC' },
    });

    return activities.map((a) => ({
      ...this.toApiFormat(a),
      userId: a.userId,
      ownerName: allUsers.find((u) => u.id === a.userId)
        ? `${allUsers.find((u) => u.id === a.userId)!.firstname} ${allUsers.find((u) => u.id === a.userId)!.lastname}`
        : 'Freund',
    }));
  }

  async getRoute(userId: number, stravaActivityId: string, stravaAccessToken: string): Promise<[number, number][]> {
    const activity = await this.activityRepo.findOne({ where: { stravaActivityId, userId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${stravaActivityId}/streams?keys=latlng&key_by_type=true`,
      { headers: { Authorization: `Bearer ${stravaAccessToken}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch GPS stream');
    const data = await res.json() as Record<string, { data: [number, number][] }>;
    return data['latlng']?.data ?? [];
  }

  private toApiFormat(a: Activity): object {
    return {
      id: Number(a.stravaActivityId),
      name: a.name,
      distance: a.distance,
      moving_time: a.movingTime,
      total_elevation_gain: a.elevationGain,
      sport_type: a.sportType,
      type: a.sportType,
      start_date_local: a.startDate.toISOString(),
      start_latlng: a.startLat ? [a.startLat, a.startLng] : null,
      map: { summary_polyline: a.summaryPolyline ?? '' },
      qualifying: a.qualifying,
      qualifying_reason: a.qualifyingReason ?? null,
    };
  }
}
