import type { Direction, DirectionSnapshot, TdxVdLive, VerifiedStation } from "../domain.ts";
import type { TdxTrafficSource } from "../tdx/client.ts";
import { aggregateDirection, pairedLanes } from "./aggregate.ts";
import { discoverSnowTunnelStations, indexLive } from "./stations.ts";

const STATIC_STATION_TTL_MS = 24 * 60 * 60 * 1000;
const LIVE_SNAPSHOT_TTL_MS = 55 * 1000;
const STALE_AFTER_MS = 180 * 1000;

export interface SnowTunnelSnapshot {
  updatedAt: string;
  isStale: boolean;
  northbound: DirectionSnapshot;
  southbound: DirectionSnapshot;
}

interface TimedCache<T> {
  value: T;
  expiresAtMs: number;
}

function suppressRecommendation(snapshot: DirectionSnapshot): DirectionSnapshot {
  return { ...snapshot, recommendation: "insufficient" };
}

function forceStale(snapshot: SnowTunnelSnapshot): SnowTunnelSnapshot {
  return {
    ...snapshot,
    isStale: true,
    northbound: suppressRecommendation(snapshot.northbound),
    southbound: suppressRecommendation(snapshot.southbound),
  };
}

function newestUsableTime(
  stations: VerifiedStation[],
  liveById: Map<string, TdxVdLive>,
  direction: Direction,
): number | null {
  const values = stations
    .filter((station) => station.direction === direction)
    .flatMap((station) => {
      const live = liveById.get(station.vdId);
      if (!live || !pairedLanes(live, station.linkId)) return [];
      const timestamp = Date.parse(live.DataCollectTime);
      return Number.isFinite(timestamp) ? [timestamp] : [];
    });
  return values.length ? Math.max(...values) : null;
}

export class SnowTunnelService {
  private stationCache: TimedCache<VerifiedStation[]> | null = null;
  private liveSnapshotCache: TimedCache<SnowTunnelSnapshot> | null = null;
  private lastSuccessfulSnapshot: SnowTunnelSnapshot | null = null;
  private lastRawLiveById: Map<string, TdxVdLive> | null = null;
  private readonly source: TdxTrafficSource;
  private readonly nowMs: () => number;

  constructor(source: TdxTrafficSource, nowMs: () => number = Date.now) {
    this.source = source;
    this.nowMs = nowMs;
  }

  clearLiveCacheForTest(): void {
    this.liveSnapshotCache = null;
  }

  private async getStations(now: number): Promise<VerifiedStation[]> {
    if (this.stationCache && now < this.stationCache.expiresAtMs) return this.stationCache.value;
    const records = await this.source.getStaticFreewayVd();
    const value = discoverSnowTunnelStations(records);
    this.stationCache = { value, expiresAtMs: now + STATIC_STATION_TTL_MS };
    return value;
  }

  private applyCurrentFreshness(snapshot: SnowTunnelSnapshot, now: number): SnowTunnelSnapshot {
    const updated = Date.parse(snapshot.updatedAt);
    if (snapshot.isStale || !Number.isFinite(updated) || now - updated > STALE_AFTER_MS) return forceStale(snapshot);
    return snapshot;
  }

  async getSnapshot(): Promise<SnowTunnelSnapshot> {
    const now = this.nowMs();
    if (this.liveSnapshotCache && now < this.liveSnapshotCache.expiresAtMs) {
      return this.applyCurrentFreshness(this.liveSnapshotCache.value, now);
    }

    try {
      const stations = await this.getStations(now);
      const live = await this.source.getLiveFreewayVd();
      const liveById = indexLive(live);
      this.lastRawLiveById = liveById;

      const northbound = aggregateDirection(stations, liveById, "northbound");
      const southbound = aggregateDirection(stations, liveById, "southbound");
      const northTime = newestUsableTime(stations, liveById, "northbound");
      const southTime = newestUsableTime(stations, liveById, "southbound");
      const availableTimes = [northTime, southTime].filter((value): value is number => value !== null);
      if (availableTimes.length === 0) throw new Error("No usable Snow Tunnel live data");

      const updatedAtMs = northTime !== null && southTime !== null
        ? Math.min(northTime, southTime)
        : availableTimes[0];
      const ageStale = now - updatedAtMs > STALE_AFTER_MS;

      let snapshot: SnowTunnelSnapshot = {
        updatedAt: new Date(updatedAtMs).toISOString(),
        isStale: ageStale,
        northbound,
        southbound,
      };
      if (snapshot.isStale) snapshot = forceStale(snapshot);

      this.lastSuccessfulSnapshot = snapshot;
      this.liveSnapshotCache = { value: snapshot, expiresAtMs: now + LIVE_SNAPSHOT_TTL_MS };
      return snapshot;
    } catch (error) {
      if (this.lastSuccessfulSnapshot) return forceStale(this.lastSuccessfulSnapshot);
      throw error;
    }
  }
}
