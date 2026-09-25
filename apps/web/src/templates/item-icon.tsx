import { createHash } from "node:crypto";
import { html } from "hono/html";
import type { Item } from "../config.js";
import { ICON_IDS, ICON_SPRITE } from "../assets/icons.js";
import { classes } from "./helpers.js";

export { ICON_CREDIT, ICON_LICENSE_URL } from "../assets/icons.js";

const iconIds = new Set<string>(ICON_IDS);

/** The sprite as a standalone file, served at `ICON_SPRITE_URL`. */
export const ICON_SPRITE_FILE = ICON_SPRITE.replace(' style="display:none"', "");

/** Named by its content, so browsers can cache it forever. */
export const ICON_SPRITE_URL = `/icons.${createHash("sha1")
  .update(ICON_SPRITE_FILE)
  .digest("hex")
  .slice(0, 10)}.svg`;

/** Two letters standing in for an item without an icon. */
export const monogram = (name: string) => {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const letters =
    words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
};

export const ItemIcon = (
  item: Pick<Item, "name" | "icon">,
  { class: className = "size-6" }: { class?: string } = {}
) =>
  item.icon && iconIds.has(item.icon)
    ? html`<svg class="${className}" aria-hidden="true"><use href="${ICON_SPRITE_URL}#icon-${item.icon}"></use></svg>`
    : html`<span
        class="${classes(
          className,
          "inline-flex items-center justify-center font-semibold leading-none select-none"
        )}"
        aria-hidden="true"
        >${monogram(item.name)}</span
      >`;
