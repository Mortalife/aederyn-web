import { type Client, createClient } from "@libsql/client";
import { EventEmitter } from "events";

interface Event {
  id: number;
  type: string;
  payload: any;
  timestamp: number;
}

class EventBus extends EventEmitter {
  private client: Client;
  private lastProcessedEventId: number = 0;
  private pollingInterval: NodeJS.Timer | null = null;

  constructor(url: string, authToken: string) {
    super();
    this.client = createClient({ url, authToken });
    this.initDatabase();
  }

  private async initDatabase() {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
  }

  async publish(type: string, payload: any) {
    const timestamp = Date.now();
    await this.client.execute({
      sql: "INSERT INTO events (type, payload, timestamp) VALUES (?, ?, ?)",
      args: [type, JSON.stringify(payload), timestamp],
    });
  }

  async start() {
    await this.initializeLastProcessedEventId();
    this.startPolling();
  }

  private async initializeLastProcessedEventId() {
    const result = await this.client.execute(
      "SELECT MAX(id) as max_id FROM events"
    );
    this.lastProcessedEventId = (result.rows[0]["max_id"] as number) || 0;
  }

  private startPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        const events = await this.fetchNewEvents(this.lastProcessedEventId);

        for (const event of events) {
          this.emit(event.type, event.payload);
          this.emit("*", event);
          this.lastProcessedEventId = event.id;
        }
      } catch (error) {
        console.error("Error in event polling:", error);
      }
    }, 1000); // Poll every second
  }

  private async fetchNewEvents(lastProcessedEventId: number): Promise<Event[]> {
    const { rows } = await this.client.execute({
      sql: "SELECT * FROM events WHERE id > ? ORDER BY id ASC",
      args: [lastProcessedEventId],
    });

    const result = rows as unknown as {
      id: number;
      type: string;
      payload: string;
      timestamp: number;
    }[];

    return result.map((row) => ({
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
    }));
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export { EventBus };
