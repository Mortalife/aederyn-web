import { html } from "hono/html";
import type { TileObjective, TileQuest } from "../user/quest.js";
import type {
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager.js";
import { formatDistanceToNow } from "date-fns";
import { npcsMap } from "../config/npcs.js";
import { resourcesMap } from "../config/resources.js";
import type { SystemMessage } from "../user/system.js";
import { ContextualFlash } from "./elements.js";

const QuestsIcon = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  stroke-width="1.5"
  stroke="currentColor"
  class="size-5"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
  />
</svg>`;

const getQuestTypeStyle = (type: keyof ZoneQuests) => {
  switch (type) {
    case "availableQuests":
      return {
        icon: "!",
        color: "text-yellow-400",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
      };
    case "inProgressQuests":
      return {
        icon: "◆",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
      };
    case "completableQuests":
      return {
        icon: "?",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
      };
    case "elsewhereQuests":
      return {
        icon: "→",
        color: "text-gray-400",
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
      };
    case "discoverableQuests":
      return {
        icon: "",
        color: "text-gray-400",
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
      };
  }
};

export const Quests = (props: {
  zoneQuests: ZoneQuests;
  npcInteractions?: ZoneInteraction[];
  flashMessage?: SystemMessage;
}) => {
  if (!props.zoneQuests) return null;

  const totalQuests =
    props.zoneQuests.availableQuests.length +
    props.zoneQuests.inProgressQuests.length +
    props.zoneQuests.completableQuests.length +
    props.zoneQuests.elsewhereQuests.length;

  const hasNpcInteractions =
    props.npcInteractions && props.npcInteractions.length > 0;

  return html`<div
    id="quests"
    class="flex flex-col gap-4 p-4 rounded-xl bg-black/20 border border-white/10"
    data-show="$_showQuests"
  >
    <!-- Section Header -->
    <div class="flex items-center gap-3 pb-2 border-b border-white/10">
      <div class="p-2 rounded-lg bg-white/5">${QuestsIcon}</div>
      <div>
        <h2 class="text-xl font-bold">Quests</h2>
        <p class="text-sm text-gray-400">
          ${totalQuests > 0 || hasNpcInteractions
            ? `${totalQuests} quest${totalQuests !== 1 ? "s" : ""} tracked`
            : "No active quests in this area"}
        </p>
      </div>
    </div>

    <!-- Quest Contextual Flash Messages -->
    ${ContextualFlash({ message: props.flashMessage })}
    ${hasNpcInteractions
      ? html`
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2 text-purple-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                />
              </svg>
              <h3 class="text-lg font-semibold">NPCs Nearby</h3>
              <span class="text-xs opacity-60"
                >(${props.npcInteractions?.length})</span
              >
            </div>
            <div class="grid grid-cols-1 gap-2">
              ${props.npcInteractions?.map((interaction) => {
                return html`
                  <div
                    class="flex flex-col gap-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30"
                  >
                    ${QuestNPC({ interaction })}
                  </div>
                `;
              })}
            </div>
          </div>
        `
      : null}
    ${Object.entries(props.zoneQuests).map(
      ([type, quests]: [string, TileQuest[]]) => {
        if (!quests.length) return null;
        if (type === "discoverableQuests") return null;

        const style = getQuestTypeStyle(type as keyof ZoneQuests);
        return html`
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2 ${style.color}">
              <span
                class="flex items-center justify-center size-6 font-bold text-lg"
                >${style.icon}</span
              >
              <h3 class="text-lg font-semibold">
                ${QuestHeader({ type } as { type: keyof ZoneQuests })}
              </h3>
              <span class="text-xs opacity-60">(${quests.length})</span>
            </div>
            <div class="grid grid-cols-1 gap-2">
              ${quests.map((quest) =>
                QuestItem({
                  quest,
                  type:
                    type === "elsewhereQuests"
                      ? "elsewhere"
                      : type === "inProgressQuests"
                      ? "in_progress"
                      : type === "availableQuests"
                      ? "available"
                      : "completed",
                  style,
                })
              )}
            </div>
          </div>
        `;
      }
    )}
    ${totalQuests === 0 && !hasNpcInteractions
      ? html`<div class="text-center py-8 text-gray-400">
          <p>No quests available in this zone.</p>
          <p class="text-sm mt-2">Explore other areas to find quest givers!</p>
        </div>`
      : null}
  </div>`;
};

export const DialogStep = (entity_id: string | null, dialog: string) => {
  const speaker = entity_id ? npcsMap.get(entity_id)?.name ?? "Unknown" : "You";
  const isPlayer = entity_id === null;

  return html`<div
    class="flex flex-col gap-1 p-3 rounded-lg ${isPlayer
      ? "bg-blue-500/10 border border-blue-500/20 ml-8"
      : "bg-white/5 border border-white/10 mr-8"}"
  >
    <span
      class="font-bold text-xs ${isPlayer
        ? "text-blue-400"
        : "text-purple-400"}"
      >${speaker}</span
    >
    <p class="text-sm">${dialog}</p>
  </div>`;
};

export const QuestNPC = (props: { interaction: ZoneInteraction }) => {
  const progress = props.interaction.objective.progress;
  const npc = npcsMap.get(props.interaction.objective.entity_id);
  const name = npc?.name ?? "Unknown";

  if (!progress) return null;

  const buttonText =
    progress.current === 0
      ? "Start Conversation"
      : progress.current === progress.required - 1
      ? "Finish Conversation"
      : "Continue...";

  return html`
    <div class="flex flex-col gap-4">
      <!-- NPC Header -->
      <div class="flex flex-row gap-4 items-start">
        <div class="p-3 rounded-xl bg-purple-500/20 text-purple-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>
        <div class="flex flex-col gap-1 flex-1">
          <span class="font-bold text-lg text-purple-300">${name}</span>
          <span class="text-xs text-gray-400 line-clamp-2"
            >${npc?.backstory}</span
          >
        </div>
        <button
          class="btn btn-sm ${progress.current === progress.required - 1
            ? "btn-success"
            : "btn-primary"}"
          id="complete_${props.interaction.objective.id}"
          data-on:click="@put('/game/quest/${props.interaction
            .quest_id}/objective/${props.interaction.objective.id}')"
        >
          ${buttonText}
        </button>
      </div>

      <!-- Dialog History -->
      ${progress.current > 0
        ? html`<div
            id="interaction-${props.interaction.objective.id}"
            class="flex flex-col gap-2 max-h-[300px] overflow-y-auto"
          >
            ${Array.from({ length: progress.current }).map((_, i) =>
              DialogStep(
                props.interaction.objective.dialog_steps[i]?.entity_id ?? null,
                props.interaction.objective.dialog_steps[i]?.dialog ?? ""
              )
            )}
          </div>`
        : html`<p class="text-sm text-gray-400 italic">
            Click to start the conversation...
          </p>`}
    </div>
  `;
};

export const QuestHeader = (props: { type: keyof ZoneQuests }) => {
  switch (props.type) {
    case "availableQuests":
      return html`Available Quests`;
    case "inProgressQuests":
      return html`In Progress Quests`;
    case "completableQuests":
      return html`Outstanding Quests`;
    case "elsewhereQuests":
      return html`Happening Elsewhere`;
  }
};

export const QuestItem = (props: {
  quest: TileQuest;
  type: "available" | "in_progress" | "completed" | "elsewhere";
  style?: { icon: string; color: string; bg: string; border: string };
}) => {
  const style = props.style ?? {
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
    color: "text-gray-400",
  };

  // Get location for elsewhere quests
  const getObjectiveLocation = () => {
    const obj = props.quest.currentObjective;
    if (!obj) return null;
    if ("x" in obj && "y" in obj) {
      return { x: obj.x, y: obj.y };
    }
    return null;
  };
  const elsewhereLocation =
    props.type === "elsewhere" ? getObjectiveLocation() : null;

  return html`<div
    id="quest-${props.quest.id}"
    class="flex flex-col gap-3 p-4 rounded-lg ${style.bg} ${style.border} border"
  >
    <!-- Quest Header -->
    <div class="flex flex-col md:flex-row items-start justify-between gap-4">
      <div class="flex flex-col gap-1 flex-1">
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg">${props.quest.name}</span>
          ${props.quest.is_tutorial
            ? html`<span
                class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                >Tutorial</span
              >`
            : html`<span
                class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400"
              >
                ${formatDistanceToNow(props.quest.ends_at)} left
              </span>`}
        </div>
        <p class="text-sm text-gray-300">${props.quest.description}</p>
      </div>

      ${props.type === "in_progress" || props.type === "elsewhere"
        ? html`<button
            class="btn btn-sm btn-outline btn-warning"
            data-on:click="@delete('/game/quest/${props.quest.id}')"
          >
            Abandon
          </button>`
        : props.type === "available"
        ? html`<button
            class="btn btn-sm btn-primary"
            data-on:click="@post('/game/quest/${props.quest.id}')"
          >
            Accept Quest
          </button>`
        : html`<button
            class="btn btn-sm btn-success"
            data-on:click="@post('/game/quest/${props.quest.id}/complete')"
          >
            Complete Quest
          </button>`}
    </div>

    <!-- Objectives -->
    ${QuestObjectivesCompleted(props.quest)}

    <!-- Elsewhere location hint -->
    ${props.type === "elsewhere" && elsewhereLocation
      ? html`<div
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-500/20 border border-gray-500/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-5 text-gray-400"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span class="text-sm text-gray-300 font-medium">
            Next objective at (${elsewhereLocation.x}, ${elsewhereLocation.y})
          </span>
        </div>`
      : null}

    <!-- Turn-in reminder -->
    ${!props.quest.currentObjective &&
    (props.type === "in_progress" || props.type === "elsewhere")
      ? html`<div
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-5 text-yellow-400"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span class="text-sm text-yellow-400 font-medium">
            Return to (${props.quest.completion.x}, ${props.quest.completion.y})
            to claim your reward!
          </span>
        </div>`
      : null}
  </div>`;
};

export const QuestObjectivesCompleted = (quest: TileQuest) => {
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
            html`<div class="flex items-center gap-2 text-sm">
              <span
                class="flex items-center justify-center size-5 rounded-full text-xs font-bold
                ${objective.progress?.completed
                  ? "bg-green-500/30 text-green-400"
                  : "bg-white/10 text-gray-400"}"
              >
                ${objective.progress?.completed
                  ? html`<svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      class="size-3"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>`
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

export const QuestObjectiveProgress = (props: { objective: TileObjective }) => {
  const objective = props.objective;
  const current = Math.max(0, objective.progress?.current ?? 0);
  const total =
    objective.type === "gather" ||
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
      const resource = resourcesMap.get(objective.resource_id);

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
    case "collect": {
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
