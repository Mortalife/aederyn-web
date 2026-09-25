import "./style.css";

/**
 * Scene panel densities, remembered across reloads. Saved ones are put in
 * place before the game renders, so its defaults only fill the gaps.
 */
const DENSITY_KEY = "aederyn:density";
try {
  const saved = JSON.parse(localStorage.getItem(DENSITY_KEY) ?? "null");
  if (saved && typeof saved === "object") {
    const signals = document.createElement("div");
    signals.hidden = true;
    signals.setAttribute(
      "data-signals__ifmissing",
      JSON.stringify({ _density: saved })
    );
    document.body.prepend(signals);
  }
} catch {}

document.addEventListener("datastar-signal-patch", (event) => {
  const patch = (event as CustomEvent<{ _density?: Record<string, string> }>)
    .detail?._density;
  if (!patch) {
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(DENSITY_KEY) ?? "{}");
    localStorage.setItem(DENSITY_KEY, JSON.stringify({ ...saved, ...patch }));
  } catch {}
});

let itemTarget: HTMLElement | null = null;
let itemPress: { id: number; x: number; y: number; timer: number } | null = null;

const itemTip = () => document.getElementById("item-tip");

const positionItemTip = () => {
  const tip = itemTip();
  if (!tip || !itemTarget) {
    return;
  }
  const anchor = itemTarget.getBoundingClientRect();
  const gap = 10;
  const margin = 8;
  let left = anchor.right + gap;
  if (left + tip.offsetWidth > innerWidth - margin) {
    left = anchor.left - tip.offsetWidth - gap;
  }
  left = Math.max(margin, Math.min(left, innerWidth - tip.offsetWidth - margin));
  const top = Math.max(
    margin,
    Math.min(
      anchor.top + (anchor.height - tip.offsetHeight) / 2,
      innerHeight - tip.offsetHeight - margin
    )
  );
  tip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
};

const showItemTip = (target: HTMLElement) => {
  const tip = itemTip();
  const content = target.querySelector<HTMLTemplateElement>(
    ":scope > template[data-item-tip]"
  );
  if (!tip || !content) {
    return;
  }
  itemTarget = target;
  tip.replaceChildren();
  tip.append(content.content.cloneNode(true));
  tip.setAttribute("aria-hidden", "false");
  tip.dataset.open = "";
  requestAnimationFrame(positionItemTip);
};

const hideItemTip = () => {
  itemTarget = null;
  const tip = itemTip();
  if (!tip) {
    return;
  }
  tip.removeAttribute("data-open");
  tip.setAttribute("aria-hidden", "true");
  tip.replaceChildren();
};

const itemTrigger = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>("[data-item]") : null;

document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "mouse") {
    const target = itemTrigger(event.target);
    if (target && itemTrigger(event.relatedTarget) !== target) {
      showItemTip(target);
    }
  }
});

document.addEventListener("pointerout", (event) => {
  const target = itemTrigger(event.target);
  if (
    event.pointerType === "mouse" &&
    target === itemTarget &&
    itemTrigger(event.relatedTarget) !== itemTarget &&
    !target?.contains(document.activeElement)
  ) {
    hideItemTip();
  }
});

document.addEventListener("focusin", (event) => {
  const target = itemTrigger(event.target);
  if (target) {
    showItemTip(target);
  }
});

document.addEventListener("focusout", (event) => {
  const target = itemTrigger(event.target);
  if (
    target === itemTarget &&
    itemTrigger(event.relatedTarget) !== itemTarget &&
    !target?.matches(":hover")
  ) {
    hideItemTip();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") {
    return;
  }
  if (itemPress) {
    clearTimeout(itemPress.timer);
    itemPress = null;
  }
  const target = itemTrigger(event.target);
  if (!target) {
    hideItemTip();
    return;
  }
  const press = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    timer: window.setTimeout(() => {
      itemPress = null;
      showItemTip(target);
    }, 500),
  };
  itemPress = press;
});

document.addEventListener("pointermove", (event) => {
  if (
    itemPress?.id === event.pointerId &&
    Math.hypot(event.clientX - itemPress.x, event.clientY - itemPress.y) > 8
  ) {
    clearTimeout(itemPress.timer);
    itemPress = null;
  }
});

const endItemPress = (event: PointerEvent) => {
  if (itemPress?.id === event.pointerId) {
    clearTimeout(itemPress.timer);
    itemPress = null;
  }
};
document.addEventListener("pointerup", endItemPress);
document.addEventListener("pointercancel", endItemPress);
addEventListener("resize", positionItemTip);
addEventListener("scroll", positionItemTip, true);

/**
 * The log's height and whether the quest tracker is folded to one line,
 * remembered across reloads the same way as the densities.
 */
const LAYOUT_KEY = "aederyn:layout";
try {
  const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null");
  if (saved && typeof saved === "object") {
    if (typeof saved.logLines === "number") {
      document.documentElement.style.setProperty("--log-lines", String(saved.logLines));
    }
    const signals = document.createElement("div");
    signals.hidden = true;
    signals.setAttribute(
      "data-signals__ifmissing",
      JSON.stringify({ _layout: saved })
    );
    document.body.prepend(signals);
  }
} catch {}

document.addEventListener("datastar-signal-patch", (event) => {
  const patch = (event as CustomEvent<{ _layout?: Record<string, unknown> }>)
    .detail?._layout;
  if (!patch) {
    return;
  }
  if (typeof patch.logLines === "number") {
    document.documentElement.style.setProperty("--log-lines", String(patch.logLines));
  }
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}");
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ ...saved, ...patch }));
  } catch {}
});

/**
 * Unread counts on the log's filter tabs. A line is read once its kind has
 * been on screen: under its own filter or All, with the log visible. Lines
 * already there when the log first appears count as read.
 */
const KINDS = ["game", "chat", "combat"] as const;
type Kind = (typeof KINDS)[number];
let list: HTMLElement | null = null;
const seen = new Map<Kind, number>();
let scheduled = false;

const countUnread = () => {
  scheduled = false;
  const current = document.querySelector<HTMLElement>(".log-list");
  if (!current) {
    list = null;
    return;
  }

  const lines = [...current.querySelectorAll<HTMLElement>(".log-line")].map(
    (line) => ({
      at: Number(line.dataset.at),
      kinds: KINDS.filter((kind) => line.classList.contains(`log-${kind}`)),
    })
  );
  const newest = (kind: Kind) =>
    Math.max(0, ...lines.filter((l) => l.kinds.includes(kind)).map((l) => l.at));

  const filter = current.dataset.filter || "all";
  const visible = current.checkVisibility?.() ?? current.offsetParent !== null;
  for (const kind of KINDS) {
    if (current !== list || (visible && (filter === "all" || filter === kind))) {
      seen.set(kind, Math.max(seen.get(kind) ?? 0, newest(kind)));
    }
  }
  list = current;

  const unread = lines.filter((l) =>
    l.kinds.some((kind) => l.at > (seen.get(kind) ?? 0))
  );
  const counts: Record<string, number> = { all: unread.length };
  for (const kind of KINDS) {
    counts[kind] = unread.filter((l) => l.kinds.includes(kind)).length;
  }

  for (const badge of document.querySelectorAll<HTMLElement>("[data-unread]")) {
    const count = counts[badge.dataset.unread!] ?? 0;
    const text = count === 0 ? "" : count > 99 ? "99+" : String(count);
    if (badge.textContent !== text) {
      badge.textContent = text;
    }
  }
};

/**
 * The newest log line, copied under the activity bar for phones, where the
 * log is a sheet that's usually closed.
 */
const peekLog = () => {
  const peek = document.getElementById("log-peek");
  if (!peek) {
    return;
  }
  let newest: HTMLElement | null = null;
  for (const line of document.querySelectorAll<HTMLElement>(".log-list .log-line")) {
    if (!newest || Number(line.dataset.at) >= Number(newest.dataset.at)) {
      newest = line;
    }
  }
  const text = newest?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (peek.textContent !== text) {
    peek.textContent = text;
  }
  const colour = [...(newest?.classList ?? [])].find((c) => c.startsWith("text-")) ?? "";
  if (peek.dataset.colour !== colour) {
    peek.className = `hud-log-peek ${colour}`;
    peek.dataset.colour = colour;
  }
};

new MutationObserver(() => {
  if (itemTarget && !itemTarget.isConnected) {
    hideItemTip();
  }
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(() => {
      countUnread();
      peekLog();
    });
  }
}).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["data-filter", "data-sheet"],
});

/** Enter starts a chat message, unless the map owns it or something is focused. */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && itemTarget) {
    hideItemTip();
  }
  if (
    event.key !== "Enter" ||
    event.defaultPrevented ||
    document.querySelector("#world-map") ||
    (document.activeElement && document.activeElement !== document.body)
  ) {
    return;
  }
  const input = document.querySelector<HTMLInputElement>("#log input");
  if (input?.checkVisibility()) {
    event.preventDefault();
    input.focus();
  }
});
