import { writer } from "../../db/writer.js";
import {
  contractWindow,
  contracts,
  postContracts,
  type PlacedQuest,
} from "../../world/quests.js";
import { questsChanged } from "../changes.js";

const upsertContract = writer.prepare<[string, number, number, string]>(`
  INSERT INTO contracts (quest_id, starts_at, ends_at, data)
  VALUES (?, ?, ?, ?)
  ON CONFLICT (quest_id) DO UPDATE SET
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    data = excluded.data
`);
const hasRotated = writer.prepare<[number], { found: number }>(
  "SELECT 1 AS found FROM contracts WHERE starts_at >= ? LIMIT 1"
);

/**
 * Posts the contracts for the two-hour window `now` falls in. What's posted
 * and where its targets are depend only on the window, so a window that has
 * already rotated is skipped unless forced, and a forced rotation posts the
 * same contracts again (picking up any change to their config).
 *
 * Contracts from earlier windows are left in place rather than deleted: a
 * player's progress on one resumes if a later window posts it again.
 *
 * Runs inside the tick as the `rotate_contracts` command, or inside its own
 * transaction from `pnpm cron`.
 */
export const rotateContracts = (
  now: number,
  { force = false }: { force?: boolean } = {}
): PlacedQuest[] => {
  const window = contractWindow(now);
  if (!force && hasRotated.get(window.starts_at)) {
    return [];
  }

  const posted = postContracts(contracts, window);
  console.log("Posting contracts", posted.length);

  for (const contract of posted) {
    upsertContract.run(
      contract.id,
      contract.starts_at,
      contract.ends_at,
      JSON.stringify(contract)
    );
  }

  questsChanged();
  return posted;
};

/**
 * For `pnpm cron`, which runs in its own process: a second writer while the
 * app is up. busy_timeout makes it wait for the current tick to commit.
 */
export const rotateContractsOutsideLoop = ({ force = false } = {}) =>
  writer.transaction(() => rotateContracts(Date.now(), { force }))();
