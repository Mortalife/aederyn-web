import { reader } from "../db/reader.js";

export type ResourceUsage = {
  x: number;
  y: number;
  resource_id: string;
  qty: number;
  refresh_at: number;
};

const selectAreaUsage = reader.prepare<
  { fromX: number; toX: number; fromY: number; toY: number },
  ResourceUsage
>(
  "SELECT * FROM resource_usage WHERE x BETWEEN :fromX AND :toX AND y BETWEEN :fromY AND :toY"
);

/** Usage for every tile in an area (inclusive), in one query. */
export const getResourceUsageInArea = (area: {
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
}) => selectAreaUsage.all(area);
