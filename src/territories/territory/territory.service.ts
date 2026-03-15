import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Territory } from '../territory.entity';
import { TileCrossing } from '../tile-crossing.entity';
import { Activity } from '../../activities/activity.entity';

const TILE_STEP = 0.01;
const TILE_AREA_KM2 = TILE_STEP * 111 * TILE_STEP * 73;
const GERMANY_BOUNDS = { latMin: 47.27, latMax: 55.06, lngMin: 5.87, lngMax: 15.04 };
const COLORS = ['#FC4C02', '#2563EB', '#16A34A', '#DC2626', '#9333EA', '#CA8A04', '#0891B2'];

@Injectable()
export class TerritoryService {
  constructor(
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(TileCrossing) private readonly crossingRepo: Repository<TileCrossing>,
  ) {}

  // ─── Called after a user syncs activities ────────────────────────────────
  async recalculateForUser(userId: number, activities: Activity[]): Promise<void> {
    // 1. Count crossings per tile for this user
    const crossingMap = new Map<string, { count: number; lastDate: Date }>();

    for (const activity of activities) {
      if (!activity.summaryPolyline) continue;
      const points = this.decodePolyline(activity.summaryPolyline);

      // Each activity contributes at most 1 crossing per tile
      const tilesInActivity = new Set<string>();
      for (const [lat, lng] of points) {
        if (this.isInGermany(lat, lng)) tilesInActivity.add(this.toTileKey(lat, lng));
      }

      for (const key of tilesInActivity) {
        const existing = crossingMap.get(key);
        if (existing) {
          existing.count++;
          if (activity.startDate > existing.lastDate) existing.lastDate = activity.startDate;
        } else {
          crossingMap.set(key, { count: 1, lastDate: activity.startDate });
        }
      }
    }

    // 2. Replace all TileCrossing rows for this user
    await this.crossingRepo.delete({ userId });
    if (crossingMap.size > 0) {
      const entities = Array.from(crossingMap.entries()).map(([key, data]) =>
        this.crossingRepo.create({
          tileKey: key,
          userId,
          crossingCount: data.count,
          lastCrossedAt: data.lastDate,
        }),
      );
      await this.crossingRepo.save(entities);
    }

    // 3. Resolve global ownership and rebuild all Territory records
    await this.resolveOwnership();
  }

  // ─── Determine winner of every tile across all users ─────────────────────
  private async resolveOwnership(): Promise<void> {
    const allCrossings = await this.crossingRepo.find();

    // For each tile: find the user with the highest crossing count
    // Tiebreaker: most recent lastCrossedAt
    const tileOwners = new Map<string, { userId: number; count: number; lastDate: Date }>();

    for (const c of allCrossings) {
      const current = tileOwners.get(c.tileKey);
      const beats =
        !current ||
        c.crossingCount > current.count ||
        (c.crossingCount === current.count && c.lastCrossedAt > current.lastDate);
      if (beats) {
        tileOwners.set(c.tileKey, {
          userId: c.userId,
          count: c.crossingCount,
          lastDate: c.lastCrossedAt,
        });
      }
    }

    // Group owned tiles by userId
    const userTiles = new Map<number, string[]>();
    for (const [key, owner] of tileOwners) {
      const list = userTiles.get(owner.userId) ?? [];
      list.push(key);
      userTiles.set(owner.userId, list);
    }

    // All users that have any crossings need a territory record (even if they own 0 tiles now)
    const allUserIds = new Set(allCrossings.map((c) => c.userId));

    for (const userId of allUserIds) {
      const tiles = userTiles.get(userId) ?? [];
      const color = COLORS[userId % COLORS.length];
      const existing = await this.territoryRepo.findOne({ where: { userId } });
      if (existing) {
        existing.tiles = tiles;
        existing.tileCount = tiles.length;
        existing.areaKm2 = tiles.length * TILE_AREA_KM2;
        existing.color = color;
        await this.territoryRepo.save(existing);
      } else {
        await this.territoryRepo.save(
          this.territoryRepo.create({
            userId,
            tiles,
            tileCount: tiles.length,
            areaKm2: tiles.length * TILE_AREA_KM2,
            color,
          }),
        );
      }
    }
  }

  // ─── Queries ─────────────────────────────────────────────────────────────
  async getForUser(userId: number): Promise<Territory | null> {
    return this.territoryRepo.findOne({ where: { userId } });
  }

  async getAll(): Promise<Territory[]> {
    return this.territoryRepo.find({ relations: ['user'] });
  }

  async getTileCrossings(): Promise<
    Record<string, { userId: number; firstname: string; lastname: string; crossingCount: number; color: string }[]>
  > {
    const [crossings, territories] = await Promise.all([
      this.crossingRepo.find({ relations: ['user'] }),
      this.territoryRepo.find(),
    ]);

    const colorMap = new Map(territories.map((t) => [t.userId, t.color]));

    // Sort descending by crossingCount, then by lastCrossedAt as tiebreaker
    crossings.sort((a, b) =>
      b.crossingCount !== a.crossingCount
        ? b.crossingCount - a.crossingCount
        : new Date(b.lastCrossedAt).getTime() - new Date(a.lastCrossedAt).getTime(),
    );

    const result: Record<
      string,
      { userId: number; firstname: string; lastname: string; crossingCount: number; color: string }[]
    > = {};
    for (const c of crossings) {
      if (!result[c.tileKey]) result[c.tileKey] = [];
      if (result[c.tileKey].length < 3) {
        result[c.tileKey].push({
          userId: c.userId,
          firstname: c.user?.firstname ?? '',
          lastname: c.user?.lastname ?? '',
          crossingCount: c.crossingCount,
          color: colorMap.get(c.userId) ?? '#FC4C02',
        });
      }
    }
    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private isInGermany(lat: number, lng: number): boolean {
    return (
      lat >= GERMANY_BOUNDS.latMin && lat <= GERMANY_BOUNDS.latMax &&
      lng >= GERMANY_BOUNDS.lngMin && lng <= GERMANY_BOUNDS.lngMax
    );
  }

  private toTileKey(lat: number, lng: number): string {
    return `${(Math.floor(lat / TILE_STEP) * TILE_STEP).toFixed(2)},${(Math.floor(lng / TILE_STEP) * TILE_STEP).toFixed(2)}`;
  }

  private decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let shift = 0, result = 0, b: number;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
  }
}
