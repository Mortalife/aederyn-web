import { html } from "hono/html";
import type { TileObjective, TileQuest } from "../user/quest";
import type {
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager";
import { npcs, resources } from "../config";
import { formatDistanceToNow } from "date-fns";
import { getItemName } from "../user/items";

export const Quests = (props: {
  zoneQuests: ZoneQuests;
  npcInteractions?: ZoneInteraction[];
}) => {
  if (!props.zoneQuests) return null;

  return html` <div
    id="quests"
    class="grid grid-cols-1 gap-2"
    data-show="$_showQuests"
  >
    ${props.npcInteractions && props.npcInteractions.length
      ? html`
          <h2 class="text-2xl font-bold">In the area</h2>
          <div class="grid grid-cols-1 gap-2">
            ${props.npcInteractions.map((interaction) => {
              const npc = npcs.find(
                (n) => n.entity_id === interaction.objective.entity_id
              );

              const name = npc?.name ?? "Unknown";
              return html`
                <div
                  class="flex flex-col gap-4 justify-between p-4 border border-gray-400"
                >
                  <div class="flex flex-row gap-4 justify-between">
                    <div class="flex flex-col gap-2 flex-1">
                      <div class="flex flex-col justify-between gap-2">
                        <span>${name}</span>
                        <span class="text-xs">${npc?.backstory}</span>
                      </div>
                    </div>
                    <div class="flex flex-col gap-2">
                      <button
                        class="btn btn-accent"
                        id="complete_${interaction.objective.id}"
                        data-on-click="@get('/game/quest/${interaction.quest_id}/objective/${interaction
                          .objective.id}')"
                      >
                        Talk
                      </button>
                    </div>
                  </div>
                  <div
                    id="interaction-${interaction.objective.id}"
                    class="flex flex-col gap-2"
                  ></div>
                </div>
              `;
            })}
          </div>
        `
      : null}
    ${Object.entries(props.zoneQuests).map(
      ([type, quests]: [string, TileQuest[]]) =>
        quests.length
          ? html`<h2 class="text-2xl font-bold capitalize">
                ${QuestHeader({ type } as { type: keyof ZoneQuests })}
              </h2>
              ${quests.map((quest) =>
                QuestItem({
                  quest,
                  type:
                    type === "inProgressQuests" || type === "elsewhereQuests"
                      ? "in_progress"
                      : type === "availableQuests"
                      ? "available"
                      : "completed",
                })
              )}`
          : null
    )}
  </div>`;
};

export const QuestNPCDialog = (props: {
  step: 0 | 1;
  interaction: ZoneInteraction;
}) => {
  const name =
    npcs.find((n) => n.entity_id === props.interaction.objective.entity_id)
      ?.name ?? "Unknown";

  return html` <button
      class="btn btn-accent"
      id="complete_${props.interaction.objective.id}"
      data-on-click="@get('/game/quest/${props.interaction
        .quest_id}/objective/${props.interaction.objective.id}')"
      disabled
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="animate-spin size-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
      Talking
    </button>
    <div
      id="interaction-${props.interaction.objective.id}"
      class="flex flex-col gap-2"
    >
      <div class="flex flex-col gap-2 p-4 rounded">
        <span class="font-bold text-sm">You:</span>
        ${props.interaction.objective.dialog}
      </div>
      ${props.step === 1
        ? html`<div class="flex flex-col gap-2  p-4 rounded">
            <span class="font-bold text-sm"> ${name}: </span>
            ${props.interaction.objective.response}
          </div>`
        : null}
    </div>`;
};

export const QuestNPCCompleted = (props: {
  interaction: ZoneInteraction;
}) => html` <button
  class="btn btn-primary"
  id="complete_${props.interaction.objective.id}"
  data-on-click="@put('/game/quest/${props.interaction
    .quest_id}/objective/${props.interaction.objective.id}')"
>
  Complete
</button>`;

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
  type: "available" | "in_progress" | "completed";
}) => {
  return html`<div
    id="quest-${props.quest.id}"
    class="flex flex-row gap-4 justify-between p-4 border border-gray-400"
  >
    <div class="flex flex-col gap-2 flex-1">
      <div class="flex flex-row justify-between gap-2">
        <span
          >${props.quest.name} (${formatDistanceToNow(props.quest.ends_at)}
          remaining)</span
        >
      </div>
      <div class="flex flex-col gap-2">
        <span>${props.quest.description}</span>
        ${QuestObjectivesCompleted(props.quest)}
        ${!props.quest.currentObjective && props.type === "in_progress"
          ? html`<span class="text-yellow-500 font-bold"
              >Turn in for a reward
              (${props.quest.completion.x},${props.quest.completion.y})</span
            >`
          : null}
      </div>
    </div>

    ${props.type === "in_progress"
      ? html`<button
          class="btn btn-warning"
          data-on-click="@delete('/game/quest/${props.quest.id}')"
        >
          Cancel Quest
        </button>`
      : props.type === "available"
      ? html`<button
          class="btn btn-accent"
          data-on-click="@post('/game/quest/${props.quest.id}')"
        >
          Start
        </button>`
      : html`<button
          class="btn btn-accent"
          data-on-click="@post('/game/quest/${props.quest.id}/complete')"
        >
          Complete
        </button>`}
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

  return html` <span>Objectives:</span>
    <ul class="pl-2">
      ${objectives.map(
        (objective, index) =>
          html`<li>
            ${objective.description} (${index + 1}/${quest.objectives.length})
            ${objective.progress?.completed ? "✓" : ""}
            ${objective.id === quest.currentObjective?.id
              ? QuestObjectiveProgress({ objective: quest.currentObjective })
              : null}
          </li>`
      )}
    </ul>`;
};

export const QuestObjectiveProgress = (props: { objective: TileObjective }) => {
  const objective = props.objective;
  switch (objective.type) {
    case "explore":
      return null;
    case "craft":
    case "gather": {
      const resource = resources.find((r) => r.id === objective.resource_id);

      if (!resource) {
        return null;
      }

      return html`<div class="text-sm flex flex-col gap-2 p-2 rounded">
        ${resource.verb} ${objective.amount} ${resource.name}
        (${Math.max(0, objective.progress?.current ?? 0)}/${objective.amount})
      </div>`;
    }
    case "collect": {
      const item = getItemName(objective.item_id);
      return html`<div class="text-sm flex flex-col gap-2 p-2 rounded">
        Collect ${objective.amount} ${item}
        (${Math.max(0, objective.progress?.current ?? 0)}/${objective.amount})
      </div>`;
    }

    default:
      return null;
  }
};
