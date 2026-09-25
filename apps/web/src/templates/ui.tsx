import { html } from "hono/html";
import type { SystemMessage } from "../user/system.js";
import { animateBetween, type ProgressTimes } from "./animate.js";
import { Glyph } from "./icons.js";

export const KeyboardShortcut = (shortcut: string) => html`<span
  class="h-4 hidden md:flex items-center justify-center text-[0.4rem] text-gray-400 font-mono p-[0.2rem] rounded-sm border border-gray-400 mix-blend-color-dodge"
  >${shortcut}</span
>`;

export const SCENE_PANELS = ["actions", "monsters", "people", "board"] as const;
export const SIDE_PANELS = ["quests", "bag", "gear", "social", "journal"] as const;

export type DensityPanel =
  | (typeof SCENE_PANELS)[number]
  | (typeof SIDE_PANELS)[number];

export const DENSITIES = ["hidden", "compact", "full"] as const;

type Density = (typeof DENSITIES)[number];

export const DEFAULT_DENSITY = Object.fromEntries(
  [...SCENE_PANELS, ...SIDE_PANELS].map((panel) => [panel, "compact"])
) as Record<DensityPanel, Density>;

const ALL_PANELS = Object.keys(DEFAULT_DENSITY) as DensityPanel[];

export const everyDensity = {
  set: (density: Density) =>
    `${ALL_PANELS.map((panel) => `$_density.${panel}`).join(" = ")} = '${density}'`,
  is: (density: Density) =>
    ALL_PANELS.map((panel) => `$_density.${panel} === '${density}'`).join(" && "),
};

/**
 * Hidden, compact or full: a client choice that never reaches the server.
 * A panel with nothing extra to show offers only hidden and compact, and
 * treats full as compact.
 */
const DensityToggle = (panel: DensityPanel, densities: readonly Density[]) => html`<div
  class="flex items-center rounded border border-white/10 sm:overflow-hidden"
  role="group"
  aria-label="Detail"
>
  ${densities.map(
    (density) => html`<button
      class="tap grid h-7 w-11 place-items-center text-gray-500 hover:bg-white/10 hover:text-gray-200 sm:size-6"
      title="${density[0]!.toUpperCase()}${density.slice(1)}"
      data-class="{'text-white bg-white/15': ${density === "compact" &&
      !densities.includes("full")
        ? `$_density.${panel} !== 'hidden'`
        : `$_density.${panel} === '${density}'`}}"
      data-on:click="$_density.${panel} = '${density}'"
    >
      ${Glyph(`density-${density}`, "size-3.5")}
    </button>`
  )}
</div>`;

export const isolateShows = (sections: string[]) =>
  `!$_isolate || ${JSON.stringify(sections)}.includes($_isolate)`;

/**
 * A scene panel: a flat frame with a 28px title bar and a density toggle.
 * The server always renders full detail; `.d-full` elements are hidden by
 * CSS under compact density unless their row is open.
 */
export const ScenePanel = (props: {
  id: string;
  panel: DensityPanel;
  /** What the filter chips isolate: one section, or a list for panels with several. */
  sections: string[];
  title: string;
  meta?: unknown;
  body: unknown;
}) => html`<section
  id="${props.id}"
  class="scene-panel relative flex flex-col rounded-md border border-white/10 bg-black/40 p-2 pt-0 text-sm"
  data-attr:data-density="$_density.${props.panel}"
  data-show="${isolateShows(props.sections)}"
>
  <header class="flex h-7 items-center gap-2 text-xs text-gray-400">
    <h2 class="font-semibold uppercase tracking-wide text-gray-300">${props.title}</h2>
    <span class="flex-1 min-w-0 truncate tabular-nums">${props.meta ?? ""}</span>
    ${DensityToggle(props.panel, DENSITIES)}
  </header>
  <div class="panel-body flex flex-col">${props.body}</div>
</section>`;

export const SidePanel = (props: {
  id: string;
  panel: (typeof SIDE_PANELS)[number];
  title: string;
  meta?: unknown;
  full?: boolean;
  class?: string;
  body: unknown;
}) => html`<div
  id="${props.id}"
  class="flex flex-col gap-2 text-sm ${props.class ?? ""}"
  data-attr:data-density="$_density.${props.panel}"
>
  <header class="flex h-7 items-center gap-2">
    <h2 class="font-semibold">${props.title}</h2>
    <span class="flex min-w-0 flex-1 items-center justify-end gap-3 truncate text-xs tabular-nums text-gray-400"
      >${props.meta ?? ""}</span
    >
    ${DensityToggle(
      props.panel,
      props.full ? DENSITIES : DENSITIES.filter((d) => d !== "full")
    )}
  </header>
  <div class="panel-body flex flex-col gap-2">${props.body}</div>
</div>`;

/**
 * Toggles a row's details on click, unless the click was on a control.
 * The attribute is client state, kept through morphs by `data-preserve-attr`.
 */
export const rowToggle = `evt.target.closest('button, a') || el.toggleAttribute('data-open')`;

export const DiscoveryGlow = (message?: SystemMessage) =>
  message
    ? html`<span
        id="glow-${message.id}"
        class="discovery-glow pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-amber-300/70 bg-amber-300/10"
        style="opacity: 0"
        data-init="${animateBetween(
          { startedAt: message.sent_at, endsAt: message.sent_at + 2500 },
          [{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }]
        )}"
      ></span>`
    : null;

const isProblem = (message: SystemMessage) =>
  message.type === "error" || message.type === "warning";

export const floatText = (message: SystemMessage) => {
  if (message.type === "success") {
    const gains = [...message.message.matchAll(/(\d+) x ([^,.]+)/g)].map(
      ([, qty, name]) => `+${qty} ${name!.trim()}`
    );
    if (gains.length > 0) {
      return gains.join("  ");
    }
  }
  return message.message;
};

/**
 * An action's result floating up from the element it came from, keyed to
 * when the message was sent. Problems stay a little longer, in red or amber,
 * and tint the element. Its parent must be positioned.
 */
export const FloatingResult = (message?: SystemMessage) => {
  if (!message) return null;

  const problem = isProblem(message);
  const colour =
    message.type === "error"
      ? "text-red-300"
      : message.type === "warning"
      ? "text-amber-300"
      : message.type === "success"
      ? "text-emerald-300"
      : "text-sky-200";
  const duration = problem ? 2600 : 1600;
  const times = { startedAt: message.sent_at, endsAt: message.sent_at + duration };

  return html`${problem
      ? html`<span
          id="tint-${message.id}"
          class="pointer-events-none absolute inset-0 rounded-[inherit] ${message.type ===
          "error"
            ? "bg-red-500"
            : "bg-amber-500"}"
          style="opacity: 0"
          data-init="${animateBetween(
            { startedAt: message.sent_at, endsAt: message.sent_at + 1200 },
            [{ opacity: 0.25 }, { opacity: 0 }]
          )}"
        ></span>`
      : null}<span
      class="pointer-events-none absolute inset-x-2 top-1 z-10 flex justify-center"
      ><span
        id="float-${message.id}"
        role="status"
        class="max-w-full rounded bg-black/70 px-2 py-0.5 text-center text-sm font-semibold drop-shadow ${colour}"
        style="opacity: 0"
        data-init="${animateBetween(times, [
          { opacity: 0, transform: "translateY(0.5rem)" },
          { opacity: 1, transform: "translateY(0)", offset: 0.1 },
          { opacity: 1, transform: "translateY(-0.5rem)", offset: 0.7 },
          { opacity: 0, transform: "translateY(-1.25rem)" },
        ])}"
        >${floatText(message)}</span
      ></span
    >`;
};

/**
 * A bar that fills from `startedAt` to `endsAt` (server clock, ms) on its own,
 * so the server only sends it when the action starts.
 *
 * Each animated element starts a Web Animation in `data-init`, seeked to the
 * elapsed time using the `_serverOffset` signal from `Game` to correct for
 * the client's clock. Nothing in the HTML depends on the time of the render,
 * and morphing doesn't touch running animations, so a later patch of the
 * same bar leaves it running.
 */
export const ProgressBar = (
  props: ProgressTimes & { id: string; label?: string }
) => {
  const duration = props.endsAt - props.startedAt;
  const seconds = Math.round(duration / 1000);
  const animate = (keyframes: object) => animateBetween(props, keyframes);

  return html`<div id="${props.id}" class="flex flex-col gap-1">
    <div class="flex items-center justify-between gap-2 text-xs text-gray-400">
      <span class="truncate">${props.label ?? "In Progress..."}</span>
      <span class="font-mono"
        ><span
          id="${props.id}-seconds"
          class="progress-seconds"
          data-init="${animate([
            { "--progress-seconds": 0 },
            { "--progress-seconds": seconds },
          ])}"
        ></span
        >/${seconds}s</span
      >
    </div>
    <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        id="${props.id}-fill"
        class="h-full w-0 bg-blue-500"
        data-init="${animate([{ width: "0%" }, { width: "100%" }])}"
      ></div>
    </div>
  </div>`;
};
