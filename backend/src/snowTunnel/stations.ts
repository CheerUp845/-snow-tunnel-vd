import { SNOW_TUNNEL } from "../config.ts";
import type { Direction, TdxVdLive, VerifiedStation } from "../domain.ts";
import type { TdxDetectionLink, TdxVdStatic } from "../tdx/types.ts";

export function parseMileage(value: string | undefined): number | null {
  if (!value) return null;
  const compact = value.trim().replace(/\s+/g, "");
  let match = compact.match(/^(\d+(?:\.\d+)?)K\+(\d{1,3})$/i);
  if (match) return Number(match[1]) + Number(match[2]) / 1000;
  match = compact.match(/^(\d+(?:\.\d+)?)K$/i);
  if (match) return Number(match[1]);
  if (/^\d+(?:\.\d+)?$/.test(compact)) return Number(compact);
  return null;
}

function normalizeDirection(value: string): Direction | null {
  const v = value.trim().toUpperCase();
  if (["N", "NB", "NORTH", "NORTHBOUND", "北", "北向"].includes(v)) return "northbound";
  if (["S", "SB", "SOUTH", "SOUTHBOUND", "南", "南向"].includes(v)) return "southbound";
  return null;
}

function normalizedRoadToken(value: string | undefined): string {
  return (value ?? "").toUpperCase().replace(/[\s_-]/g, "");
}

function isN5Candidate(record: TdxVdStatic): boolean {
  const tokens = [record.RoadID, record.RoadName, record.VDID].map(normalizedRoadToken);
  return tokens.some((token) =>
    token.includes("N5") ||
    token.includes("國道5") ||
    token.includes("國5") ||
    token === "000050" ||
    token.startsWith("000050"),
  );
}

function inCorridor(record: TdxVdStatic): boolean {
  const { minLat, maxLat, minLon, maxLon } = SNOW_TUNNEL.corridor;
  return Number.isFinite(record.PositionLat) && Number.isFinite(record.PositionLon) &&
    record.PositionLat >= minLat && record.PositionLat <= maxLat &&
    record.PositionLon >= minLon && record.PositionLon <= maxLon;
}

function chooseDirectionLink(links: TdxDetectionLink[] | undefined): { direction: Direction; link: TdxDetectionLink } | null {
  const recognized = (links ?? [])
    .map((link) => ({ link, direction: normalizeDirection(link.RoadDirection) }))
    .filter((item): item is { link: TdxDetectionLink; direction: Direction } => item.direction !== null);
  const directions = new Set(recognized.map((item) => item.direction));
  if (directions.size !== 1 || recognized.length === 0) return null;
  const direction = recognized[0].direction;
  const link = recognized.find((item) => item.direction === direction)?.link;
  return link ? { direction, link } : null;
}

export function discoverSnowTunnelStations(records: TdxVdStatic[]): VerifiedStation[] {
  const byId = new Map<string, VerifiedStation>();

  for (const record of records) {
    if (!isN5Candidate(record) || !inCorridor(record)) continue;
    const mileKm = parseMileage(record.LocationMile);
    const directionLink = chooseDirectionLink(record.DetectionLinks);
    if (mileKm === null || !directionLink) continue;

    const bounds = SNOW_TUNNEL[directionLink.direction];
    if (mileKm < bounds.minKm || mileKm > bounds.maxKm) continue;

    byId.set(record.VDID, {
      vdId: record.VDID,
      direction: directionLink.direction,
      mileKm,
      linkId: directionLink.link.LinkID,
    });
  }

  return [...byId.values()].sort((a, b) =>
    a.direction.localeCompare(b.direction) || a.mileKm - b.mileKm || a.vdId.localeCompare(b.vdId),
  );
}

export function indexLive(records: TdxVdLive[]): Map<string, TdxVdLive> {
  return new Map(records.map((record) => [record.VDID, record]));
}
