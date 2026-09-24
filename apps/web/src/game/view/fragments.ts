import type { HtmlEscapedString } from "hono/utils/html";
import { html, raw } from "hono/html";
import {
  ChatMessages,
  UserInfo,
  WorldMap,
  Zone,
  ZoneHeader,
  ZoneEquipment,
  ZoneInventory,
  ZoneMonsters,
  ZoneNPCs,
  ZoneNav,
  ZonePlayers,
  ZoneResources,
} from "../../templates/elements.js";
import { Game, GameContent } from "../../templates/game.js";
import { ContractBoard, Quests } from "../../templates/quests.js";
import {
  chatVersion,
  onlineVersion,
  userVersion,
  zoneVersion,
} from "../versions.js";
import type { GameView } from "./select.js";

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
  /** "map" or "zone:x,y". A new layout replaces all of `#content`. */
  layout: string;
  info: Fragment;
  /** What's inside `#content`, patched one by one while the layout holds. */
  parts: Fragment[];
  /** Assembles `#content` from the parts' HTML, by id. */
  content: (parts: Map<string, string>) => HtmlEscapedString;
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

export const buildScreen = (
  view: GameView,
  activeQuests: object,
  isMobile = false
): Screen => {
  const { user } = view;
  const u = `${user.id}:u${userVersion(user.id)}`;
  const aq = `aq${questSetId(activeQuests)}`;

  const info: Fragment = {
    id: "info",
    key: `${u}:o${onlineVersion()}:a${view.alertKey}`,
    render: () =>
      html`<div id="info">
        ${UserInfo(
          user,
          view.messages,
          view.totalPlayersOnline,
          view.messages.find((m) => String(m.id) === view.alertKey),
          view.effects
        )}
      </div>`,
  };

  if (!user.z) {
    const worldMap: Fragment = {
      id: "world-map",
      key: `${u}:${aq}:m${isMobile}`,
      render: () =>
        WorldMap(view.map, view.mapIndicators, isMobile, view.quests),
    };

    return {
      layout: "map",
      info,
      parts: [worldMap],
      content: (parts) => part(GameContent(part(parts, "world-map"))),
    };
  }

  const here = view.map.find((tile) => tile.here)!;
  const zone = `${here.x},${here.y}`;
  const z = `z${zoneVersion(here.x, here.y)}`;
  const f = `f${view.flashKey}`;

  const parts: Fragment[] = [
    {
      id: "zone-header",
      // Tile config only, which doesn't change while the game runs.
      key: zone,
      render: () => ZoneHeader(here),
    },
    {
      id: "zone-nav",
      key: `${u}:${z}:${aq}:${f}`,
      render: () =>
        ZoneNav({
          worldTile: here,
          user,
          playerCount: view.players.length,
          zoneQuests: view.quests,
          npcInteractions: view.npcInteractions,
          monsters: view.monsters,
          contextFlashes: view.contextFlashes,
        }),
    },
    {
      id: "npcs",
      key: `${u}:${zone}:${aq}`,
      render: () => ZoneNPCs(view.npcs),
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
      key: `${u}:${z}:${aq}:${f}`,
      render: () =>
        ZoneResources({
          worldTile: here,
          user,
          inprogress: view.inprogress,
          resourceObjectives: view.resourceObjectives,
          contextFlashes: view.contextFlashes,
        }),
    },
    {
      id: "monsters",
      // Attack and flee controls depend on the viewer's equipment and action.
      key: `${u}:${z}:${f}:h${view.hitsKey}`,
      render: () => ZoneMonsters(view.monsters, {
        userId: user.id,
        weapon: workingWeapon(user),
        health: user.h,
        gathering: !!view.inprogress,
        contextFlashes: view.contextFlashes,
      }),
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
          now: view.clock,
        }) ?? html`<div id="quests"></div>`,
    },
    {
      id: "inventory",
      key: u,
      render: () => ZoneInventory(user),
    },
    {
      id: "equipment",
      key: u,
      render: () => ZoneEquipment(user),
    },
    {
      id: "zone-players",
      // Shared by everyone in the zone: no user in the key.
      key: `${zone}:${z}`,
      render: () => ZonePlayers(view.zoneUsers),
    },
    {
      id: "chat-messages",
      key: `${user.id}:c${chatVersion()}:t${view.clock}`,
      render: () => ChatMessages(view.chatMessages, user, view.clock),
    },
  ];

  return {
    layout: `zone:${zone}`,
    info,
    parts,
    content: (parts) =>
      part(
        GameContent(
          part(
            Zone({
              header: part(parts, "zone-header"),
              nav: part(parts, "zone-nav"),
              npcs: part(parts, "npcs"),
              board: part(parts, "board"),
              resources: part(parts, "resources"),
              monsters: part(parts, "monsters"),
              quests: part(parts, "quests"),
              inventory: part(parts, "inventory"),
              equipment: part(parts, "equipment"),
              players: part(parts, "zone-players"),
              chatMessages: part(parts, "chat-messages"),
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
 * `#content` when the layout changed.
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

  const info = update(screen.info);
  if (info.changed) {
    patches.push(info.html);
  }

  if (drawn.layout !== screen.layout) {
    // Parts of the old layout are gone from the page.
    for (const id of drawn.sent.keys()) {
      if (id !== screen.info.id) {
        drawn.sent.delete(id);
      }
    }
    drawn.layout = screen.layout;

    const parts = new Map(
      screen.parts.map((part) => [part.id, update(part).html])
    );
    patches.push(screen.content(parts).toString());
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

  const [info, content] = diffScreen(drawn, screen, cache);

  return Game({ userId, now, info: raw(info), content: raw(content) }).toString();
};
