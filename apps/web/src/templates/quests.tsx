import { html } from "hono/html";
import type { PlacedObjective, PlacedQuest } from "../world/quests.js";
import type {
  BoardContract,
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager.js";
import { formatDistance } from "date-fns";
import { npcsById } from "../config/npcs.js";
import { resourcesById } from "../config/resources.js";
import type { SystemMessage } from "../user/system.js";
import { FloatingResult, ScenePanel, SidePanel, rowToggle } from "./ui.js";
import { Glyph } from "./icons.js";

export type MarkerKind =
  | "available"
  | "objective"
  | "completable"
  | "elsewhere"
  | "hidden";

const MARKERS: Record<MarkerKind, { symbol: string; label: string; class: string }> = {
  available: { symbol: "!", label: "Quest available", class: "text-quest-available" },
  objective: { symbol: "◆", label: "Quest objective", class: "text-quest-objective" },
  completable: { symbol: "?", label: "Ready to hand in", class: "text-quest-completable" },
  elsewhere: { symbol: "→", label: "Elsewhere", class: "text-quest-elsewhere" },
  hidden: { symbol: "✦", label: "Hidden quest", class: "text-quest-hidden" },
};

/** The one symbol and colour for each quest state, used everywhere. */
export const QuestMarker = (kind: MarkerKind, className = "") => {
  const marker = MARKERS[kind];
  return html`<span
    class="quest-marker ${marker.class} ${className}"
    title="${marker.label}"
    aria-label="${marker.label}"
    >${marker.symbol}</span
  >`;
};

export const KindBadge = (quest: PlacedQuest) =>
  html`<span
    class="shrink-0 text-[0.65rem] leading-4 px-1.5 rounded-full ${quest.kind === "contract"
      ? "bg-white/10 text-gray-400"
      : quest.is_tutorial
      ? "bg-emerald-500/20 text-emerald-300"
      : "bg-purple-500/20 text-purple-300"}"
    >${quest.kind === "contract" ? "Contract" : quest.is_tutorial ? "Tutorial" : "Story"}</span
  >`;

/** "3/5" for an objective that counts, otherwise null. */
export const objectiveCount = (objective: PlacedObjective) => {
  if (objective.type === "talk" || objective.type === "explore") {
    return null;
  }
  const required = objective.type === "kill" ? objective.count : objective.amount;
  return `${Math.max(0, objective.progress?.current ?? 0)}/${required}`;
};

/** Where to hand a quest in. */
export const returnTo = (quest: PlacedQuest) =>
  `Return to ${
    quest.completion.entity_id ? npcName(quest.completion.entity_id) : "the contract board"
  } at (${quest.completion.x}, ${quest.completion.y})`;

type QuestRowKind = "available" | "here" | "elsewhere" | "completable";

/**
 * A quest as one compact line: marker, name, kind and what to do next. It
 * expands in place to the description, every objective and its actions.
 */
const QuestRow = (props: {
  quest: PlacedQuest;
  kind: QuestRowKind;
  now: number;
}) => {
  const { quest, kind } = props;
  const objective = quest.currentObjective;
  const count = objective ? objectiveCount(objective) : null;
  const handIn = kind === "completable" || !objective;
  const marker: MarkerKind =
    kind === "available"
      ? "available"
      : kind === "completable"
      ? "completable"
      : kind === "here"
      ? "objective"
      : "elsewhere";
  const where =
    kind === "elsewhere" && objective ? objectiveWhere(objective) : null;
  const open = `($_quest === '${quest.id}' || $_density.quests === 'full')`;

  return html`<div id="quest-${quest.id}" class="rounded" data-class="{'bg-white/5': ${open}}">
    <button
      class="flex w-full items-start gap-2 rounded px-1.5 py-1.5 min-h-11 sm:min-h-0 text-left hover:bg-white/5"
      data-on:click="$_quest = $_quest === '${quest.id}' ? '' : '${quest.id}'"
      data-attr:aria-expanded="${open} ? 'true' : 'false'"
    >
      ${QuestMarker(marker, "mt-0.5")}
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="flex items-center gap-1.5">
          <span class="truncate text-sm font-semibold">${quest.name}</span>
          ${KindBadge(quest)}
        </span>
        <span class="flex gap-2 text-xs text-gray-400">
          <span class="min-w-0 flex-1 truncate"
            >${kind === "available"
              ? quest.giver.entity_id
                ? `From ${npcName(quest.giver.entity_id)}`
                : quest.description
              : handIn
              ? returnTo(quest)
              : objective!.description}</span
          >
          ${count && !handIn
            ? html`<span class="shrink-0 font-mono tabular-nums">${count}</span>`
            : null}
        </span>
      </span>
    </button>
    <div class="flex flex-col gap-2 px-1.5 pb-2 pl-7 text-xs" data-show="${open}">
      <p class="text-gray-300">${quest.description}</p>
      ${quest.kind === "contract"
        ? html`<span class="text-gray-400"
            >${formatDistance(quest.ends_at, props.now)} left</span
          >`
        : null}
      ${QuestObjectivesCompleted(quest)}
      ${where ? html`<span class="text-gray-300">${where}</span>` : null}
      <div class="flex gap-2">
        ${kind === "available"
          ? html`<button
              class="btn btn-xs btn-primary min-h-11 sm:min-h-0"
              data-on:click="@post('/game/quest/${quest.id}')"
            >
              Accept
            </button>`
          : kind === "completable"
          ? html`<button
              class="btn btn-xs btn-success min-h-11 sm:min-h-0"
              data-on:click="@post('/game/quest/${quest.id}/complete')"
            >
              Complete
            </button>`
          : html`<button
              class="btn btn-xs btn-outline btn-warning min-h-11 sm:min-h-0"
              data-on:click="@delete('/game/quest/${quest.id}')"
            >
              Abandon
            </button>`}
      </div>
    </div>
  </div>`;
};

const QuestSection = (title: string, rows: ReturnType<typeof QuestRow>[]) =>
  rows.length === 0
    ? null
    : html`<section class="flex flex-col gap-0.5">
        <h3 class="px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          ${title} <span class="font-normal">(${rows.length})</span>
        </h3>
        ${rows}
      </section>`;

/**
 * The quest log in the side panel. Contracts on offer are listed by the
 * contract board, and story quests from the people who live here by the
 * People list, so only the rest of what's available here is listed.
 * Conversations happen in the scene; this only points at them.
 */
export const Quests = (props: {
  zoneQuests: ZoneQuests;
  npcInteractions?: ZoneInteraction[];
  flashMessage?: SystemMessage;
  /** NPCs whose offers the People list shows. */
  residents?: Set<string>;
  /** Whether the player is in the zone, where conversations happen. */
  inZone?: boolean;
  /** For "time left"; rounded so the render only changes when the text does. */
  now: number;
}) => {
  const { zoneQuests, now } = props;
  const available = zoneQuests.availableQuests.filter(
    (q) =>
      q.kind === "story" &&
      !(q.giver.entity_id && props.residents?.has(q.giver.entity_id))
  );
  const talks = props.npcInteractions ?? [];
  const hidden = zoneQuests.discoverableQuests.filter((q) => q.kind === "story").length;
  const row = (kind: QuestRowKind) => (quest: PlacedQuest) =>
    QuestRow({ quest, kind, now });
  const empty =
    talks.length +
      available.length +
      zoneQuests.completableQuests.length +
      zoneQuests.inProgressQuests.length +
      zoneQuests.elsewhereQuests.length ===
    0;

  return SidePanel({
    id: "quests",
    panel: "quests",
    title: "Quests",
    full: true,
    class: "relative",
    body: html`${FloatingResult(props.flashMessage)}
    ${talks.length > 0
      ? html`<div class="flex flex-col gap-0.5">
          ${talks.map(
            (talk) => html`<button
              class="flex items-center gap-2 rounded px-1.5 py-1.5 min-h-11 sm:min-h-0 text-left text-sm hover:bg-white/5"
              data-on:click="$_sheet = ''"
            >
              ${QuestMarker("objective")}
              <span class="flex-1"
                >${props.inZone
                  ? `Talk to ${npcName(talk.objective.entity_id)} here`
                  : `Enter to talk to ${npcName(talk.objective.entity_id)}`}</span
              >
            </button>`
          )}
        </div>`
      : null}
    ${QuestSection("Hand in here", zoneQuests.completableQuests.map(row("completable")))}
    ${QuestSection("In progress", [
      ...zoneQuests.inProgressQuests.map(row("here")),
      ...zoneQuests.elsewhereQuests.map(row("elsewhere")),
    ])}
    ${QuestSection("Available here", available.map(row("available")))}
    ${empty
      ? html`<p class="px-1.5 text-sm text-gray-400">
          No quests yet. People around the valley have work for you.
        </p>`
      : null}
    ${hidden > 0
      ? html`<p class="flex items-center gap-2 px-1.5 text-xs text-gray-400">
          ${QuestMarker("hidden")} ${hidden} more
          quest${hidden === 1 ? "" : "s"} to find
        </p>`
      : null}`,
  });
};

export const DialogStep = (speaker: string | null, dialog: string, latest = false) => html`<p
  class="${latest ? "text-gray-100" : "text-gray-400"}"
>
  <span class="font-semibold ${speaker ? "text-purple-300" : "text-blue-300"}"
    >${speaker ?? "You"}:</span
  >
  ${dialog}
</p>`;

/**
 * A conversation for a talk objective, as a dialogue box: the lines so far,
 * newest at the bottom, and the button that moves it on.
 */
export const QuestNPC = (props: {
  interaction: ZoneInteraction;
  /** NPCs the player has met; without it everyone is named. */
  known?: Set<string>;
}) => {
  const { objective, quest_id } = props.interaction;
  const progress = objective.progress;
  if (!progress) return null;

  const npc = npcsById.get(objective.entity_id);
  const name =
    !props.known || props.known.has(objective.entity_id)
      ? npc?.name ?? "Unknown"
      : "A stranger";
  const last = progress.current === progress.required - 1;
  const speaker = (entityId: string | null) =>
    entityId === null
      ? null
      : entityId === objective.entity_id
      ? name
      : npcName(entityId);

  return html`<div
    id="talk-${objective.id}"
    class="flex flex-col gap-2 rounded-md border border-purple-400/30 bg-[#16111d]/95 p-3 text-sm shadow-2xl backdrop-blur"
  >
    <div class="flex items-center gap-2">
      <span class="grid size-7 shrink-0 place-items-center rounded-full bg-purple-500/20 text-purple-300"
        >${Glyph("person", "size-4")}</span
      >
      <span class="font-semibold text-purple-200">${name}</span>
      <span class="ml-auto font-mono text-xs tabular-nums text-gray-500"
        >${progress.current}/${progress.required}</span
      >
    </div>
    <div class="flex max-h-36 flex-col-reverse overflow-y-auto">
      <div id="interaction-${objective.id}" class="flex flex-col gap-1">
        ${progress.current > 0
          ? Array.from({ length: progress.current }, (_, i) => {
              const step = objective.dialog_steps[i];
              return DialogStep(
                speaker(step?.entity_id ?? null),
                step?.dialog ?? "",
                i === progress.current - 1
              );
            })
          : html`<p class="italic text-gray-400">
              ${npc?.idleLine ?? `${name} looks up as you approach.`}
            </p>`}
      </div>
    </div>
    <div class="flex justify-end">
      <button
        id="complete_${objective.id}"
        class="h-11 rounded px-3 text-xs font-medium text-white sm:h-7 ${last
          ? "bg-green-700 hover:bg-green-600"
          : "bg-purple-600/80 hover:bg-purple-500"}"
        data-on:click="@put('/game/quest/${quest_id}/objective/${objective.id}')"
      >
        ${progress.current === 0 ? "Talk" : last ? "Finish" : "Continue ▸"}
      </button>
    </div>
  </div>`;
};

/**
 * Conversations in progress where the player is standing, anchored to the
 * bottom of the scene. Empty, but still present for patching, with none.
 */
export const Dialogue = (
  interactions: ZoneInteraction[],
  known: Set<string>
) =>
  html`<div id="dialogue" class="hud-dialogue">${interactions.map(
    (interaction) => QuestNPC({ interaction, known })
  )}</div>`;

const npcName = (entityId: string) => npcsById.get(entityId)?.name ?? "Unknown";

const regionName = (region: string) => region.replace(/-/g, " ");

/** Where the player should go for an objective they aren't at. */
export const objectiveWhere = (objective: PlacedObjective): string | null => {
  switch (objective.type) {
    case "talk":
      return `Find ${npcName(objective.entity_id)} at (${objective.x}, ${objective.y})`;
    case "explore":
      return `Next objective at (${objective.x}, ${objective.y})`;
    case "gather":
    case "kill":
      return objective.region
        ? `Anywhere in the ${regionName(objective.region)}`
        : null;
    default:
      return null;
  }
};

const QuestBadge = (quest: PlacedQuest, now: number) =>
  quest.kind === "contract"
    ? html`<span
        class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400"
      >
        Contract · ${formatDistance(quest.ends_at, now)} left
      </span>`
    : quest.is_tutorial
    ? html`<span
        class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        >Tutorial</span
      >`
    : html`<span
        class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
        >Story</span
      >`;

/** The contracts posted on the board here, with what the player has done about each. */
export const ContractBoard = (props: {
  contracts: BoardContract[] | null;
  flashMessage?: SystemMessage;
  now: number;
}) => {
  if (!props.contracts) {
    return html`<div id="board"></div>`;
  }

  const body = props.contracts.length
    ? html`<table class="w-full text-left text-sm">
        <tbody>
          ${props.contracts.map(
            ({ quest, status }) => html`<tr
                id="contract-${quest.id}"
                class="cursor-pointer hover:bg-white/5 data-[open]:bg-white/5 ${status ===
                "done"
                  ? "opacity-60"
                  : ""}"
                data-row
                data-preserve-attr="data-open"
                data-on:click="${rowToggle}"
              >
                <td class="py-1 pl-1 pr-2">
                  <span class="font-semibold">${quest.name}</span>
                  <p class="d-full text-xs text-gray-400">${quest.description}</p>
                </td>
                <td
                  class="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-gray-400"
                  title="Time left"
                >
                  ${formatDistance(quest.ends_at, props.now)}
                </td>
                <td class="py-1 pl-2 pr-1 text-right">
                  ${status === "available"
                    ? html`<button
                        class="h-11 rounded bg-blue-600/80 px-2.5 text-xs font-medium text-white hover:bg-blue-500 sm:h-7"
                        data-on:click="@post('/game/quest/${quest.id}')"
                      >
                        Take
                      </button>`
                    : html`<span
                        class="text-xs text-gray-500"
                        title="${status === "done"
                          ? "Posted again in a later rotation"
                          : "See your quests"}"
                        >${status === "done" ? "Done" : "Taken"}</span
                      >`}
                </td>
              </tr>`
          )}
        </tbody>
      </table>`
    : html`<p class="py-1 text-xs text-gray-400">
        Nothing posted right now. Check back after the next rotation.
      </p>`;

  return ScenePanel({
    id: "board",
    panel: "board",
    sections: ["board"],
    title: "Contract board",
    meta: "New postings every two hours",
    body: html`${FloatingResult(props.flashMessage)}${body}`,
  });
};

export const QuestObjectivesCompleted = (quest: PlacedQuest) => {
  const indexof = quest.objectives.findIndex(
    (objective) => objective.id === quest.currentObjective?.id
  );

  const objectives =
    indexof === -1
      ? quest.objectives.every((o) => o.progress?.completed)
        ? quest.objectives
        : []
      : quest.objectives.slice(0, indexof + 1);

  if (!objectives.length) {
    return null;
  }

  return html`
    <div class="flex flex-col gap-2 mt-2">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide"
        >Objectives</span
      >
      <div class="flex flex-col gap-1">
        ${objectives.map(
          (objective, index) =>
            html`<div class="flex items-center gap-2 text-xs">
              <span
                class="flex items-center justify-center size-5 rounded-full text-xs font-bold
                ${objective.progress?.completed
                  ? "bg-green-500/30 text-green-400"
                  : "bg-white/10 text-gray-400"}"
              >
                ${objective.progress?.completed
                  ? Glyph("check", "size-3")
                  : `${index + 1}`}
              </span>
              <span
                class="${objective.progress?.completed
                  ? "text-green-400 line-through opacity-70"
                  : "text-gray-200"}"
              >
                ${objective.description}${objective.progress?.completed &&
                objective.type === "explore"
                  ? ` (${objective.x}, ${objective.y})`
                  : ""}
              </span>
              ${objective.id === quest.currentObjective?.id
                ? QuestObjectiveProgress({ objective: quest.currentObjective })
                : null}
            </div>`
        )}
      </div>
    </div>
  `;
};

export const QuestObjectiveProgress = (props: { objective: PlacedObjective }) => {
  const objective = props.objective;
  const current = Math.max(0, objective.progress?.current ?? 0);
  const total =
    objective.type === "kill"
      ? objective.count
      : objective.type === "gather" ||
          objective.type === "craft" ||
          objective.type === "collect"
        ? objective.amount
        : 1;
  const percentage = Math.min(100, (current / total) * 100);

  switch (objective.type) {
    case "explore":
      return null;
    case "craft":
    case "gather": {
      const resource = resourcesById.get(objective.resource_id);

      if (!resource) {
        return null;
      }

      return html`<div class="flex items-center gap-2 ml-auto">
        <div class="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            style="width: ${percentage}%"
          ></div>
        </div>
        <span class="text-xs text-gray-400 font-mono">${current}/${total}</span>
      </div>`;
    }
    case "collect":
    case "kill": {
      return html`<div class="flex items-center gap-2 ml-auto">
        <div class="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            style="width: ${percentage}%"
          ></div>
        </div>
        <span class="text-xs text-gray-400 font-mono">${current}/${total}</span>
      </div>`;
    }

    default:
      return null;
  }
};
