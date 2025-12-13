import { html } from "hono/html";
import type { WorldTile } from "../world/index.js";
import {
  type InventoryItem,
  type GameUser,
  type OtherUser,
  type Resource,
  type RequiredItem,
  MAX_INVENTORY_SIZE,
  type RewardItem,
} from "../config.js";
import { calculateProgress, type UserAction } from "../user/action.js";
import { restrictUserId, type ChatMessage } from "../social/chat.js";
import { formatDistance } from "date-fns";
import type { SystemMessage } from "../user/system.js";
import type {
  MapIndicator,
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager.js";
import { Quests } from "./quests.js";

export const WorldMap = (
  map: WorldTile[],
  mapIndicators: MapIndicator[]
) => html`<div
  id="world-map"
  class="grid grid-rows-1 justify-center items-center"
>
  <div
    id="map"
    style="background-color: #333;"
    class="relative w-[500px] md:w-[700px] p-4 grid grid-rows-5 grid-cols-5 grid-flow-col aspect-square gap-1"
  >
    ${map.map((worldTile) => {
      const indicators = mapIndicators.find(
        (indicator) =>
          indicator.x === worldTile.x && indicator.y === worldTile.y
      );
      return html`<div
        class="${worldTile.here
          ? "rounded-full scale-125 border-4 shadow-lg"
          : ""} transition duration-500 text-sm flex flex-col items-center justify-center text-center p-4 border border-gray-400"
        style=" background-color: ${worldTile?.tile?.backgroundColor ??
        "#333"}; color: ${worldTile?.tile?.color ?? "#000"};"
      >
        <span class="font-bold">${worldTile?.tile?.name}</span>
        <span class="text-sm ${worldTile.here ? "font-bold" : ""}"
          >${worldTile.x}, ${worldTile.y}</span
        >
        ${indicators ? MapIndicatorIcons(indicators) : null}
      </div>`;
    })}
    <div
      class="bg-black/10 p-2 rounded-full w-[172px] h-[172px] absolute bottom-10 right-10 grid grid-cols-3 grid-rows-3 gap-2"
    >
      <button
        class="btn btn-square col-start-2 row-start-1 shadow"
        data-on:click="@post('/game/move/up')"
      >
        Up
      </button>
      <button
        class="btn btn-square col-start-2 row-start-3 shadow"
        data-on:click="@post('/game/move/down')"
      >
        Down
      </button>
      <button
        class="btn btn-square btn-primary col-start-2 row-start-2 shadow"
        data-on:click="@post('/game/move/enter')"
      >
        Enter
      </button>
      <button
        class="btn btn-square col-start-1 row-start-2 shadow"
        data-on:click="@post('/game/move/left')"
      >
        Left
      </button>
      <button
        class="btn btn-square col-start-3 row-start-2 shadow"
        data-on:click="@post('/game/move/right')"
      >
        Right
      </button>
    </div>
  </div>
</div>`;

export const MapIndicatorIcons = (indicator: MapIndicator) => html` <div
  class="flex flex-row gap-1"
>
  ${indicator.available
    ? html`<svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="3"
        stroke="currentColor"
        class="size-6 text-yellow-300"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg> `
    : null}
  ${indicator.objective
    ? html`<svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-6 text-orange-600"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </svg> `
    : null}
  ${indicator.completable
    ? html`<svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-6 text-green-600"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
        />
      </svg> `
    : null}
</div>`;

export const Zone = (
  user: GameUser,
  worldTile: WorldTile,
  inprogress?: UserAction,
  players: OtherUser[] = [],
  chatMessages: ChatMessage[] = [],
  zoneQuests: ZoneQuests = {
    availableQuests: [],
    inProgressQuests: [],
    completableQuests: [],
    elsewhereQuests: [],
  },
  npcInteractions: ZoneInteraction[] = []
) => {
  const groupedResources = Object.groupBy(
    worldTile.tile?.resources ?? [],
    (resource) => resource.type
  );

  return html`<div
    id="zone"
    class="grid grid-cols-1 gap-4"
    data-signals="${JSON.stringify({
      _showActions: true,
      _showQuests: true,
      _showInventory: true,
      _showSocial: true,
    })}"
  >
    <h1 class="text-3xl font-bold">${worldTile.tile?.name}</h1>
    <div id="actions" class="flex flex-row gap-2">
      <button
        class="btn btn-xs"
        data-on:click="$_showActions = !$_showActions"
        data-class:btn-primary="$_showActions"
        data-class:btn-outline="!$_showActions"
      >
        Actions
      </button>
      <button
        class="btn btn-primary btn-xs"
        data-on:click="$_showQuests = !$_showQuests"
        data-class:btn-primary="$_showQuests"
        data-class:btn-outline="!$_showQuests"
      >
        Quests
      </button>
      <button
        class="btn btn-primary btn-xs"
        data-on:click="$_showInventory = !$_showInventory"
        data-class:btn-primary="$_showInventory"
        data-class:btn-outline="!$_showInventory"
      >
        Inventory
      </button>
      <button
        class="btn btn-primary btn-xs"
        data-on:click="$_showSocial = !$_showSocial"
        data-class:btn-primary="$_showSocial"
        data-class:btn-outline="!$_showSocial"
      >
        Social
      </button>
    </div>
    <div
      id="resources"
      class="grid grid-cols-1 gap-2"
      data-show="$_showActions"
    >
      ${Object.entries(groupedResources).map(
        ([type, resources]) => html`<h2 class="text-2xl font-bold capitalize">
            ${type}
          </h2>
          ${resources.map((resource) =>
            ResourceItem({
              resource,
              inventory: user.i,
              inprogress:
                inprogress?.resource_id === resource.id
                  ? {
                      total: resource.collectionTime,
                      current: calculateProgress(inprogress),
                    }
                  : undefined,
            })
          )}`
      )}
    </div>
    ${Quests({ zoneQuests, npcInteractions })}
    <div
      id="inventory"
      class="grid grid-cols-1 gap-2"
      data-show="$_showInventory"
    >
      <h2 class="text-2xl font-bold">
        Inventory (${user.i.length}/${MAX_INVENTORY_SIZE})
      </h2>
      ${user.i.map((item, index) =>
        InventorySlot({
          slot: item,
          index,
        })
      )}
    </div>
    <div id="social" class="grid grid-cols-1 gap-2" data-show="$_showSocial">
      <div id="players" class="grid grid-cols-1 gap-2">
        <h2 class="text-2xl font-bold">Active Players</h2>
        ${players.map((player) => OtherPlayerInfo(player))}
      </div>
      <div
        id="chat"
        class="grid grid-cols-1 gap-2"
        data-signals__ifmissing="${JSON.stringify({ message: "" })}"
      >
        <h2 class="text-2xl font-bold">Chat</h2>
        <form
          class="flex flex-row gap-2"
          data-on:submit="@post('/game/chat'); $message = ''"
        >
          <input
            type="text"
            class="p-2 border-gray-400 rounded flex-grow"
            autocomplete="off"
            data-bind="message"
            maxlength="100"
            placeholder="Enter your message"
          />
          <button class="btn btn-primary">Send</button>
        </form>
        ${ChatMessages(chatMessages, user)}
      </div>
    </div>
  </div>`;
};

export const ChatMessages = (messages: ChatMessage[], user: GameUser) => {
  const now = new Date();
  return html` <div id="chat-messages" class="max-h-[400px] overflow-auto">
    ${messages.map((message) => {
      const isYou = message.user_id === user.id;

      return html`<div class="chat ${isYou ? "chat-end" : "chat-start"}">
        <div class="chat-bubble">
          <div class="chat-header text-xs">
            ${isYou ? "You" : restrictUserId(message.user_id)}
          </div>
          <div>${message.message}</div>
          <div class="chat-footer opacity-50">
            <time class="text-xs opacity-50"
              >${formatDistance(new Date(message.sent_at), now, {
                addSuffix: true,
              })}</time
            >
          </div>
        </div>
      </div>`;
    })}
  </div>`;
};

export const UserZoneInfo = (user: GameUser) => html`<div
  id="user"
  class="flex flex-row gap-2 text-sm"
>
  <div class="p-2 rounded">
    <span id="user-p">x: ${user.p.x}, y: ${user.p.y}</span>
  </div>
  <button class="btn btn-neutral" data-on:click="@post('/game/move/exit')">
    Exit Zone
  </button>
</div>`;

export const UserInfo = (
  user: GameUser,
  messages?: SystemMessage[]
) => html` <div
  id="user-info"
  class="w-full flex flex-row justify-end items-center"
>
  <div class="flex flex-row gap-2">
    ${messages ? Messages(messages) : null} ${user.z && UserZoneInfo(user)}
    <button class="btn btn-square" data-on:click="@get('/game/refresh')">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </button>
  </div>
</div>`;
export const OtherPlayerInfo = (otherUser: OtherUser) => html` <div
  id="other-user-${otherUser.id}"
  class="w-full flex flex-row justify-between"
>
  <p>${restrictUserId(otherUser.id)}</p>
  <p>${otherUser.p.x}, ${otherUser.p.y}</p>
</div>`;

export const ResourceItem = (props: {
  resource: Resource;
  inventory: InventoryItem[];
  inprogress?: {
    total: number;
    current: number;
  };
}) => {
  return html`<div
    id="resources-${props.resource.id}"
    class="rounded-lg flex flex-row gap-4 justify-between p-4 border border-gray-400"
  >
    <div class="flex flex-col gap-2 flex-1">
      <div class="flex flex-row justify-between gap-2">
        <span class="font-semibold text-lg"
          >${props.resource.name}
          ${props.resource.limitless ? "" : `(${props.resource.amount})`}</span
        >
        ${props.inprogress &&
        html`
          <div class="flex items-center flex-col gap-2">
            <span>${props.inprogress.current}/${props.inprogress.total}</span>
            <progress
              class="progress progress-primary w-56"
              value="${props.inprogress.current}"
              max="${props.inprogress.total}"
            ></progress>
          </div>
        `}
      </div>
      <div class="flex flex-row gap-4">
        ${props.resource.required_items.length
          ? html`<div class="flex flex-col gap-4">
              <span>Requires:</span>
              <div class="flex flex-row gap-2">
                ${props.resource.required_items.map((a) =>
                  ResourceRequiredItem(a, props.inventory)
                )}
              </div>
            </div>`
          : ""}
        ${props.resource.reward_items.length
          ? html`<div class="flex flex-col gap-4">
              <span>Rewards:</span>
              <div class="flex flex-row gap-2">
                ${props.resource.reward_items.map((i) => ResourceRewardItem(i))}
              </div>
            </div>`
          : ""}
      </div>
    </div>

    ${props.inprogress
      ? html`<button
          class="btn btn-warning"
          data-on:click="@delete('/game/resources/${props.resource.id}')"
        >
          Cancel
        </button>`
      : html`<button
          class="btn btn-accent"
          data-on:click="@get('/game/resources/${props.resource.id}')"
        >
          ${props.resource.verb}
        </button>`}
  </div>`;
};

export const ResourceRequiredItem = (
  item: RequiredItem,
  inventory: InventoryItem[]
) => {
  const hasItem = inventory.find(
    (inv) => inv.item.id === item.item.id && inv.qty >= item.qty
  );

  if (hasItem) {
    if (item.consumed) {
      return html`<div class="indicator">
        <span
          class="tooltip indicator-item badge badge-error text-xs font-bold"
          data-tip="This item is consumed"
        >
          -${item.qty}</span
        >
        <div class="inline badge badge-outline">${item.item.name}</div>
      </div>`;
    }

    return html`<div class="indicator">
      <span class="indicator-item badge badge-outline">
        -${item.qty === 1 && !item.consumed && item.itemDurabilityReduction
          ? html`${DurabilityIcon} ${item.itemDurabilityReduction}`
          : item.qty}</span
      >
      <div class="tooltip inline badge badge-outline">${item.item.name}</div>
    </div>`;
  }

  if (item.consumed) {
    return html`<div class="indicator">
      ${item.qty > 1
        ? html`<span
            class="tooltip indicator-item badge badge-error text-xs font-bold"
            data-tip="You do not have the required qty of this item"
          >
            -${item.qty}</span
          >`
        : null}
      <div
        class="tooltip inline badge badge-outline badge-error opacity-50"
        ${item.qty === 1
          ? html`data-tip="You do not have the required qty of this item"`
          : ""}
      >
        ${item.item.name}
      </div>
    </div>`;
  }

  return html`<div class="indicator ">
    ${item.qty > 1
      ? html`<span
          class="tooltip indicator-item badge badge-error text-xs font-bold"
          data-tip="This item is consumed"
        >
          -${item.qty}</span
        >`
      : null}
    <div
      class="tooltip inline badge badge-outline badge-error opacity-50"
      data-tip="This item is required"
    >
      ${item.item.name}
    </div>
  </div>`;
};
export const ResourceRewardItem = (item: RewardItem) => {
  return html`<div class="indicator">
    <span class="indicator-item badge badge-success text-xs font-bold">
      +${item.qty}</span
    >
    <span class="badge badge-success badge-outline">${item.item.name} </span>
  </div>`;
};

export const InventorySlot = (props: {
  slot: InventoryItem;
  index: number;
}) => html`<div
  id="inventory-${props.slot.id}"
  class="flex flex-row gap-4 items-center justify-between p-4 border border-gray-400"
>
  <p class="rounded text-primary-content font-bold bg-secondary p-4 h-18">
    ${props.slot.qty}
  </p>
  <div class="flex flex-col gap-2 flex-1">
    <span>${props.slot.item.name}</span>
    <span>${props.slot.item.description}</span>
  </div>
  <div class="flex flex-col gap-2">
    ${props.slot.item.durability
      ? html`<div class="flex flex-row items-center gap-1 text-sm">
          ${DurabilityIcon}

          <span
            >${props.slot.item.durability.current}/${props.slot.item.durability
              .max}</span
          >
        </div>`
      : null}
  </div>
  <div class="flex flex-col gap-2">
    <button
      class="btn btn-error"
      data-on:click="@delete('/game/inventory/${props.slot.id}') "
    >
      Delete
    </button>
  </div>
</div>`;

export const DurabilityIcon = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  stroke-width="1.5"
  stroke="currentColor"
  class="size-4 inline"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
  />
</svg>`;

export const Messages = (messages: SystemMessage[], showLatest = false) => {
  const last = messages[0];

  let alertClass = "";

  if (last && last.sent_at > Date.now() - 10000) {
    switch (last.type) {
      case "error":
        alertClass = "text-red-500";
        break;
      case "warning":
        alertClass = "text-yellow-500";
        break;
      case "success":
        alertClass = "text-green-500";
        break;
      default:
        break;
    }
    if (showLatest) {
      return Message(last);
    }
  }

  if (showLatest) {
    return null;
  }

  return html`
    <div class="drawer w-auto">
      <input id="my-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content">
        <label for="my-drawer" class="btn btn-ghost drawer-button"
          ><svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6 ${alertClass}"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
        </label>
      </div>
      <div class="drawer-side  z-20">
        <label
          for="my-drawer"
          aria-label="close sidebar"
          class="drawer-overlay"
        ></label>

        <div
          class="menu min-w-[75%] md:min-w-[50%] h-full bg-base-100 flex flex-col gap-2"
        >
          <button
            class="btn btn-sm btn-primary"
            data-on:click="@delete('/game/system-messages')"
          >
            Remove All
          </button>
          <div
            class="flex flex-col h-[90vh] max-h-full overflow-y-scroll gap-4"
          >
            ${messages.map((message) => Message(message))}
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2"></div>
    </div>
  `;
};

export const Message = (message: SystemMessage) => html`
  <div
    role="alert"
    id="message-${message.id}"
    class="flex flex-row justify-between alert ${message.type === "error"
      ? "alert-error"
      : message.type === "warning"
      ? "alert-warning"
      : message.type === "success"
      ? "alert-success"
      : "alert-info"}"
  >
    <span>${message.message}</span>
    <div>
      <button
        class="btn btn-sm"
        data-on:click="@delete('/game/system-messages/${message.id}')"
      >
        Remove
      </button>
    </div>
  </div>
`;
