import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Territory } from '../territory.entity';
import { Activity } from '../../activities/activity.entity';

// ~0.81 km² per tile at Germany's latitude
const TILE_STEP = 0.01;
const TILE_AREA_KM2 = TILE_STEP * 111 * TILE_STEP * 73;

const GERMANY_BOUNDS = { latMin: 47.27, latMax: 55.06, lngMin: 5.87, lngMax: 15.04 };

// One color per user (cycle through palette)
const COLORS = ['#FC4C02', '#2563EB', '#16A34A', '#DC2626', '#9333EA', '#CA8A04', '#0891B2'];

@Injectable()
export class TerritoryService {
  constructor(
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
  ) {}

  async recalculateForUser(userId: number, activities: Activity[]): Promise<void> {
    const allTiles = new Set<string>();

    for (const activity of activities) {
      if (!activity.summaryPolyline) continue;
      const points = this.decodePolyline(activity.summaryPolyline);
      for (const [lat, lng] of points) {
        if (this.isInGermany(lat, lng)) {
          allTiles.add(this.toTileKey(lat, lng));
        }
      }
    }

    const color = COLORS[userId % COLORS.length];
    const tiles = Array.from(allTiles);

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

  async getForUser(userId: number): Promise<Territory | null> {
    return this.territoryRepo.findOne({ where: { userId } });
  }

  async getAll(): Promise<Territory[]> {
    return this.territoryRepo.find({ relations: ['user'] });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private isInGermany(lat: number, lng: number): boolean {
    return (
      lat >= GERMANY_BOUNDS.latMin && lat <= GERMANY_BOUNDS.latMax &&
      lng >= GERMANY_BOUNDS.lngMin && lng <= GERMANY_BOUNDS.lngMax
    );
  }

  private toTileKey(lat: number, lng: number): string {
    const tLat = (Math.floor(lat / TILE_STEP) * TILE_STEP).toFixed(2);
    const tLng = (Math.floor(lng / TILE_STEP) * TILE_STEP).toFixed(2);
    return `${tLat},${tLng}`;
  }

  private decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let shift = 0, result = 0, b: number;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; }
      while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; }
      while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
  }
}
