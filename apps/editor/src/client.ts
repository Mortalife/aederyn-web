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
  type: "item" | "resource" | "tile" | "npc" | "quest" | "house-tile";
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
  npc: "#8b5cf6",
  quest: "#f43f5e",
  "house-tile": "#06b6d4",
};

const edgeColors: Record<string, string> = {
  yields: "#10b981",
  requires: "#f59e0b",
  found_on: "#3b82f6",
  giver: "#8b5cf6",
  rewards: "#f43f5e",
  transforms_to: "#06b6d4",
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
        npc: "npcs",
        quest: "quests",
        "house-tile": "house-tiles",
      };
      
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

// Item Effects helpers
const EFFECT_TYPES = [
  { value: "heal", label: "Heal HP" },
  { value: "restore_mana", label: "Restore Mana" },
  { value: "buff_strength", label: "Buff Strength" },
  { value: "buff_dexterity", label: "Buff Dexterity" },
  { value: "buff_intelligence", label: "Buff Intelligence" },
  { value: "damage_over_time", label: "Damage Over Time" },
  { value: "poison", label: "Poison" },
  { value: "speed_boost", label: "Speed Boost" },
];

window.addItemEffect = () => {
  const list = document.getElementById("effects-list");
  if (!list) return;
  
  const index = list.children.length;
  const div = document.createElement("div");
  div.className = "flex items-center gap-2 bg-gray-600/50 p-2 rounded";
  div.setAttribute("data-effect-index", index.toString());
  
  const options = EFFECT_TYPES.map(t => 
    `<option value="${t.value}">${t.label}</option>`
  ).join("");
  
  div.innerHTML = `
    <select name="effects[${index}].type" class="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500">
      ${options}
    </select>
    <input type="number" name="effects[${index}].value" value="0" placeholder="Value" class="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500" />
    <input type="number" name="effects[${index}].duration" value="0" placeholder="Duration" class="w-24 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500" />
    <button type="button" class="px-2 py-1 text-red-400 hover:text-red-300" onclick="this.closest('[data-effect-index]').remove()">✕</button>
  `;
  
  list.appendChild(div);
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

// Quest Objective helpers
window.addObjective = (objectiveType: string = "gather") => {
  const list = document.getElementById("objectives-list");
  if (!list) return;
  
  const index = list.children.length;
  const div = document.createElement("div");
  div.className = "bg-gray-700 rounded-lg p-4 border border-gray-600";
  div.setAttribute("data-objective-index", index.toString());
  
  div.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <select name="objectives[${index}].type" class="bg-gray-600 rounded px-3 py-1 text-white" onchange="window.updateObjectiveFields(${index}, this.value)">
          <option value="gather">Gather Resource</option>
          <option value="collect">Collect Item</option>
          <option value="talk">Talk to NPC</option>
          <option value="explore">Explore Location</option>
          <option value="craft">Craft at Station</option>
        </select>
      </div>
      <button type="button" onclick="this.closest('[data-objective-index]').remove()" class="text-red-400 hover:text-red-300">Remove</button>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="text-xs text-gray-400">Objective ID</label>
        <input type="text" name="objectives[${index}].id" placeholder="obj_${index + 1}" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
      </div>
      <div>
        <label class="text-xs text-gray-400">Description</label>
        <input type="text" name="objectives[${index}].description" placeholder="Auto-generated if empty" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
      </div>
    </div>
    <div id="objective-fields-${index}" class="objective-type-fields">
      ${window.getObjectiveFieldsHtml(index, objectiveType)}
    </div>
  `;
  
  list.appendChild(div);
};

window.updateObjectiveFields = (index: number, type: string) => {
  const container = document.getElementById(`objective-fields-${index}`);
  if (container) {
    container.innerHTML = window.getObjectiveFieldsHtml(index, type);
  }
};

window.getObjectiveFieldsHtml = (index: number, type: string): string => {
  const resourceSelect = document.getElementById("resources-data")?.getAttribute("data-resources") || "[]";
  const itemSelect = document.getElementById("items-data")?.getAttribute("data-items") || "[]";
  const npcSelect = document.getElementById("npcs-data")?.getAttribute("data-npcs") || "[]";
  
  switch (type) {
    case "gather":
    case "craft":
      return `
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-400">${type === "craft" ? "Crafting Station" : "Resource"}</label>
            <input type="text" name="objectives[${index}].resource_id" placeholder="resource_id" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
          <div>
            <label class="text-xs text-gray-400">Amount</label>
            <input type="number" name="objectives[${index}].amount" value="1" min="1" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
        </div>
      `;
    case "collect":
      return `
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-400">Item</label>
            <input type="text" name="objectives[${index}].item_id" placeholder="item_id" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
          <div>
            <label class="text-xs text-gray-400">Amount</label>
            <input type="number" name="objectives[${index}].amount" value="1" min="1" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
        </div>
      `;
    case "talk":
      return `
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-xs text-gray-400">NPC Entity ID</label>
            <input type="text" name="objectives[${index}].entity_id" placeholder="npc_id" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
          <div>
            <label class="text-xs text-gray-400">Zone ID</label>
            <input type="text" name="objectives[${index}].zone_id" placeholder="zone_id" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
        </div>
        <div class="bg-gray-800 rounded p-3">
          <label class="text-xs text-gray-400 mb-2 block">Dialog Steps</label>
          <div id="dialog-steps-${index}" class="space-y-2 mb-2"></div>
          <button type="button" onclick="window.addDialogStep(${index})" class="w-full py-1 border border-dashed border-gray-500 rounded text-gray-400 text-sm hover:border-cyan-500 hover:text-cyan-400">+ Add Dialog Step</button>
        </div>
      `;
    case "explore":
      return `
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="text-xs text-gray-400">Zone ID</label>
            <input type="text" name="objectives[${index}].zone_id" placeholder="zone_id" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
          <div>
            <label class="text-xs text-gray-400">Discovery Chance (%)</label>
            <input type="number" name="objectives[${index}].chance" value="100" min="1" max="100" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
          <div class="col-span-3">
            <label class="text-xs text-gray-400">Found Message</label>
            <input type="text" name="objectives[${index}].found_message" placeholder="Message when discovered" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
          </div>
        </div>
      `;
    default:
      return "";
  }
};

window.addDialogStep = (objectiveIndex: number) => {
  const list = document.getElementById(`dialog-steps-${objectiveIndex}`);
  if (!list) return;
  
  const stepIndex = list.children.length;
  const div = document.createElement("div");
  div.className = "flex gap-2 items-start";
  div.innerHTML = `
    <input type="text" name="objectives[${objectiveIndex}].dialog_steps[${stepIndex}].entity_id" placeholder="Entity ID (empty = player)" class="w-32 px-2 py-1 bg-gray-600 rounded text-white text-sm" />
    <textarea name="objectives[${objectiveIndex}].dialog_steps[${stepIndex}].dialog" rows="2" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white text-sm" placeholder="Dialog text..."></textarea>
    <button type="button" onclick="this.parentElement.remove()" class="text-red-400 text-sm">✕</button>
  `;
  list.appendChild(div);
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

// Prerequisites helper
window.addPrerequisite = (selectEl: HTMLSelectElement) => {
  const questId = selectEl.value;
  if (!questId) return;
  
  const list = document.getElementById("prerequisites-list");
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
    <input type="hidden" name="prerequisites[${index}]" value="${questId}" />
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

// Extend Window interface
declare global {
  interface Window {
    addItemEffect: () => void;
    addRelationshipEntry: (relType: string, defaultValue?: string) => void;
    addRelationshipFromSelect: (selectEl: HTMLSelectElement, relType: string) => void;
    addObjective: (objectiveType?: string) => void;
    updateObjectiveFields: (index: number, type: string) => void;
    getObjectiveFieldsHtml: (index: number, type: string) => string;
    addDialogStep: (objectiveIndex: number) => void;
    addReward: (rewardType?: string) => void;
    updateRewardFields: (selectEl: HTMLSelectElement, index: number) => void;
    addPrerequisite: (selectEl: HTMLSelectElement) => void;
    updateDurabilityVisibility: (selectEl: HTMLSelectElement) => void;
  }
}
