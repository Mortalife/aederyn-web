# Aederyn Online - Web

A web-based multiplayer RPG built with modern web standards, focusing on simplicity and performance. This project uses [Datastar](https://data-star.dev/) and [Hono](https://hono.dev/) to deliver a reactive gaming experience using Server-Sent Events (SSE) and hypermedia-driven architecture, following a basic CQRS (Command Query Responsibility Segregation) pattern.

**Live Demo:** [https://web.aederyn.online/](https://web.aederyn.online/)

## 🚀 Tech Stack

- **Framework**: [Hono](https://hono.dev/) (Running on Node.js)
- **Frontend**: Hypermedia-driven UI (HTML over-the-wire) with [Datastar](https://data-star.dev/) patterns.
- **Templating**: TSX (JSX for server-side HTML generation).
- **Database**: [LibSQL](https://turso.tech/libsql) (SQLite compatible).
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/).
- **AI Integration**: Anthropic integration for dynamic content generation.
- **Build Tooling**: [Vite](https://vitejs.dev/) & [tsup](https://tsup.egoist.dev/).

## 🛠️ Prerequisites

- Node.js (v20+ recommended)
- [pnpm](https://pnpm.io/) (Package manager)

## 📦 Installation & Setup

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/game-html.git
    cd game-html
    ```

2.  **Install dependencies**

    ```bash
    pnpm install
    ```

3.  **Environment Configuration**
    Copy the example environment file and fill in your API keys.

    ```bash
    cp .env.example .env
    ```

    Edit `.env` and provide the following:

    - `ANTHROPIC_API_KEY`: Required for AI generation features.
    - `GENERATION_ENABLED`: Set to `true` to enable dynamic quest/content generation.
    - `SESSION_SECRET`: A random string for securing sessions.
    - `DATABASE_PATH`: (Optional) Path to the database file (defaults to current directory).

4.  **Run Development Server**
    ```bash
    pnpm dev
    ```
    The game should now be accessible at `http://localhost:3000`.

## 🏗️ Architecture Overview

The project follows a basic CQRS pattern:

- **Commands**: User actions (moving, crafting, chatting) are sent to specific endpoints (e.g., `/game/move/:direction`).
- **Queries/Updates**: The game state is streamed back to the client via Server-Sent Events (SSE).
- **Game Loop**: A central loop (`src/index.ts`) processes actions, resource regeneration, and system messages every 100ms.

## 🎮 Configuration & Customization

The game content is defined in code-based configuration files located in `src/config/`. You can easily extend the game by modifying these files.

### Adding New Items

Edit `src/config/items.ts` to add new resources or tools.

```typescript
{
  id: "item_new_sword",
  name: "New Sword",
  description: "A shiny new sword.",
  type: "item", // or "resource", "tool"
  rarity: "common",
  stackable: false,
  equippable: true,
  equipSlot: "mainHand",
  value: 100,
  weight: 5,
  attributes: {
    damage: 10
  }
}
```

### Adding NPCs

Edit `src/config/npcs.ts` to define new characters.

```typescript
{
  entity_id: "npc_guard",
  name: "City Guard",
  backstory: "A loyal protector of the realm.",
  personalMission: "To keep the peace.",
  // ... relationships, hopes, fears
}
```

### Adding Tiles/Zones

Edit `src/config/tiles.ts`. Tiles define the look and available resources of a map area.

```typescript
{
  id: "tile_volcano",
  name: "Volcano",
  color: "#FF0000",
  theme: "fire",
  resources: ["resource_obsidian"],
  rarity: 0.1,
  accessible: true
}
```

### Adding Quests

- **Tutorial/Static Quests**: Defined in `src/config/quests.ts`.
- **Dynamic Quests**: The `QuestManager` in `src/user/quest-generator.ts` handles procedural quest generation using AI templates.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1.  **Fork the repository**.
2.  **Create a branch** for your feature or fix (`git checkout -b feature/amazing-feature`).
3.  **Commit your changes** (`git commit -m 'Add amazing feature'`).
4.  **Push to the branch** (`git push origin feature/amazing-feature`).
5.  **Open a Pull Request**.

### Guidelines

- Ensure code style is consistent (Prettier is configured).
- If adding new game mechanics, please include relevant tests or configuration entries.
- Respect the existing directory structure:
  - `src/config/`: Static game data.
  - `src/templates/`: TSX UI components.
  - `src/user/`: User state and logic.
  - `src/world/`: World state and logic.
  - `src/ai/`: AI generation logic.

## 📜 License

[MIT License](LICENSE)
