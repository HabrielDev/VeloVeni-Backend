import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';
import { Territory } from '../territories/territory.entity';
import { TileCrossing } from '../territories/tile-crossing.entity';


// ─── Polyline encoder ─────────────────────────────────────────────────────────
function encodeVal(n: number): string {
  let v = n < 0 ? ~(n << 1) : n << 1;
  let s = '';
  while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
  return s + String.fromCharCode(v + 63);
}
function encodePolyline(pts: [number, number][]): string {
  let r = ''; let pLat = 0; let pLng = 0;
  for (const [lat, lng] of pts) {
    const dLat = Math.round(lat * 1e5) - pLat;
    const dLng = Math.round(lng * 1e5) - pLng;
    r += encodeVal(dLat) + encodeVal(dLng);
    pLat = Math.round(lat * 1e5);
    pLng = Math.round(lng * 1e5);
  }
  return r;
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function interpolate(a: [number, number], b: [number, number], steps: number): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number];
  });
}

function buildRoute(waypoints: [number, number][], density = 30): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = interpolate(waypoints[i], waypoints[i + 1], density);
    if (i > 0) seg.shift();
    pts.push(...seg);
  }
  return pts;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function routeDistance(pts: [number, number][]): number {
  return pts.slice(1).reduce((sum, p, i) => sum + haversine(pts[i], p), 0);
}

// ─── Tile helpers (mirror of backend TerritoryService) ────────────────────────
const TILE_STEP = 0.01;
const TILE_AREA_KM2 = TILE_STEP * 111 * TILE_STEP * 73;
const COLORS = ['#FC4C02', '#2563EB', '#16A34A', '#DC2626', '#9333EA', '#CA8A04', '#0891B2'];

function tileKey(lat: number, lng: number): string {
  return `${(Math.floor(lat / TILE_STEP) * TILE_STEP).toFixed(2)},${(Math.floor(lng / TILE_STEP) * TILE_STEP).toFixed(2)}`;
}

// ─── Route definitions (Stuttgart / Neuhausen / Esslingen area) ───────────────
//
// All coordinates in the range ~48.60–48.82 N, ~9.10–9.45 E
// Neuhausen a.d.F: 48.720 / 9.251  |  Esslingen: 48.740 / 9.305
// Stuttgart: 48.778 / 9.180        |  Bad Cannstatt: 48.802 / 9.219
// Filderstadt: 48.660 / 9.220      |  Leinfelden: 48.690 / 9.145
// Ostfildern: 48.730 / 9.267       |  Plochingen: 8.713 / 9.418

const RAW_ROUTES = {
  // ~18 km, flat Filder loop around Neuhausen/Ostfildern
  A: [
    [48.720, 9.251], [48.710, 9.265], [48.700, 9.282], [48.693, 9.300],
    [48.700, 9.322], [48.715, 9.335], [48.732, 9.320], [48.741, 9.297],
    [48.737, 9.268], [48.726, 9.253], [48.720, 9.251],
  ] as [number, number][],

  // ~25 km, Esslingen along Neckar east to Plochingen and back
  B: [
    [48.740, 9.305], [48.745, 9.330], [48.751, 9.356], [48.746, 9.381],
    [48.730, 9.405], [48.713, 9.418], [48.706, 9.411], [48.716, 9.385],
    [48.728, 9.360], [48.737, 9.335], [48.740, 9.305],
  ] as [number, number][],

  // ~30 km, Neuhausen → Stuttgart Mitte via Möhringen and back
  C: [
    [48.720, 9.251], [48.731, 9.227], [48.742, 9.210],
    [48.753, 9.196], [48.762, 9.186], [48.772, 9.179],
    [48.783, 9.174], [48.802, 9.172], [48.799, 9.188],
    [48.790, 9.198], [48.779, 9.201], [48.768, 9.215],
    [48.757, 9.228], [48.743, 9.238], [48.730, 9.244], [48.720, 9.251],
  ] as [number, number][],

  // ~55 km, Große Filderrunde (Neuhausen → Filderstadt → Leinfelden → Möhringen)
  D: [
    [48.720, 9.251], [48.704, 9.238], [48.685, 9.230], [48.660, 9.221],
    [48.642, 9.198], [48.632, 9.172], [48.658, 9.147], [48.681, 9.138],
    [48.700, 9.130], [48.711, 9.148], [48.718, 9.166], [48.727, 9.157],
    [48.742, 9.176], [48.756, 9.193], [48.751, 9.216], [48.740, 9.232],
    [48.728, 9.244], [48.720, 9.251],
  ] as [number, number][],

  // ~20 km, Bad Cannstatt Runde (north of Stuttgart)
  E: [
    [48.802, 9.219], [48.815, 9.244], [48.821, 9.270], [48.817, 9.292],
    [48.800, 9.287], [48.787, 9.267], [48.774, 9.256], [48.770, 9.236],
    [48.780, 9.219], [48.793, 9.215], [48.802, 9.219],
  ] as [number, number][],

  // ~12 km, Esslingen Weinberge (compact hills around Uhlbach/Rotenberg)
  F: [
    [48.740, 9.305], [48.752, 9.291], [48.764, 9.274], [48.773, 9.269],
    [48.779, 9.283], [48.771, 9.297], [48.759, 9.309], [48.748, 9.316],
    [48.740, 9.305],
  ] as [number, number][],

  // ~28 km, Denkendorf → Nürtingen → Wendlingen loop (south of Esslingen)
  G: [
    [48.697, 9.316], [48.679, 9.321], [48.660, 9.327],
    [48.642, 9.332], [48.622, 9.335], [48.616, 9.348],
    [48.630, 9.365], [48.646, 9.380], [48.661, 9.368],
    [48.674, 9.354], [48.686, 9.340], [48.697, 9.316],
  ] as [number, number][],

  // ~10 km, Kurzrunde Neuhausen/Scharnhausen
  H: [
    [48.720, 9.251], [48.726, 9.267], [48.736, 9.269],
    [48.742, 9.257], [48.737, 9.241], [48.727, 9.238], [48.720, 9.251],
  ] as [number, number][],
};

// Pre-build interpolated routes
type RouteKey = keyof typeof RAW_ROUTES;
const ROUTES: Record<RouteKey, [number, number][]> = {} as any;
for (const key of Object.keys(RAW_ROUTES) as RouteKey[]) {
  ROUTES[key] = buildRoute(RAW_ROUTES[key], 25);
}

// Approx elevation gain per route (m)
const ELEVATION: Record<RouteKey, number> = { A: 140, B: 175, C: 460, D: 630, E: 195, F: 275, G: 320, H: 75 };

// Approx pace factor: seconds per meter
const PACE: Record<RouteKey, number> = { A: 0.135, B: 0.140, C: 0.175, D: 0.155, E: 0.145, F: 0.195, G: 0.160, H: 0.165 };

// ─── Rider definitions ────────────────────────────────────────────────────────
interface Rider {
  stravaId: string;
  firstname: string;
  lastname: string;
  profilePicture: string;
  // Routes this rider does, with repetition counts
  schedule: Array<{ route: RouteKey; times: number; namePrefix: string }>;
}

const RIDERS: Rider[] = [
  {
    stravaId: '99001001', firstname: 'Felix', lastname: 'Brandt',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=FelixBrandt',
    schedule: [
      { route: 'A', times: 4, namePrefix: 'Neuhausen Runde' },
      { route: 'B', times: 3, namePrefix: 'Neckartour Esslingen' },
      { route: 'C', times: 3, namePrefix: 'Auffahrt Stuttgart' },
      { route: 'D', times: 2, namePrefix: 'Große Filderrunde' },
      { route: 'E', times: 2, namePrefix: 'Cannstatter Ausfahrt' },
      { route: 'F', times: 3, namePrefix: 'Esslinger Weinberge' },
      { route: 'H', times: 2, namePrefix: 'Feierabendrunde' },
    ],
  },
  {
    stravaId: '99001002', firstname: 'Laura', lastname: 'Mayer',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=LauraMayer',
    schedule: [
      { route: 'A', times: 3, namePrefix: 'Ostfildern Loop' },
      { route: 'B', times: 3, namePrefix: 'Neckarradweg' },
      { route: 'F', times: 3, namePrefix: 'Weinbergtour' },
      { route: 'G', times: 2, namePrefix: 'Filstaltour' },
      { route: 'H', times: 2, namePrefix: 'Morgenrunde' },
    ],
  },
  {
    stravaId: '99001003', firstname: 'Jonas', lastname: 'Schäfer',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=JonasSchaefer',
    schedule: [
      { route: 'C', times: 3, namePrefix: 'Stuttgart Bergauffahrt' },
      { route: 'D', times: 3, namePrefix: 'Filderrunde XL' },
      { route: 'G', times: 3, namePrefix: 'Nürtingen Tour' },
    ],
  },
  {
    stravaId: '99001004', firstname: 'Mia', lastname: 'Hoffmann',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=MiaHoffmann',
    schedule: [
      { route: 'A', times: 3, namePrefix: 'Flache Runde' },
      { route: 'F', times: 3, namePrefix: 'Esslinger Weinberge' },
      { route: 'H', times: 3, namePrefix: 'Kurzausfahrt' },
    ],
  },
  {
    stravaId: '99001005', firstname: 'Tobias', lastname: 'Kern',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=TobiasKern',
    schedule: [
      { route: 'D', times: 3, namePrefix: 'Wochenend-Ausfahrt' },
      { route: 'C', times: 3, namePrefix: 'Stuttgart Loop' },
      { route: 'B', times: 2, namePrefix: 'Neckartour' },
    ],
  },
  {
    stravaId: '99001006', firstname: 'Sophie', lastname: 'Walter',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=SophieWalter',
    schedule: [
      { route: 'B', times: 2, namePrefix: 'Neckartal' },
      { route: 'F', times: 2, namePrefix: 'Weinberge Tour' },
      { route: 'G', times: 2, namePrefix: 'Filstal Ausfahrt' },
      { route: 'H', times: 2, namePrefix: 'Feierabendrunde' },
    ],
  },
  {
    stravaId: '99001007', firstname: 'Lukas', lastname: 'Bauer',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=LukasBauer',
    schedule: [
      { route: 'E', times: 3, namePrefix: 'Cannstatter Tour' },
      { route: 'H', times: 3, namePrefix: 'Abendrunde' },
    ],
  },
  {
    stravaId: '99001008', firstname: 'Anna', lastname: 'Fischer',
    profilePicture: 'https://api.dicebear.com/8.x/avataaars/svg?seed=AnnaFischer',
    schedule: [
      { route: 'H', times: 2, namePrefix: 'Erste Runde' },
      { route: 'F', times: 2, namePrefix: 'Weinberge' },
      { route: 'A', times: 1, namePrefix: 'Neuhausen Runde' },
    ],
  },
];

// Spread activities across the last 6 months
function makeDate(totalActivities: number, index: number): Date {
  const now = new Date('2026-03-15');
  const start = new Date('2025-09-01');
  const range = now.getTime() - start.getTime();
  const d = new Date(start.getTime() + (range / (totalActivities + 1)) * (index + 1));
  // Set time to morning (7-9am)
  d.setHours(7 + (index % 3), 0, 0, 0);
  return d;
}

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Territory) private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(TileCrossing) private readonly crossingRepo: Repository<TileCrossing>,
  ) {}

  async seed() {
    const existing = await this.userRepo.findOne({ where: { stravaId: '99001001' } });
    if (existing) {
      console.log('Demo data already seeded — fixing territory colors and privacy settings...');
      const demoIds = RIDERS.map((r) => r.stravaId);
      for (const stravaId of demoIds) {
        await this.userRepo.update({ stravaId }, { shareZones: true, shareRides: true });
      }
      // Clean up duplicate territory records and reassign correct colors
      await this.resolveOwnership();
      console.log('Demo data fixed.');
      return;
    }

    console.log('Seeding demo data for Stuttgart/Neuhausen/Esslingen riders...');

    for (const rider of RIDERS) {
      // 1. Create user
      const savedUser = await this.userRepo.save(
        this.userRepo.create({
          stravaId: rider.stravaId,
          firstname: rider.firstname,
          lastname: rider.lastname,
          profilePicture: rider.profilePicture,
          shareZones: true,
          shareRides: true,
        }),
      );
      console.log(`  Created user: ${rider.firstname} ${rider.lastname} (id=${savedUser.id})`);

      // 2. Build activities + track per-tile crossings
      const crossingMap = new Map<string, { count: number; lastDate: Date }>();
      let totalCount = rider.schedule.reduce((s, e) => s + e.times, 0);
      let actIdx = 0;
      let activityCount = 0;

      for (const entry of rider.schedule) {
        const pts = ROUTES[entry.route];
        const dist = routeDistance(pts);
        const movingTime = Math.round(dist * PACE[entry.route]);
        const polyline = encodePolyline(pts);
        // Unique tiles this route covers
        const routeTiles = new Set(pts.map(([lat, lng]) => tileKey(lat, lng)));

        for (let i = 0; i < entry.times; i++) {
          const startDate = makeDate(totalCount, actIdx++);
          await this.activityRepo.save(
            this.activityRepo.create({
              stravaActivityId: `demo_${rider.stravaId}_${entry.route}_${i}`,
              userId: savedUser.id,
              name: `${entry.namePrefix}${entry.times > 1 ? ` #${i + 1}` : ''}`,
              distance: Math.round(dist + (Math.random() - 0.5) * dist * 0.05),
              movingTime: Math.round(movingTime + (Math.random() - 0.5) * movingTime * 0.08),
              elevationGain: Math.round(ELEVATION[entry.route] * (0.9 + Math.random() * 0.2)),
              sportType: 'Ride',
              startDate,
              startLat: pts[0][0],
              startLng: pts[0][1],
              summaryPolyline: polyline,
              qualifying: true,
              qualifyingReason: null,
            }),
          );
          activityCount++;

          // Each activity = 1 crossing per tile it covers
          for (const key of routeTiles) {
            const cur = crossingMap.get(key);
            if (cur) {
              cur.count++;
              if (startDate > cur.lastDate) cur.lastDate = startDate;
            } else {
              crossingMap.set(key, { count: 1, lastDate: startDate });
            }
          }
        }
      }

      // 3. Save TileCrossing rows for this user
      const crossings = Array.from(crossingMap.entries()).map(([key, data]) =>
        this.crossingRepo.create({
          tileKey: key,
          userId: savedUser.id,
          crossingCount: data.count,
          lastCrossedAt: data.lastDate,
        }),
      );
      await this.crossingRepo.save(crossings);

      console.log(`    → ${activityCount} activities, ${crossings.length} tile-crossings`);
    }

    // 4. Resolve ownership globally and build Territory records
    console.log('\nResolving tile ownership...');
    await this.resolveOwnership();
    console.log('Demo seed complete!');
  }

  private async resolveOwnership(): Promise<void> {
    const allCrossings = await this.crossingRepo.find();

    const tileOwners = new Map<string, { userId: number; count: number; lastDate: Date }>();
    for (const c of allCrossings) {
      const cur = tileOwners.get(c.tileKey);
      const beats =
        !cur ||
        c.crossingCount > cur.count ||
        (c.crossingCount === cur.count && c.lastCrossedAt > cur.lastDate);
      if (beats) tileOwners.set(c.tileKey, { userId: c.userId, count: c.crossingCount, lastDate: c.lastCrossedAt });
    }

    const userTiles = new Map<number, string[]>();
    for (const [key, owner] of tileOwners) {
      const list = userTiles.get(owner.userId) ?? [];
      list.push(key);
      userTiles.set(owner.userId, list);
    }

    const allUserIds = new Set(allCrossings.map((c) => c.userId));
    for (const userId of allUserIds) {
      const tiles = userTiles.get(userId) ?? [];
      const color = COLORS[userId % COLORS.length];

      // Delete ALL existing territory records for this user (cleanup duplicates)
      await this.territoryRepo.delete({ userId });

      // Create a single clean record
      await this.territoryRepo.save(
        this.territoryRepo.create({
          userId,
          tiles,
          tileCount: tiles.length,
          areaKm2: tiles.length * TILE_AREA_KM2,
          color,
        }),
      );
      console.log(`  ${userId}: ${tiles.length} owned tiles (${(tiles.length * TILE_AREA_KM2).toFixed(1)} km²)`);
    }
  }
}
