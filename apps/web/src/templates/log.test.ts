import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "log-view-")) + "/";

type SystemMessage = import("../user/system.js").SystemMessage;
type ChatMessage = import("../social/chat.js").ChatMessage;

const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

const at = Date.UTC(2026, 8, 25, 12);
const messages: SystemMessage[] = [
  { id: "m2", user_id: "player", message: "Later", type: "info", sent_at: at + 2_000 },
  { id: "m1", user_id: "player", message: "Earlier", type: "info", sent_at: at },
];
const chat: ChatMessage[] = [
  { id: 1, user_id: "someone", message: "In between", sent_at: at + 1_000 },
];

const orders = (html: string) =>
  Object.fromEntries(
    [...html.matchAll(/id="(log-\w+)"[^>]*style="order: (-?\d+)"/g)].map(
      ([, id, order]) => [id, Number(order)]
    )
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("log", () => {
  it("interleaves lines from separate fragments by time, whenever it's rendered", async () => {
    const render = async (now: number) => {
      vi.resetModules();
      vi.spyOn(Date, "now").mockReturnValue(now);
      const { LogChat, LogGame } = await import("./log.js");
      return text(LogGame(messages)) + text(LogChat(chat));
    };

    const first = await render(at + 5_000);
    expect(await render(at + 86_400_000)).toBe(first);

    const order = orders(first);
    expect(order["log-mm1"]).toBeLessThan(order["log-c1"]!);
    expect(order["log-c1"]).toBeLessThan(order["log-mm2"]!);
  });

  it("keeps order a 32-bit integer for years either side of now", async () => {
    const { logOrder } = await import("./log.js");
    for (const year of [2012, 2026, 2040]) {
      const order = logOrder(Date.UTC(year, 0, 1));
      expect(Number.isInteger(order)).toBe(true);
      expect(Math.abs(order)).toBeLessThan(2 ** 31);
    }
  });

  it("can be toggled or dragged taller", async () => {
    const { LogPanel, LOG_LINES } = await import("./log.js");
    const html = text(LogPanel("player", { game: "", chat: "", combat: "" }));
    expect(html).not.toContain("data-attr:style");
    expect(html).toContain(
      `$_layout.logLines = $_layout.logLines > ${LOG_LINES.short} ? ${LOG_LINES.short} : ${LOG_LINES.tall}`
    );
    expect(html).toContain('class="log-grip"');
    expect(html).toContain("data-on:pointermove__window=");
  });
});
