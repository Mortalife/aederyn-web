import type { HtmlEscapedString } from "hono/utils/html";
import { raw } from "hono/html";
import { ZoneEquipment, ZoneInventory } from "../../templates/bag.js";
import { ZoneMonsters } from "../../templates/combat.js";
import { UserInfo } from "../../templates/hud.js";
import { Minimap, WorldMap } from "../../templates/map.js";
import { Tracker, TrackerLine } from "../../templates/tracker.js";
import { ZonePlayers } from "../../templates/social.js";
import { Activity } from "../../templates/activity.js";
import { Journal } from "../../templates/journal.js";
import { LogChat, LogCombat, LogGame } from "../../templates/log.js";
import {
  Zone,
  ZoneHeader,
  ZoneNPCs,
  ZoneNav,
  ZoneResources,
} from "../../templates/zone.js";
import { Game, Scene } from "../../templates/game.js";
import { ContractBoard, Dialogue, Quests } from "../../templates/quests.js";
import {
  chatVersion,
  onlineVersion,
  userVersion,
  zoneVersion,
} from "../versions.js";
import { UNARMED } from "../../config.js";
import { tileKey } from "../../user/discoveries.js";
import { selectJournal, type GameView } from "./select.js";

/**
 * A piece of the screen with a stable element id. `key` names everything
 * the render depends on, so the same key always renders the same HTML:
 * that's what lets a render be skipped, or shared by everyone whose key
 * matches (a zone's player list, say).
 */
export type Fragment = {
  id: string;
  key: string;
  /** Templates are synchronous here, so the result is never a promise. */
  render: () => HtmlEscapedString | Promise<HtmlEscapedString>;
};

export type Screen = {
  /** "map" or "zone:x,y". A new layout replaces all of `#scene`. */
  layout: string;
  /**
   * The HUD, side panel and log: on screen whatever the layout, so a
   * layout change leaves them alone and patches them one by one.
   */
  regions: Fragment[];
  /** What's inside `#scene`, patched one by one while the layout holds. */
  parts: Fragment[];
  /** Assembles `#scene` from the parts' HTML, by id. */
  scene: (parts: Map<string, string>) => HtmlEscapedString;
};

/** Names each `activeQuests` array, which is replaced whenever it's re-read. */
const questSetIds = new WeakMap<object, number>();
let nextQuestSetId = 0;
const questSetId = (quests: object) => {
  let id = questSetIds.get(quests);
  if (id === undefined) {
    id = nextQuestSetId++;
    questSetIds.set(quests, id);
  }
  return id;
};

/** The main hand's weapon while it has durability left, as combat uses it. */
const workingWeapon = (user: GameView["user"]) => {
  const item = user.e.mainHand?.item;
  const durability = item?.durability?.current ?? 0;
  return item?.weapon && durability > 0
    ? {
        name: item.name,
        speed: item.weapon.speed,
        durability,
        maxDurability: item.durability!.max,
      }
    : null;
};

export const buildScreen = (view: GameView, activeQuests: object): Screen => {
  const { user } = view;
  const u = `${user.id}:u${userVersion(user.id)}`;
  const aq = `aq${questSetId(activeQuests)}`;
  const f = `f${view.flashKey}`;
  const here = user.z ? view.map.find((tile) => tile.here)! : null;
  const zone = here ? `${here.x},${here.y}` : null;
  const z = here ? `z${zoneVersion(here.x, here.y)}` : null;
  const d = `d${view.discoveryVersion}`;
  const glows = new Map(
    view.map.flatMap((tile) => {
      const key = tileKey(tile.x, tile.y);
      const message = view.contextFlashes.get(`discovery:tile:${key}`);
      return message ? [[key, message] as const] : [];
    })
  );
  const g = `g${[...glows.values()].map((m) => m.id).join(",")}`;
  const mapProps = {
    map: view.map,
    indicators: view.mapIndicators,
    discoveries: view.discoveries,
    glows,
  };

  const regions: Fragment[] = [
    {
      id: "hud",
      key: `${u}:o${onlineVersion()}:h${view.hitsKey}`,
      render: () =>
        UserInfo(
          user,
          view.totalPlayersOnline,
          view.effects,
          view.combatLog.find(({ hit }) => hit.by_monster)?.hit
        ),
    },
    {
      id: "activity",
      // Progress bars and swing timers run on the client: no clock here.
      key: `${u}:h${view.hitsKey}:${view.activityKey}:${d}`,
      render: () =>
        Activity(view.activity, {
          userId: user.id,
          health: user.h,
          weaponSpeed: workingWeapon(user)?.speed ?? UNARMED.speed,
          knownOutputs: view.discoveries.resourceOutputs,
        }),
    },
    {
      id: "inventory",
      key: `${u}:ob${[...view.objectiveItems].join(",")}:uh${[...view.usableHere].join(",")}`,
      render: () =>
        ZoneInventory(user, {
          objectiveItems: view.objectiveItems,
          usableHere: view.usableHere,
        }),
    },
    {
      id: "equipment",
      key: u,
      render: () => ZoneEquipment(user),
    },
    {
      id: "quests",
      key: `${u}:${aq}:${f}:t${view.clock}`,
      render: () =>
        Quests({
          zoneQuests: view.quests,
          npcInteractions: view.npcInteractions,
          flashMessage: view.contextFlashes.get("quest"),
          residents: new Set(view.npcs.map(({ npc }) => npc.entity_id)),
          inZone: user.z,
          now: view.clock,
        }),
    },
    {
      id: "journal",
      key: `${user.id}:${d}`,
      render: () => Journal(selectJournal(view.discoveries)),
    },
    {
      id: "minimap",
      key: `${u}:${aq}:${d}:${g}`,
      render: () => Minimap({ ...mapProps, inZone: user.z }),
    },
    {
      id: "tracker",
      key: `${u}:${aq}`,
      render: () => Tracker(view.tracked),
    },
    {
      id: "tracker-line",
      key: `${u}:${aq}`,
      render: () => TrackerLine(view.tracked),
    },
    {
      id: "dialogue",
      key: `${u}:${aq}:${d}`,
      render: () => Dialogue(view.npcInteractions, view.discoveries.npcs),
    },
    {
      id: "zone-players",
      // Shared by everyone in the zone: no user in the key.
      key: zone ? `${zone}:${z}` : "map",
      render: () => ZonePlayers(zone ? view.zoneUsers : null),
    },
    {
      id: "log-game",
      key: `${user.id}:m${view.messagesKey}`,
      render: () => LogGame(view.messages),
    },
    {
      id: "log-chat",
      // Shared by everyone whose history starts at the same message.
      key: `c${chatVersion()}:${view.chatMessages.at(-1)?.id ?? ""}`,
      render: () => LogChat(view.chatMessages),
    },
    {
      id: "log-combat",
      key: `${user.id}:${view.combatLog.map(({ hit }) => hit.id).join(",")}`,
      render: () => LogCombat(view.combatLog, user.id),
    },
  ];

  if (!here) {
    const worldMap: Fragment = {
      id: "world-map",
      key: `${u}:${aq}:${d}:${g}`,
      render: () => WorldMap(mapProps),
    };

    return {
      layout: "map",
      regions,
      parts: [worldMap],
      scene: (parts) => part(Scene(part(parts, "world-map"))),
    };
  }

  const parts: Fragment[] = [
    {
      id: "zone-header",
      // Tile config only, which doesn't change while the game runs.
      key: zone!,
      render: () => ZoneHeader(here),
    },
    {
      id: "zone-nav",
      key: `${u}:${z}:${aq}`,
      render: () =>
        ZoneNav({
          worldTile: here,
          monsters: view.monsters,
          residents: view.npcs,
          board: view.board,
          resourceObjectives: view.resourceObjectives,
          monsterObjectives: view.monsterObjectives,
          npcAttention: new Set([
            ...view.npcInteractions.map((i) => i.objective.entity_id),
            ...view.quests.completableQuests.flatMap((q) =>
              q.completion.entity_id ? [q.completion.entity_id] : []
            ),
          ]),
        }),
    },
    {
      id: "npcs",
      key: `${u}:${zone}:${aq}:${f}:${d}`,
      render: () =>
        ZoneNPCs(view.npcs, {
          known: view.discoveries.npcs,
          completable: view.quests.completableQuests,
          interactions: view.npcInteractions,
          contextFlashes: view.contextFlashes,
        }),
    },
    {
      id: "board",
      key: `${u}:${zone}:${aq}:${f}:t${view.clock}`,
      render: () =>
        ContractBoard({
          contracts: view.board,
          flashMessage: view.contextFlashes.get("quest"),
          now: view.clock,
        }),
    },
    {
      id: "resources",
      // The progress bar runs on the client, so this has no clock in its key.
      key: `${u}:${z}:${aq}:${f}:${d}`,
      render: () =>
        ZoneResources({
          worldTile: here,
          user,
          inprogress: view.inprogress,
          resourceObjectives: view.resourceObjectives,
          contextFlashes: view.contextFlashes,
          discoveries: view.discoveries,
        }),
    },
    {
      id: "monsters",
      // Attack and flee controls depend on the viewer's equipment and action.
      key: `${u}:${z}:${f}:h${view.hitsKey}:${d}`,
      render: () => ZoneMonsters(view.monsters, {
        userId: user.id,
        weapon: workingWeapon(user),
        gathering: !!view.inprogress,
        contextFlashes: view.contextFlashes,
        discoveries: view.discoveries,
      }),
    },
  ];

  return {
    layout: `zone:${zone}`,
    regions,
    parts,
    scene: (parts) =>
      part(
        Scene(
          part(
            Zone({
              header: part(parts, "zone-header"),
              nav: part(parts, "zone-nav"),
              npcs: part(parts, "npcs"),
              board: part(parts, "board"),
              resources: part(parts, "resources"),
              monsters: part(parts, "monsters"),
            })
          )
        )
      ),
  };
};

/**
 * Already-rendered HTML, to interpolate without escaping it again: either a
 * part by id, or a template's result (which is never async here).
 */
function part(parts: Map<string, string>, id: string): HtmlEscapedString;
function part(rendered: HtmlEscapedString | Promise<HtmlEscapedString>): HtmlEscapedString;
function part(
  source: Map<string, string> | HtmlEscapedString | Promise<HtmlEscapedString>,
  id?: string
) {
  return raw(source instanceof Map ? source.get(id!) ?? "" : source.toString());
}

/** Renders shared by every connection drawn in the same pass. */
export type RenderCache = Map<string, string>;

const renderCached = (fragment: Fragment, cache: RenderCache) => {
  const cacheKey = `${fragment.id}|${fragment.key}`;
  let rendered = cache.get(cacheKey);
  if (rendered === undefined) {
    rendered = fragment.render().toString();
    cache.set(cacheKey, rendered);
  }
  return rendered;
};

/** What a connection's page is showing: its layout and each fragment. */
export type Drawn = {
  layout: string | null;
  sent: Map<string, { key: string; html: string }>;
};

export const emptyDrawn = (): Drawn => ({ layout: null, sent: new Map() });

/**
 * Brings `drawn` up to date with `screen` and returns the elements to patch:
 * nothing for fragments whose key or HTML hasn't changed, and the whole of
 * `#scene` when the layout changed.
 */
export const diffScreen = (
  drawn: Drawn,
  screen: Screen,
  cache: RenderCache
): string[] => {
  const patches: string[] = [];

  const update = (fragment: Fragment) => {
    const previous = drawn.sent.get(fragment.id);
    if (previous?.key === fragment.key) {
      return { html: previous.html, changed: false };
    }

    const html = renderCached(fragment, cache);
    drawn.sent.set(fragment.id, { key: fragment.key, html });
    return { html, changed: previous?.html !== html };
  };

  for (const region of screen.regions) {
    const { html, changed } = update(region);
    if (changed) {
      patches.push(html);
    }
  }

  if (drawn.layout !== screen.layout) {
    // Parts of the old scene are gone from the page.
    const regions = new Set(screen.regions.map((region) => region.id));
    for (const id of drawn.sent.keys()) {
      if (!regions.has(id)) {
        drawn.sent.delete(id);
      }
    }
    drawn.layout = screen.layout;

    const parts = new Map(
      screen.parts.map((part) => [part.id, update(part).html])
    );
    patches.push(screen.scene(parts).toString());
    return patches;
  }

  for (const part of screen.parts) {
    const { html, changed } = update(part);
    if (changed) {
      patches.push(html);
    }
  }

  return patches;
};

/** The whole `#game` element, recording what it drew in `drawn`. */
export const renderGame = (
  drawn: Drawn,
  screen: Screen,
  userId: string,
  now: number,
  cache: RenderCache = new Map()
) => {
  drawn.layout = null;
  drawn.sent.clear();

  // With nothing drawn, the last patch is the scene.
  const scene = diffScreen(drawn, screen, cache).at(-1)!;
  const region = (id: string) => raw(drawn.sent.get(id)?.html ?? "");

  return Game({
    userId,
    now,
    hud: region("hud"),
    scene: raw(scene),
    inventory: region("inventory"),
    equipment: region("equipment"),
    quests: region("quests"),
    journal: region("journal"),
    minimap: region("minimap"),
    tracker: region("tracker"),
    trackerLine: region("tracker-line"),
    players: region("zone-players"),
    activity: region("activity"),
    dialogue: region("dialogue"),
    log: {
      game: region("log-game"),
      chat: region("log-chat"),
      combat: region("log-combat"),
    },
  }).toString();
};
