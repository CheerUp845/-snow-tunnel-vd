export interface TdxDetectionLink {
  LinkID: string;
  RoadDirection: string;
  LaneNum: number;
  ActualLaneNum: number;
}

export interface TdxVdStatic {
  VDID: string;
  PositionLon: number;
  PositionLat: number;
  RoadID?: string;
  RoadName?: string;
  LocationMile?: string;
  DetectionLinks?: TdxDetectionLink[];
}
