import type { ResourceModel } from "../../config.js";
import { writer } from "../../db/writer.js";
import type { ResourceUsage } from "../../world/resources.js";
import { zoneChanged } from "../changes.js";

const selectUsage = writer.prepare<[number, number, string], ResourceUsage>(
  "SELECT * FROM resource_usage WHERE x = ? AND y = ? AND resource_id = ?"
);
const upsertUsage = writer.prepare<
  [number, number, string, number, number, number]
>(
  "INSERT INTO resource_usage (x, y, resource_id, qty, refresh_at, interval) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (x,y,resource_id) DO UPDATE SET qty = resource_usage.qty + 1"
);
const deleteExpiredUsage = writer.prepare<[number], ResourceUsage>(
  "DELETE FROM resource_usage WHERE refresh_at < ? AND qty = 1 RETURNING *"
);
const refreshExpiredUsage = writer.prepare<[number], ResourceUsage>(
  "UPDATE resource_usage SET qty = resource_usage.qty - 1, refresh_at = resource_usage.refresh_at + resource_usage.interval WHERE refresh_at < ? RETURNING *"
);

export const markResourceUsed = (
  x: number,
  y: number,
  resource: ResourceModel,
  now: number
) => {
  if (resource.limitless) {
    return true;
  }

  const usage = selectUsage.get(x, y, resource.id);

  if (usage && usage.qty >= resource.amount) {
    return false;
  }

  const interval = Math.floor(resource.collectionTime * 5 * 1000);

  upsertUsage.run(x, y, resource.id, 1, now + interval, interval);
  zoneChanged(x, y);

  return true;
};

// Remove anything that's finished, and step everything else down one.
export const cleanupResources = (now: number) => {
  const changed = [
    ...deleteExpiredUsage.all(now),
    ...refreshExpiredUsage.all(now),
  ];

  for (const usage of changed) {
    zoneChanged(usage.x, usage.y);
  }
};
