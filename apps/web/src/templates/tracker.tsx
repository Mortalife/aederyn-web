import { html } from "hono/html";
import type { TrackedQuest } from "../user/quest-progress-manager.js";
import {
  KindBadge,
  QuestMarker,
  objectiveCount,
  objectiveWhere,
  returnTo,
} from "./quests.js";

const nextStep = ({ quest, status }: TrackedQuest) => {
  const objective = quest.currentObjective;
  if (status === "completable" || !objective) {
    return { text: returnTo(quest), count: null, where: null };
  }
  return {
    text: objective.description,
    count: objectiveCount(objective),
    where: objectiveWhere(objective),
  };
};

const marker = ({ status }: TrackedQuest) =>
  QuestMarker(status === "completable" ? "completable" : "objective");

const openQuest = (id: string) =>
  `$_tab = 'quests'; $_quest = '${id}'; $_sheet = 'side'`;

export const Tracker = (tracked: TrackedQuest[]) =>
  tracked.length === 0
    ? html`<div id="tracker"></div>`
    : html`<div
        id="tracker"
        class="hud-tracker"
        data-attr:data-collapsed="$_layout.tracker === 'line'"
      >
        <button
          class="tracker-toggle"
          title="Collapse or expand the quest tracker"
          data-attr:aria-expanded="$_layout.tracker === 'line' ? 'false' : 'true'"
          data-on:click="$_layout.tracker = $_layout.tracker === 'line' ? 'full' : 'line'"
        >
          <span aria-hidden="true">▾</span><span class="sr-only">Quest tracker</span>
        </button>
        ${tracked.map((entry) => {
          const step = nextStep(entry);
          return html`<button
            class="tracker-quest flex w-full items-start gap-2 rounded px-1.5 py-1 min-h-11 sm:min-h-0 text-left hover:bg-white/5"
            data-on:click="${openQuest(entry.quest.id)}"
          >
            ${marker(entry)}
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="tracker-name flex items-center gap-1.5">
                <span class="truncate text-sm font-semibold">${entry.quest.name}</span>
                ${KindBadge(entry.quest)}
              </span>
              <span class="flex gap-2 text-xs text-gray-300">
                <span class="tracker-step min-w-0 flex-1">${step.text}</span>
                ${step.count
                  ? html`<span class="shrink-0 font-mono tabular-nums">${step.count}</span>`
                  : null}
              </span>
              ${step.where
                ? html`<span class="tracker-where text-xs text-gray-500">↳ ${step.where}</span>`
                : null}
            </span>
          </button>`;
        })}
      </div>`;

export const TrackerLine = (tracked: TrackedQuest[]) => {
  const first = tracked[0];
  if (!first) {
    return html`<div id="tracker-line"></div>`;
  }
  const step = nextStep(first);
  return html`<div id="tracker-line" class="hud-tracker-line">
    <button
      class="flex w-full items-center gap-2 px-3 min-h-11 text-left text-sm"
      data-on:click="$_sheet = $_sheet === 'map' ? '' : 'map'"
      data-attr:aria-expanded="$_sheet === 'map' ? 'true' : 'false'"
    >
      ${marker(first)}
      <span class="min-w-0 flex-1 truncate">${step.text}</span>
      ${step.count
        ? html`<span class="shrink-0 font-mono text-xs tabular-nums">${step.count}</span>`
        : null}
      ${tracked.length > 1
        ? html`<span class="shrink-0 text-xs text-gray-400">+${tracked.length - 1}</span>`
        : null}
      <span class="shrink-0 text-gray-400" aria-hidden="true">▾</span>
    </button>
  </div>`;
};
