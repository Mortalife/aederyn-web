// Client-side JavaScript for the Game Design GUI Editor
// This file handles client-side interactivity

import cytoscape from "cytoscape";

console.log("Game Design GUI Editor loaded");

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+K to focus search
  if (e.ctrlKey && e.key === "k") {
    e.preventDefault();
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[placeholder*="Search"]'
    );
    if (searchInput) {
      searchInput.focus();
    }
  }
});

// Graph visualization with Cytoscape.js
interface GraphNode {
  id: string;
  label: string;
  type: "item" | "resource" | "tile" | "effect" | "npc" | "quest" | "house-tile" | "map";
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const nodeColors: Record<string, string> = {
  item: "#f59e0b",
  resource: "#10b981",
  tile: "#3b82f6",
  effect: "#eab308",
  npc: "#8b5cf6",
  quest: "#f43f5e",
  "house-tile": "#06b6d4",
  map: "#84cc16",
};

const edgeColors: Record<string, string> = {
  yields: "#10b981",
  requires: "#f59e0b",
  found_on: "#3b82f6",
  giver: "#8b5cf6",
  rewards: "#f43f5e",
  transforms_to: "#06b6d4",
  applies: "#eab308",
  protects: "#84cc16",
  places: "#3b82f6",
  home: "#a855f7",
  excludes: "#ef4444",
};

// Web Component for Cytoscape Graph
class CytoscapeGraph extends HTMLElement {
  private cy: cytoscape.Core | null = null;

  static get observedAttributes() {
    return ["graph-data"];
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    this.style.height = "100%";
    
    const graphDataAttr = this.getAttribute("graph-data");
    if (graphDataAttr) {
      try {
        const graphData = JSON.parse(graphDataAttr) as GraphData;
        this.initGraph(graphData);
      } catch (e) {
        console.error("Failed to parse graph data:", e);
      }
    }
  }

  disconnectedCallback() {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "graph-data" && newValue && newValue !== oldValue) {
      try {
        const graphData = JSON.parse(newValue) as GraphData;
        this.initGraph(graphData);
      } catch (e) {
        console.error("Failed to parse graph data:", e);
      }
    }
  }

  private initGraph(graphData: GraphData) {
    if (this.cy) {
      this.cy.destroy();
    }

    const elements: cytoscape.ElementDefinition[] = [
      ...graphData.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
        },
      })),
      ...graphData.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        },
      })),
    ];

    this.cy = cytoscape({
      container: this,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "bottom",
            "text-halign": "center",
            "font-size": "10px",
            color: "#e5e7eb",
            "text-margin-y": 5,
            width: 30,
            height: 30,
            "background-color": (ele) => nodeColors[ele.data("type")] || "#6b7280",
            "border-width": 2,
            "border-color": "#374151",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#ffffff",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": (ele) => edgeColors[ele.data("type")] || "#6b7280",
            "target-arrow-color": (ele) => edgeColors[ele.data("type")] || "#6b7280",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.7,
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 3,
            opacity: 1,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: false,
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 100,
        gravity: 0.25,
      },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    // Click handler for navigation
    this.cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const type = node.data("type");
      const id = node.data("id");
      
      const typeToPath: Record<string, string> = {
        item: "items",
        resource: "resources",
        tile: "tiles",
        effect: "effects",
        npc: "npcs",
        quest: "quests",
        "house-tile": "house-tiles",
      };
      
      if (type === "map") {
        window.location.href = "/map";
        return;
      }
      const path = typeToPath[type];
      if (path) {
        window.location.href = `/${path}/${id}`;
      }
    });

    // Hover effects
    this.cy.on("mouseover", "node", () => {
      document.body.style.cursor = "pointer";
    });

    this.cy.on("mouseout", "node", () => {
      document.body.style.cursor = "default";
    });
  }

  zoomIn() {
    if (this.cy) {
      this.cy.zoom(this.cy.zoom() * 1.2);
    }
  }

  zoomOut() {
    if (this.cy) {
      this.cy.zoom(this.cy.zoom() / 1.2);
    }
  }

  fit() {
    if (this.cy) {
      this.cy.fit(undefined, 50);
    }
  }

  filterNodes(types: string[]) {
    if (this.cy) {
      this.cy.nodes().forEach((node) => {
        const nodeType = node.data("type");
        if (types.includes(nodeType)) {
          node.style("display", "element");
        } else {
          node.style("display", "none");
        }
      });
      
      // Hide edges connected to hidden nodes
      this.cy.edges().forEach((edge) => {
        const source = edge.source();
        const target = edge.target();
        const sourceHidden = source.style("display") === "none";
        const targetHidden = target.style("display") === "none";
        if (sourceHidden || targetHidden) {
          edge.style("display", "none");
        } else {
          edge.style("display", "element");
        }
      });
    }
  }
}

// Register the web component
customElements.define("cytoscape-graph", CytoscapeGraph);

// Expose helper functions globally for button handlers
declare global {
  interface Window {
    graphZoomIn: () => void;
    graphZoomOut: () => void;
    graphFit: () => void;
    graphFilter: (types: string[]) => void;
  }
}

window.graphZoomIn = () => {
  const graph = document.querySelector("cytoscape-graph") as CytoscapeGraph | null;
  graph?.zoomIn();
};

window.graphZoomOut = () => {
  const graph = document.querySelector("cytoscape-graph") as CytoscapeGraph | null;
  graph?.zoomOut();
};

window.graphFit = () => {
  const graph = document.querySelector("cytoscape-graph") as CytoscapeGraph | null;
  graph?.fit();
};

window.graphFilter = (types: string[]) => {
  const graph = document.querySelector("cytoscape-graph") as CytoscapeGraph | null;
  graph?.filterNodes(types);
};

// Effect list helpers (see components/EffectList.tsx)
window.addEffectRow = (listId: string) => {
  const list = document.getElementById(listId);
  const options = document.getElementById(`${listId}-options`) as HTMLTemplateElement | null;
  if (!list || !options) return;

  const name = list.dataset.name!;
  const index = Date.now();
  const inputClass = "px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500";
  const div = document.createElement("div");
  div.className = "flex items-center gap-2 bg-gray-600/50 p-2 rounded";
  div.setAttribute("data-effect-row", "");
  div.innerHTML = `
    <select name="${name}[${index}].id" class="flex-1 ${inputClass}">${options.innerHTML}</select>
    <input type="number" name="${name}[${index}].strength" value="1" min="0" step="any" title="Strength" class="w-24 ${inputClass}" />
    ${list.dataset.duration === "1" ? `<input type="number" name="${name}[${index}].duration" value="0" min="0" title="Duration (seconds, 0 = instant)" class="w-24 ${inputClass}" />` : ""}
    <button type="button" class="px-2 py-1 text-red-400 hover:text-red-300" onclick="this.closest('[data-effect-row]').remove()">✕</button>
  `;
  list.appendChild(div);
};

// Map editor rows (see templates/map-editor.tsx). `__I__` in a template
// becomes a fresh index, and `__KEY__` each of `vars`.
const refreshMapPreview = (form: HTMLFormElement | null) =>
  form?.dispatchEvent(new Event("input", { bubbles: true }));

window.addMapRow = (templateId: string, listId: string, vars: Record<string, string> = {}) => {
  const template = document.getElementById(templateId) as HTMLTemplateElement | null;
  const list = document.getElementById(listId);
  if (!template || !list) return;

  let html = template.innerHTML.replaceAll("__I__", String(Date.now()));
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`__${key}__`, value);
  }
  list.insertAdjacentHTML("beforeend", html);
  refreshMapPreview(list.closest("form"));
};

window.removeMapRow = (button: HTMLElement) => {
  const form = button.closest("form");
  button.closest("[data-row]")?.remove();
  refreshMapPreview(form);
};

// NPC Relationship helpers
const RELATIONSHIP_TYPES = ["friends", "family", "rivals", "enemies", "mentors", "students", "acquaintances"];

window.addRelationshipEntry = (relType: string, defaultValue: string = "") => {
  const list = document.getElementById(`rel-${relType}-list`);
  if (!list) return;
  
  const index = list.children.length;
  const div = document.createElement("div");
  div.className = "flex items-center gap-2";
  div.innerHTML = `
    <input
      type="text"
      name="relationships[${relType}][${index}]"
      value="${defaultValue}"
      placeholder="NPC Name - Description of relationship"
      class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
    />
    <button type="button" class="px-2 py-1 text-red-400 hover:text-red-300" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(div);
  
  const input = div.querySelector("input");
  if (input) input.focus();
};

window.addRelationshipFromSelect = (selectEl: HTMLSelectElement, relType: string) => {
  const npcName = selectEl.value;
  if (!npcName) return;
  
  window.addRelationshipEntry(relType, `${npcName} - `);
  selectEl.value = "";
};

// Quest kind: show the story or contract fields
window.updateQuestKind = (kind: string) => {
  document.querySelectorAll<HTMLElement>("[data-quest-kind]").forEach((el) => {
    const shown = el.dataset.questKind === kind;
    el.style.display = shown ? "" : "none";
    el.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select, textarea").forEach((input) => {
      input.disabled = !shown;
    });
  });
};

// Quest Reward helpers
window.addReward = (rewardType: string = "item") => {
  const list = document.getElementById("rewards-list");
  if (!list) return;
  
  const index = list.children.length;
  const div = document.createElement("div");
  div.className = "flex items-center gap-3 bg-gray-700 p-3 rounded";
  div.setAttribute("data-reward-index", index.toString());
  
  let fieldsHtml = "";
  switch (rewardType) {
    case "item":
      fieldsHtml = `
        <input type="text" name="rewards[${index}].item_id" placeholder="item_id" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white" />
        <input type="number" name="rewards[${index}].amount" value="1" min="1" class="w-20 px-2 py-1 bg-gray-600 rounded text-white" />
      `;
      break;
    case "gold":
      fieldsHtml = `
        <input type="number" name="rewards[${index}].amount" value="100" min="1" placeholder="Amount" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white" />
      `;
      break;
    case "skill":
      fieldsHtml = `
        <select name="rewards[${index}].skill_id" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white">
          <option value="mining">Mining</option>
          <option value="woodcutting">Woodcutting</option>
          <option value="fishing">Fishing</option>
          <option value="crafting">Crafting</option>
          <option value="cooking">Cooking</option>
          <option value="combat">Combat</option>
        </select>
        <input type="number" name="rewards[${index}].amount" value="50" min="1" placeholder="XP" class="w-24 px-2 py-1 bg-gray-600 rounded text-white" />
      `;
      break;
  }
  
  div.innerHTML = `
    <select name="rewards[${index}].type" class="w-28 px-2 py-1 bg-gray-600 rounded text-white" onchange="window.updateRewardFields(this, ${index})">
      <option value="item" ${rewardType === "item" ? "selected" : ""}>Item</option>
      <option value="gold" ${rewardType === "gold" ? "selected" : ""}>Gold</option>
      <option value="skill" ${rewardType === "skill" ? "selected" : ""}>Skill XP</option>
    </select>
    <div id="reward-fields-${index}" class="flex-1 flex items-center gap-2">
      ${fieldsHtml}
    </div>
    <button type="button" onclick="this.closest('[data-reward-index]').remove()" class="text-red-400">✕</button>
  `;
  
  list.appendChild(div);
};

window.updateRewardFields = (selectEl: HTMLSelectElement, index: number) => {
  const container = document.getElementById(`reward-fields-${index}`);
  if (!container) return;
  
  const type = selectEl.value;
  let fieldsHtml = "";
  
  switch (type) {
    case "item":
      fieldsHtml = `
        <input type="text" name="rewards[${index}].item_id" placeholder="item_id" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white" />
        <input type="number" name="rewards[${index}].amount" value="1" min="1" class="w-20 px-2 py-1 bg-gray-600 rounded text-white" />
      `;
      break;
    case "gold":
      fieldsHtml = `
        <input type="number" name="rewards[${index}].amount" value="100" min="1" placeholder="Amount" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white" />
      `;
      break;
    case "skill":
      fieldsHtml = `
        <select name="rewards[${index}].skill_id" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white">
          <option value="mining">Mining</option>
          <option value="woodcutting">Woodcutting</option>
          <option value="fishing">Fishing</option>
          <option value="crafting">Crafting</option>
          <option value="cooking">Cooking</option>
          <option value="combat">Combat</option>
        </select>
        <input type="number" name="rewards[${index}].amount" value="50" min="1" placeholder="XP" class="w-24 px-2 py-1 bg-gray-600 rounded text-white" />
      `;
      break;
  }
  
  container.innerHTML = fieldsHtml;
};

// Quest chips: prerequisites, or a story quest's exclusions
window.addPrerequisite = (selectEl: HTMLSelectElement, field = "prerequisites") => {
  const questId = selectEl.value;
  if (!questId) return;
  
  const list = document.getElementById(`${field}-list`);
  if (!list) return;
  
  // Check if already added
  const existing = list.querySelector(`input[value="${questId}"]`);
  if (existing) {
    selectEl.value = "";
    return;
  }
  
  const index = list.children.length;
  const questName = selectEl.options[selectEl.selectedIndex].text;
  
  const span = document.createElement("span");
  span.className = "inline-flex items-center gap-1 px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm";
  span.innerHTML = `
    <input type="hidden" name="${field}[${index}]" value="${questId}" />
    ${questName}
    <button type="button" onclick="this.parentElement.remove()" class="ml-1 hover:text-rose-300">✕</button>
  `;
  
  list.appendChild(span);
  selectEl.value = "";
};

// Durability visibility toggle for RequiredItemList
window.updateDurabilityVisibility = (selectEl: HTMLSelectElement) => {
  const durabilityMap = JSON.parse(selectEl.getAttribute("data-durability-map") || "{}");
  const selectedItemId = selectEl.value;
  const container = selectEl.closest("[data-index]");
  const durabilityField = container?.querySelector("[data-durability-container]");
  
  if (durabilityField) {
    if (durabilityMap[selectedItemId]) {
      durabilityField.classList.remove("hidden");
    } else {
      durabilityField.classList.add("hidden");
    }
  }
};

// Icon picker (see components/IconPicker.tsx)
window.pickIcon = (button: HTMLElement, id: string) => {
  const picker = button.closest("[data-icon-picker]");
  if (!picker) return;
  picker.querySelector<HTMLInputElement>('input[type="hidden"]')!.value = id;
  picker.querySelector("[data-icon-preview] use")!.setAttribute("href", id ? `#icon-${id}` : "");
  const label = picker.querySelector<HTMLElement>("[data-icon-label]")!;
  label.textContent = id || "None (shows a monogram)";
  label.classList.replace("text-red-400", "text-gray-300");
  picker.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.setAttribute("aria-pressed", String(el.dataset.icon === id));
  });
};

window.filterIcons = (input: HTMLInputElement) => {
  const query = input.value.trim().toLowerCase();
  input
    .closest("[data-icon-picker]")
    ?.querySelectorAll<HTMLElement>("[data-icon]")
    .forEach((el) => el.classList.toggle("hidden", !el.dataset.icon!.includes(query)));
};

// Extend Window interface
declare global {
  interface Window {
    pickIcon: (button: HTMLElement, id: string) => void;
    filterIcons: (input: HTMLInputElement) => void;
    addEffectRow: (listId: string) => void;
    addMapRow: (templateId: string, listId: string, vars?: Record<string, string>) => void;
    removeMapRow: (button: HTMLElement) => void;
    addRelationshipEntry: (relType: string, defaultValue?: string) => void;
    addRelationshipFromSelect: (selectEl: HTMLSelectElement, relType: string) => void;
    updateQuestKind: (kind: string) => void;
    addReward: (rewardType?: string) => void;
    updateRewardFields: (selectEl: HTMLSelectElement, index: number) => void;
    addPrerequisite: (selectEl: HTMLSelectElement, field?: string) => void;
    updateDurabilityVisibility: (selectEl: HTMLSelectElement) => void;
  }
}
