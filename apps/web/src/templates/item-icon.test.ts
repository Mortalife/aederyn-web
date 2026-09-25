import { describe, expect, it } from "vitest";
import { items } from "../config/items.js";
import {
  ICON_CREDIT,
  ICON_SPRITE_FILE,
  ICON_SPRITE_URL,
  ItemIcon,
  monogram,
} from "./item-icon.js";

describe("ItemIcon", () => {
  it("uses the item's sprite symbol", () => {
    const rendered = ItemIcon({ name: "Flint", icon: "flint-spark" }, { class: "size-8" }).toString();
    expect(rendered).toBe(
      `<svg class="size-8" aria-hidden="true"><use href="${ICON_SPRITE_URL}#icon-flint-spark"></use></svg>`
    );
  });

  it("falls back to a monogram without an icon", () => {
    const rendered = ItemIcon({ name: "Warden's Stylus" }).toString();
    expect(rendered).toContain("size-6");
    expect(rendered).toContain(">WS</span");
    expect(rendered).not.toContain("<use");
  });

  it("falls back to a monogram for an icon missing from the sprite", () => {
    expect(ItemIcon({ name: "Log", icon: "no-such-icon" }).toString()).toContain(">LO</span");
  });

  it("escapes the item name in the monogram", () => {
    expect(ItemIcon({ name: "<b>" }).toString()).not.toContain("<b>");
  });
});

describe("monogram", () => {
  it("takes the first letters of two words, or two letters of one", () => {
    expect(monogram("Oak-and-Bone Axe")).toBe("OA");
    expect(monogram("Flint")).toBe("FL");
    expect(monogram("")).toBe("?");
  });
});

describe("icon sprite", () => {
  it("has a symbol for every item's icon", () => {
    const sprite = ICON_SPRITE_FILE;
    for (const item of items) {
      expect(item.icon, item.id).toBeDefined();
      expect(sprite, item.id).toContain(`<symbol id="icon-${item.icon}"`);
    }
  });

  it("is served under a name that changes with its content", () => {
    expect(ICON_SPRITE_URL).toMatch(/^\/icons\.[0-9a-f]{10}\.svg$/);
    expect(ICON_SPRITE_FILE).not.toContain("display:none");
  });

  it("credits game-icons.net", () => {
    expect(ICON_CREDIT).toMatch(/^Icons by .+ from game-icons\.net \(CC BY 3\.0\)$/);
  });
});
