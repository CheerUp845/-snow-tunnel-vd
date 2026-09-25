export type Direction = "northbound" | "southbound";
export type Recommendation = "left" | "right" | "neutral" | "insufficient";

export interface VerifiedStation {
  vdId: string;
  direction: Direction;
  mileKm: number;
  linkId: string;
}

export interface TdxVehicle {
  VehicleType: string;
  Volume: number;
  Speed: number;
}

export interface TdxLane {
  LaneID: number;
  LaneType: number;
  Speed: number;
  Occupancy: number;
  Vehicles?: TdxVehicle[];
}

export interface TdxVdLive {
  VDID: string;
  Status: number;
  DataCollectTime: string;
  LinkFlows: Array<{ LinkID: string; Lanes: TdxLane[] }>;
}

export interface DirectionSnapshot {
  leftKph: number | null;
  rightKph: number | null;
  deltaKph: number | null;
  recommendation: Recommendation;
  validStationCount: number;
  expectedStationCount: number;
}
