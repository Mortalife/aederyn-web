import type { ResourceModel } from "../config";
import { client } from "../database";
import { PubSub, ZONE_EVENT } from "../sse/pubsub";

export type ResourceUsage = {
  x: number;
  y: number;
  resource_id: string;
  qty: number;
  refresh_at: number;
};

export const markResourceUsed = async (
  x: number,
  y: number,
  resource: ResourceModel
) => {
  if (resource.limitless) {
    return true;
  }

  const result = await client.execute({
    sql: "SELECT * FROM resource_usage WHERE x = ? AND y = ? AND resource_id = ?",
    args: [x, y, resource.id],
  });

  if (result.rows.length) {
    const usage = result.rows[0] as unknown as ResourceUsage;
    if (usage.qty >= resource.amount) {
      return false;
    }
  }

  const interval = Math.floor(resource.collectionTime * 5 * 1000);

  const refresh_at = Date.now() + interval;
  await client.execute({
    sql: "INSERT INTO resource_usage (x, y, resource_id, qty, refresh_at, interval) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (x,y,resource_id) DO UPDATE SET qty = resource_usage.qty + 1",
    args: [x, y, resource.id, 1, refresh_at, interval],
  });

  PubSub.publish(ZONE_EVENT, {
    x,
    y,
  });

  return true;
};

export const getResourceUsage = async (x: number, y: number) => {
  const result = await client.execute({
    sql: "SELECT * FROM resource_usage WHERE x = ? AND y = ?",
    args: [x, y],
  });
  return result.rows as unknown as ResourceUsage[];
};

export const cleanupResources = async () => {
  const now = Date.now();
  // Remove anything that's finished
  const deletedResources = await client.execute({
    sql: "SELECT * FROM resource_usage WHERE refresh_at < ? AND qty = 1",
    args: [now],
  });

  await client.execute({
    sql: "DELETE FROM resource_usage WHERE refresh_at < ? AND qty = 1",
    args: [now],
  });

  // Update everything else

  const updatedResources = await client.execute({
    sql: "SELECT * FROM resource_usage WHERE refresh_at < ? AND qty > 1",
    args: [now],
  });

  await client.execute({
    sql: "UPDATE resource_usage SET qty = resource_usage.qty - 1, refresh_at = resource_usage.refresh_at + resource_usage.interval WHERE refresh_at < ?",
    args: [now],
  });

  const zones = [...deletedResources.rows, ...updatedResources.rows].reduce<
    Set<{
      x: number;
      y: number;
    }>
  >((acc, row) => {
    const usage = row as unknown as ResourceUsage;
    acc.add({ x: usage.x, y: usage.y });
    return acc;
  }, new Set());

  zones.forEach((zone) => {
    PubSub.publish(ZONE_EVENT, zone);
  });
};
