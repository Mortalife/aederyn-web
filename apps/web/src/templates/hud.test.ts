import { describe, expect, it } from "vitest";
import "../test/config/index.js";

const { UserInfo } = await import("./hud.js");
const { BASE_USER, MAX_INVENTORY_SIZE } = await import("../config.js");
const { itemsById } = await import("../config/items.js");
type GameUser = import("../config.js").GameUser;

const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

const torch = itemsById.get("item_torch")!;
const user = (props: Partial<GameUser>): GameUser => ({
  ...BASE_USER,
  id: "player",
  i: [],
  e: {},
  ...props,
});
const bag = (count: number) =>
  Array.from({ length: count }, (_, n) => ({ id: `i${n}`, qty: 1, item: torch }));

/** The HTML of the element with `id`, up to its first closing tag. */
const element = (html: string, id: string) => {
  const start = html.lastIndexOf("<", html.indexOf(`id="${id}"`));
  expect(start).toBeGreaterThan(-1);
  return html.slice(start, html.indexOf(">", start) + 1);
};

describe("unit frame", () => {
  it("shows how full the bag is, and opens it", () => {
    const html = text(UserInfo(user({ i: bag(7) })));
    expect(html).toMatch(new RegExp(`>\\s*7/${MAX_INVENTORY_SIZE}\\s*</button>`));
    expect(html).toContain(`title="Bag: 7 of ${MAX_INVENTORY_SIZE} slots used"`);
    expect(html).toContain("$_tab = 'bag'; $_sheet = 'side'");
    expect(html).toContain("text-gray-300");
  });

  it("warns when the bag is full", () => {
    const html = text(UserInfo(user({ i: bag(MAX_INVENTORY_SIZE) })));
    expect(html).toContain(`${MAX_INVENTORY_SIZE}/${MAX_INVENTORY_SIZE}`);
    expect(html).toMatch(/text-amber-300"\s+title="Bag:/);
  });

  it("has a ghost bar behind health at the same width", () => {
    const html = text(UserInfo(user({ h: BASE_USER.h / 2 }), undefined, [], { damage: 10, at: 1000 }));
    const ghost = element(html, "hud-health-ghost");
    const health = element(html, "hud-health");
    expect(ghost).toContain('class="hud-health-ghost"');
    expect(ghost).toContain("width: 50%");
    expect(ghost).toContain("data-init=");
    expect(ghost).toContain('"width":"60%"');
    expect(health).toContain("width: 50%");
    expect(html.indexOf('id="hud-health-ghost"')).toBeLessThan(
      html.indexOf('id="hud-health"')
    );
  });
});
