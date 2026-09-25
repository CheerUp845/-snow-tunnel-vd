import type { Direction, DirectionSnapshot, TdxLane, TdxVdLive, VerifiedStation } from "../domain.ts";

export function median(values: number[]): number {
  if (values.length === 0) throw new Error("median requires at least one value");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function laneVolume(lane: TdxLane): number {
  return (lane.Vehicles ?? []).reduce((sum, item) => sum + Math.max(0, item.Volume), 0);
}

function validLane(lane: TdxLane | undefined): lane is TdxLane {
  if (!lane) return false;
  if (!Number.isFinite(lane.Speed) || !Number.isFinite(lane.Occupancy)) return false;
  if (lane.Speed === -99 || lane.Occupancy === -99) return false;
  if (lane.Speed < 0 || lane.Speed > 160 || lane.Occupancy < 0) return false;
  if (lane.Speed === 0 && lane.Occupancy === 0 && laneVolume(lane) === 0) return false;
  return true;
}

export function pairedLanes(live: TdxVdLive | undefined, linkId: string): { left: TdxLane; right: TdxLane } | null {
  if (!live || live.Status !== 0) return null;
  const lanes = live.LinkFlows.find((flow) => flow.LinkID === linkId)?.Lanes ?? [];
  const left = lanes.find((lane) => lane.LaneID === 0);
  const right = lanes.find((lane) => lane.LaneID === 1);
  return validLane(left) && validLane(right) ? { left, right } : null;
}

export function aggregateDirection(
  stations: VerifiedStation[],
  liveById: Map<string, TdxVdLive>,
  direction: Direction,
): DirectionSnapshot {
  const expected = stations.filter((s) => s.direction === direction);
  const pairs = expected.flatMap((station) => {
    const pair = pairedLanes(liveById.get(station.vdId), station.linkId);
    return pair ? [pair] : [];
  });

  const minimum = Math.ceil(expected.length * 0.5);
  if (expected.length === 0 || pairs.length < minimum) {
    return {
      leftKph: null,
      rightKph: null,
      deltaKph: null,
      recommendation: "insufficient",
      validStationCount: pairs.length,
      expectedStationCount: expected.length,
    };
  }

  const leftKph = median(pairs.map((p) => p.left.Speed));
  const rightKph = median(pairs.map((p) => p.right.Speed));
  const deltaKph = Math.abs(leftKph - rightKph);
  const recommendation = deltaKph < 5 ? "neutral" : leftKph > rightKph ? "left" : "right";

  return {
    leftKph,
    rightKph,
    deltaKph,
    recommendation,
    validStationCount: pairs.length,
    expectedStationCount: expected.length,
  };
}
