import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";

// game-icons.net icon name → author (the folder it lives in on game-icons.net,
// e.g. https://game-icons.net/1x1/lorc/wood-axe.html). Each becomes the sprite
// symbol `icon-<name>`, which items reference by `<name>`.
const ICONS: Record<string, string> = {
  algae: "delapouite",
  "angler-fish": "lorc",
  "animal-hide": "delapouite",
  "armor-cuisses": "delapouite",
  "armor-vest": "lorc",
  "armored-pants": "irongamer",
  "armoured-shell": "lorc",
  "backbone-shell": "lorc",
  "bandage-roll": "lorc",
  basket: "delapouite",
  "bat-wing": "lorc",
  "battered-axe": "lorc",
  "beach-bucket": "delapouite",
  "beetle-shell": "lorc",
  "birch-trees": "caro-asercion",
  "bird-mask": "lorc",
  boar: "caro-asercion",
  "bone-knife": "lorc",
  "bow-arrow": "delapouite",
  "bow-string": "delapouite",
  bowels: "delapouite",
  bread: "delapouite",
  breastplate: "lorc",
  "brick-pile": "delapouite",
  broadsword: "lorc",
  "broken-tablet": "lorc",
  "bubbling-bowl": "lorc",
  "camp-cooking-pot": "delapouite",
  cauldron: "lorc",
  "chain-mail": "willdabeast",
  "chemical-drop": "lorc",
  "chest-armor": "delapouite",
  "chicken-leg": "lorc",
  chisel: "delapouite",
  claw: "sbed",
  "clay-brick": "delapouite",
  "coal-pile": "delapouite",
  "cooking-glove": "delapouite",
  "covered-jar": "delapouite",
  "crab-claw": "lorc",
  "cracked-mask": "lorc",
  "crescent-blade": "skoll",
  "crescent-staff": "delapouite",
  "crested-helmet": "lorc",
  crossbow: "carl-olsen",
  "crossed-bones": "lorc",
  "crystal-cluster": "lorc",
  "crystal-growth": "lorc",
  "crystal-shine": "lorc",
  "curled-leaf": "lorc",
  "deer-head": "caro-asercion",
  "dripping-goo": "lorc",
  "fairy-wand": "lorc",
  feather: "lorc",
  "fertilizer-bag": "delapouite",
  "fish-cooked": "darkzaitzev",
  "fishing-net": "lorc",
  flax: "delapouite",
  "flint-spark": "delapouite",
  "floating-crystal": "lorc",
  "fluffy-wing": "lorc",
  frog: "lorc",
  "fur-boot": "delapouite",
  "gas-mask": "skoll",
  gauntlet: "delapouite",
  "glass-ball": "delapouite",
  gloves: "delapouite",
  "gold-bar": "willdabeast",
  "gold-nuggets": "delapouite",
  greaves: "delapouite",
  "half-log": "delapouite",
  "ham-shank": "skoll",
  "herbs-bundle": "delapouite",
  "high-grass": "delapouite",
  "honey-jar": "delapouite",
  honeycomb: "lorc",
  hood: "lorc",
  hound: "lorc",
  jug: "delapouite",
  "kebab-spit": "delapouite",
  "leather-boot": "lorc",
  "leather-vest": "lorc",
  "leg-armor": "delapouite",
  "lightning-bow": "lorc",
  "linden-leaf": "lorc",
  log: "delapouite",
  "lynx-head": "delapouite",
  "mail-shirt": "lorc",
  "mason-jar": "caro-asercion",
  meat: "lorc",
  "metal-bar": "lorc",
  "metal-plate": "delapouite",
  minerals: "faithtoken",
  mining: "lorc",
  mushroom: "lorc",
  "mushroom-gills": "lorc",
  "mushrooms-cluster": "delapouite",
  "ninja-mask": "lorc",
  "oak-leaf": "delapouite",
  "old-lantern": "delapouite",
  "orb-wand": "willdabeast",
  ore: "faithtoken",
  "painted-pottery": "delapouite",
  "phrygian-cap": "delapouite",
  "plant-seed": "delapouite",
  "pocket-bow": "lorc",
  "pointy-sword": "lorc",
  powder: "lorc",
  "primitive-torch": "delapouite",
  rabbit: "delapouite",
  "rabbit-head": "delapouite",
  raspberry: "delapouite",
  reed: "delapouite",
  "relic-blade": "lorc",
  "roast-chicken": "lorc",
  rock: "lorc",
  "rolled-cloth": "delapouite",
  "rope-coil": "delapouite",
  "round-potion": "caro-asercion",
  "round-shield": "willdabeast",
  "rubber-boot": "delapouite",
  "rune-stone": "lorc",
  "rune-sword": "lorc",
  "scale-mail": "lorc",
  "sewing-needle": "lorc",
  "sewing-string": "delapouite",
  "sharp-axe": "delapouite",
  sickle: "delapouite",
  "sleeveless-jacket": "delapouite",
  sling: "delapouite",
  snake: "lorc",
  spade: "lorc",
  "spinal-coil": "lorc",
  "stone-axe": "lorc",
  "stone-block": "lorc",
  "stone-pile": "delapouite",
  "stone-spear": "lorc",
  "swirl-string": "lorc",
  "sword-mold": "delapouite",
  "trap-mask": "lorc",
  "tree-roots": "delapouite",
  "tropical-fish": "delapouite",
  trousers: "lucasms",
  trowel: "delapouite",
  vial: "sbed",
  "vine-flower": "lorc",
  "war-axe": "delapouite",
  "war-pick": "delapouite",
  "water-flask": "delapouite",
  wheat: "lorc",
  "winter-gloves": "delapouite",
  "wizard-staff": "lorc",
  "wolf-head": "lorc",
  "wood-axe": "lorc",
  "wood-beam": "delapouite",
  "wood-club": "delapouite",
  "wood-pile": "delapouite",
  "wood-stick": "delapouite",
  wool: "delapouite",
};

const AUTHOR_NAMES: Record<string, string> = {
  darkzaitzev: "DarkZaitzev",
  lucasms: "Lucas",
};

const OUTPUT = "src/assets/icons.ts";

type IconSet = { icons: Record<string, { body: string }>; width?: number; height?: number };

const require = createRequire(import.meta.url);

const authorName = (slug: string) =>
  AUTHOR_NAMES[slug] ??
  slug
    .split("-")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");

// Trims coordinates to one decimal place. Only the fractional digits are
// touched: the integer part may hold packed arc flags, so it's left alone.
const trimPath = (body: string) =>
  body.replace(/\.(\d)(\d+)/g, (_, first: string, rest: string) => {
    const up = Number(rest[0]) >= 5 && first !== "9";
    return "." + (up ? String(Number(first) + 1) : first);
  });

async function buildIcons() {
  const set: IconSet = JSON.parse(
    await readFile(require.resolve("@iconify-json/game-icons/icons.json"), "utf8")
  );
  const size = set.width ?? 512;

  const names = Object.keys(ICONS).sort();
  const missing = names.filter((name) => !set.icons[name]);
  if (missing.length > 0) {
    throw new Error(`Not in @iconify-json/game-icons: ${missing.join(", ")}`);
  }

  const symbols = names.map(
    (name) =>
      `<symbol id="icon-${name}" viewBox="0 0 ${size} ${size}">${trimPath(set.icons[name]!.body)}</symbol>`
  );
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">${symbols.join("")}</svg>`;
  const authors = [...new Set(names.map((name) => authorName(ICONS[name]!)))].sort();

  const source = `// Generated by scripts/build-icons.ts from game-icons.net. Don't edit by hand.

export const ICON_IDS = ${JSON.stringify(names, null, 2)} as const;

export type IconId = (typeof ICON_IDS)[number];

export const ICON_AUTHORS = ${JSON.stringify(authors, null, 2)};

export const ICON_CREDIT = ${JSON.stringify(
    `Icons by ${authors.slice(0, -1).join(", ")} and ${authors.at(-1)} from game-icons.net (CC BY 3.0)`
  )};

export const ICON_LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/";

export const ICON_SPRITE = ${JSON.stringify(sprite)};
`;

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, source);
  console.log(
    `${names.length} icons by ${authors.length} authors → ${OUTPUT} (sprite ${(sprite.length / 1024).toFixed(1)} KB)`
  );
}

buildIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
