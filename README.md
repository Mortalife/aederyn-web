# Aederyn Online

A web-based multiplayer RPG built with modern web standards, focusing on simplicity and performance. This monorepo contains both the game client/server and a comprehensive game design editor.

**Live Demo:** [https://web.aederyn.online/](https://web.aederyn.online/)

## 📁 Monorepo Structure

This project uses [pnpm workspaces](https://pnpm.io/workspaces) to manage multiple packages:

```
├── apps/
│   ├── web/          # Main game application
│   └── editor/       # Game Design Editor GUI
├── packages/
│   └── types/        # Shared TypeScript types
```

## 🚀 Tech Stack

### Game (`apps/web`)
- **Framework**: [Hono](https://hono.dev/) (Running on Node.js)
- **Frontend**: Hypermedia-driven UI (HTML over-the-wire) with [Datastar](https://data-star.dev/) patterns
- **Templating**: TSX (JSX for server-side HTML generation)
- **Database**: [LibSQL](https://turso.tech/libsql) (SQLite compatible)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **AI Integration**: Anthropic integration for dynamic content generation
- **Build Tooling**: [Vite](https://vitejs.dev/) & [tsup](https://tsup.egoist.dev/)

### Editor (`apps/editor`)
- **Framework**: [Hono](https://hono.dev/) with TSX templating
- **AI Integration**: OpenAI for quest and world bible generation
- **Visualization**: [Cytoscape.js](https://js.cytoscape.org/) for relationship graphs
- **Validation**: [Zod](https://zod.dev/) schemas for data integrity
- **Testing**: [Playwright](https://playwright.dev/) for E2E testing

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
    Copy the example environment file and fill in your API keys in each app.

    ```bash
    # For the game
    cp apps/web/.env.example apps/web/.env
    
    # For the editor
    cp apps/editor/.env.example apps/editor/.env
    ```

    **Game (`apps/web/.env`):**
    - `SESSION_SECRET`: A random string for securing sessions
    - `DATABASE_PATH`: (Optional) Path to the database file

    **Editor (`apps/editor/.env`):**
    - `OPENROUTER_API_KEY`: Required for AI quest and world bible generation

4.  **Run Development Servers**
    ```bash
    # Run the game
    pnpm dev
    
    # Run the editor (in a separate terminal)
    pnpm editor
    ```
    - Game: `http://localhost:3000`
    - Editor: `http://localhost:5173`

## 🏗️ Architecture Overview

The game follows a basic CQRS pattern:

- **Commands**: User actions (moving, crafting, chatting) are sent to specific endpoints (e.g., `/game/move/:direction`)
- **Queries/Updates**: The game state is streamed back to the client via Server-Sent Events (SSE)
- **Game Loop**: A central loop processes actions, resource regeneration, and system messages every 100ms

## 🎨 Game Design Editor

The editor (`apps/editor`) is a comprehensive GUI for designing and managing game content without editing code directly.

### Features

- **Entity Management**: Create, edit, and delete Items, Resources, Tiles, NPCs, Quests, and House Tiles
- **Visual Relationship Graph**: Interactive Cytoscape.js visualization showing connections between all entities
- **Validation System**: Real-time validation with health scores, missing reference detection, and balance warnings
- **Impact Analysis**: See how changes to one entity affect others across the game
- **Export System**: Export configured entities to TypeScript files for the game

### AI-Powered Generation

- **Quest Generation**: AI-assisted quest creation with context-aware objectives, rewards, and dialog
- **World Bible Generation**: Generate comprehensive lore including regions, factions, history, themes, and naming conventions
- **Review System**: AI reviews generated content for consistency and balance

### Editor Sections

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview with entity counts and health check status |
| **Items** | Weapons, armor, tools, consumables with attributes and effects |
| **Resources** | Gatherable materials, crafting stations, and workbenches |
| **Tiles** | Map zones with themes, colors, and available resources |
| **NPCs** | Characters with backstories, relationships, and dialog |
| **Quests** | Multi-objective quests with prerequisites and rewards |
| **House Tiles** | Player housing furniture and decorations |
| **World Bible** | Lore management (regions, factions, history, themes) |
| **Validation** | Data integrity checks and balance analysis |
| **Graph View** | Visual entity relationship explorer |
| **Export** | Generate TypeScript config files |

### Running the Editor

```bash
pnpm editor        # Run the editor
```

## 🎮 Game Configuration

The game content is defined in code-based configuration files located in `apps/web/src/config/`.

> ⚠️ **Recommendation:** Use the [Game Design Editor](#-game-design-editor) instead of editing config files directly. The editor provides validation, relationship visualization, and AI-assisted content generation to ensure data integrity.

### Adding New Items

Use the editor at `/items` or manually edit `apps/web/src/config/items.ts`:

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

Use the editor at `/npcs` or manually edit `apps/web/src/config/npcs.ts`:

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

Use the editor at `/tiles` or manually edit `apps/web/src/config/tiles.ts`. Tiles define the look and available resources of a map area.

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

Use the editor at `/quests` for a visual quest builder with AI assistance, or:

- **Static Quests**: Edit `apps/web/src/config/quests.ts`
- **Dynamic Quests**: The `QuestManager` in `apps/web/src/user/quest-generator.ts` handles procedural generation

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1.  **Fork the repository**.
2.  **Create a branch** for your feature or fix (`git checkout -b feature/amazing-feature`).
3.  **Commit your changes** (`git commit -m 'Add amazing feature'`).
4.  **Push to the branch** (`git push origin feature/amazing-feature`).
5.  **Open a Pull Request**.

### Guidelines

- Ensure code style is consistent (Prettier is configured)
- If adding new game mechanics, please include relevant tests or configuration entries
- Respect the existing directory structure:

**Game (`apps/web/src/`):**
- `config/`: Static game data (items, NPCs, tiles, quests)
- `templates/`: TSX UI components
- `user/`: User state and logic
- `world/`: World state and logic
- `ai/`: AI generation logic

**Editor (`apps/editor/src/`):**
- `templates/`: Editor UI components
- `services/`: AI generation, validation, export logic
- `repository/`: Data persistence

**Shared (`packages/types/`):**
- Type definitions shared between apps

## 📜 License

[MIT License](LICENSE)
