import { html } from "hono/html";
import type { Journal as JournalView } from "../game/view/select.js";
import { ItemIcon } from "./item-icon.js";
import { ItemAttrs, ItemTip } from "./bag.js";
import { RESOURCE_TYPE_LABELS } from "./zone.js";
import { SidePanel, rowToggle } from "./ui.js";

const titleCase = (id: string) =>
  id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Count = ({ found, total }: { found: number; total: number }) =>
  html`<span class="font-normal tabular-nums text-gray-500">${found}/${total}</span>`;

const Section = (
  title: string,
  count: { found: number; total: number },
  body: unknown,
  empty: string
) => html`<section class="flex flex-col">
  <h3
    class="flex h-7 items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-300"
  >
    ${title} ${Count(count)}
  </h3>
  ${count.found === 0
    ? html`<p class="text-xs text-gray-500">${empty}</p>`
    : body}
</section>`;

const Tally = (props: { id: string; label: string; found: string[]; total: number }) => html`<div
  id="${props.id}"
  class="flex min-h-11 cursor-pointer flex-col justify-center rounded px-1 py-0.5 hover:bg-white/5 data-[open]:bg-white/5 sm:min-h-0"
  data-row
  data-preserve-attr="data-open"
  data-on:click="${rowToggle}"
>
  <div class="flex items-center gap-2">
    <span class="min-w-0 flex-1 truncate ${props.found.length ? "text-gray-200" : "text-gray-500"}"
      >${props.label}</span
    >
    ${Count({ found: props.found.length, total: props.total })}
  </div>
  <div class="h-0.5 rounded-full bg-white/10 overflow-hidden">
    <div
      class="h-full bg-amber-300/70"
      style="width: ${props.total ? Math.round((props.found.length / props.total) * 100) : 0}%"
    ></div>
  </div>
  ${props.found.length
    ? html`<p class="d-full text-xs text-gray-400">${props.found.join(", ")}</p>`
    : null}
</div>`;

/** What the player has found so far, with how much there is to find. */
export const Journal = (journal: JournalView) =>
  SidePanel({
    id: "journal",
    panel: "journal",
    title: "Journal",
    meta: html`<span title="Found so far">${journal.found}/${journal.total} found</span>`,
    full: true,
    body: html`${Section(
        "Places",
        journal.sections.places,
        journal.places.map((region) =>
          Tally({
            id: `journal-place-${region.region}`,
            label: titleCase(region.region) || "Elsewhere",
            found: region.found,
            total: region.total,
          })
        ),
        "Nowhere yet."
      )}
      ${Section(
        "Creatures",
        journal.sections.creatures,
        journal.creatures.map(
          ({ monster, weakTo, drops }) => html`<div
            id="journal-creature-${monster.id}"
            class="cursor-pointer rounded px-1 text-xs hover:bg-white/5 data-[open]:bg-white/5"
            data-row
            data-preserve-attr="data-open"
            data-on:click="${rowToggle}"
          >
            <div class="flex min-h-11 items-center gap-2 sm:min-h-7">
              <span class="min-w-0 flex-1 truncate text-sm text-gray-200"
                >${monster.name}</span
              >
              <span class="shrink-0 text-gray-400"
                >${monster.attack.style} · weak
                <span class="${weakTo.length ? "text-emerald-300" : ""}"
                  >${weakTo.length ? weakTo.join(", ") : "none"}</span
                ></span
              >
              <span
                class="flex shrink-0 items-center gap-0.5"
                title="Drops found: ${drops.filter((d) => d.found).map((d) => d.item.name).join(", ") || "none"}"
              >
                ${drops
                  .filter((d) => d.found)
                  .map(({ item }) => html`<span tabindex="0" aria-label="${item.name}" ${ItemAttrs(item)}
                      >${ItemIcon(item, {
                        class: "size-4 rounded-sm text-[0.5rem] text-gray-200",
                      })}${ItemTip(item)}</span
                    >`)}
                <span class="tabular-nums text-gray-500"
                  >${drops.filter((d) => d.found).length}/${drops.length}</span
                >
              </span>
            </div>
            <p class="d-full pb-1 text-gray-400">${monster.description}</p>
          </div>`
        ),
        "Nothing fought yet."
      )}
      ${Section(
        "Recipes",
        journal.sections.recipes,
        journal.recipes
          .toSorted(
            (a, b) =>
              Object.keys(RESOURCE_TYPE_LABELS).indexOf(a.type) -
              Object.keys(RESOURCE_TYPE_LABELS).indexOf(b.type)
          )
          .map((station) =>
            Tally({
              id: `journal-recipe-${station.type}`,
              label: RESOURCE_TYPE_LABELS[station.type],
              found: station.found,
              total: station.total,
            })
          ),
        "Nothing made yet."
      )}
      ${Section(
        "People",
        journal.sections.people,
        journal.people.map(
          ({ npc, home }) => html`<div class="flex min-h-7 items-center gap-2">
            <span class="min-w-0 flex-1 truncate text-gray-200">${npc.name}</span>
            ${home
              ? html`<span class="shrink-0 text-xs text-gray-400"
                  >${home.name}
                  <span class="font-mono text-gray-500">(${home.x}, ${home.y})</span></span
                >`
              : null}
          </div>`
        ),
        "No one met yet."
      )}`,
  });
