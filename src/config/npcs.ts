import type { Npc } from "./types.js";

export const npcs: Npc[] = [
  {
    entity_id: "npc_elder_sage",
    name: "Elara the Elder Sage",
    backstory:
      "The last survivor of the extinct Order of the Crystal Mind, Elara's silver hair crackles with residual magic from a century of spellcraft. She carries the burden of her order's downfall, caused by a forbidden spell gone wrong.",
    personalMission:
      "To find a worthy apprentice to pass on her knowledge before time runs out.",
    hopes:
      "To rebuild a small magical academy that honors her order's traditions while avoiding their fatal mistakes.",
    fears:
      "That ancient magical knowledge will die with her, lost to time like her order before it.",
    relationships: {
      friends: [
        "Professor Lumen - shares her passion for ancient knowledge and often debates magical theory",
        "Celeste the Mystic Seer - both understand the burden of profound knowledge",
      ],
      rivals: [
        "Vex the Hermit Alchemist - disapproves of their reckless experimentation",
      ],
      mentors: [
        "Gizmo the Inventor - secretly guides their magical-mechanical experiments",
      ],
    },
  },
  {
    entity_id: "npc_rogue_merchant",
    name: "Zephyr the Rogue Merchant",
    backstory:
      "The disguised son of House Blackwind, a noble family framed for trading forbidden artifacts. He maintains a carefully crafted persona of the carefree trader while searching for proof of their innocence.",
    personalMission:
      "To acquire a legendary artifact that will clear his family's name.",
    hopes: "To reopen his family's grand trading house in the capital city.",
    fears: "Being discovered before completing his mission.",
    relationships: {
      friends: [
        "Merry the Innkeeper - they exchange information about travelers",
        "Lyria the Bard - helps spread positive rumors about his business",
      ],
      cautious: [
        "Forge the Blacksmith - suspects there's more to Zephyr than meets the eye",
      ],
      avoids: ["Doran the Village Elder - fears his past might be discovered"],
    },
  },
  {
    entity_id: "npc_warrior_outcast",
    name: "Thorne the Warrior Outcast",
    backstory:
      "Once heir to his clan's leadership, Thorne was framed for stealing a sacred weapon. His clan tattoos are partially scarred over - a self-imposed mark of shame.",
    personalMission:
      "To prove his innocence and restore his honor among his people.",
    hopes: "To return home as a hero rather than a penitent.",
    fears: "That too much time has passed for true reconciliation.",
    relationships: {
      friends: [
        "Grizzled Greg - understands the weight of past failures",
        "Forge the Blacksmith - helps maintain his weapons and shares warrior's code",
      ],
      trust: ["Willow the Guardian - helps her protect the forest's borders"],
      tense: [
        "Zephyr the Merchant - suspects he knows something about the stolen weapon",
      ],
    },
  },
  {
    entity_id: "npc_nature_guardian",
    name: "Willow the Nature Guardian",
    backstory:
      "Chosen by the ancient trees as a child, marked with glowing leaf-like birthmarks. She feels the forest's pain as her own and battles an encroaching corruption that plagues her dreams.",
    personalMission:
      "To heal the corrupted heart of the forest and restore balance to the land.",
    hopes: "To find a way for humans and nature to truly coexist.",
    fears: "That the corruption will spread faster than she can contain it.",
    relationships: {
      allies: [
        "Sylvan the Ranger - work together to protect the forest",
        "Vex the Alchemist - provides remedies for sick plants",
      ],
      conflict: [
        "Gizmo the Inventor - worries about their experiments affecting nature",
      ],
      respect: [
        "Doran the Elder - values their traditional knowledge of the land",
      ],
    },
  },
  {
    entity_id: "npc_inventor_tinkerer",
    name: "Gizmo the Inventor Tinkerer",
    backstory:
      "A brilliant mind driven by the need to prove wrong those who mocked his father's failed inventions. His workshop is a chaos of projects, each promising to be 'the one' that changes everything.",
    personalMission:
      "To create the ultimate invention that will revolutionize the world.",
    hopes: "To honor his father's memory with a world-changing discovery.",
    fears:
      "Repeating his father's pattern of brilliant ideas that fail in execution.",
    relationships: {
      collaborators: [
        "Forge the Blacksmith - helps with metalwork for inventions",
        "Professor Lumen - shares theoretical knowledge",
      ],
      strained: [
        "Willow the Guardian - their experiments sometimes disturb the forest",
      ],
      admires: ["Elara the Sage - seeks her approval for magical mechanisms"],
    },
  },
  {
    entity_id: "npc_village_elder",
    name: "Doran the Village Elder",
    backstory:
      "Former adventurer who settled down to lead after saving the village from a terrible drought. His seemingly simple wisdom masks deep knowledge of ancient threats.",
    personalMission:
      "To preserve the village's traditions and guide the younger generation.",
    hopes: "To see the village become a beacon of stability in troubled times.",
    fears:
      "That modern influences will erode the old ways that protect the village.",
    relationships: {
      trusted_advisors: [
        "Elara the Sage - consults on magical matters",
        "Merry the Innkeeper - keeps him informed of village gossip",
      ],
      wary: ["Zephyr the Merchant - distrusts his mysterious background"],
      guides: ["Finn the Fisherman - helps keep traditional stories alive"],
    },
  },
  {
    entity_id: "npc_traveling_bard",
    name: "Lyria the Traveling Bard",
    backstory:
      "Born during a meteor shower, Lyria's songs carry subtle magic that stirs deep emotions. She searches for tales of heroes not to entertain, but to understand what makes legends rise or fall.",
    personalMission:
      "To compose an epic ballad that will be remembered for generations.",
    hopes: "To witness and chronicle a truly world-changing event.",
    fears: "That her greatest songs will be forgotten or misunderstood.",
    relationships: {
      friends: [
        "Finn the Fisherman - they exchange stories",
        "Merry the Innkeeper - performs regularly at the inn",
      ],
      fascinated_by: [
        "Celeste the Seer - hopes to write a ballad about their visions",
      ],
      inspired_by: ["Grizzled Greg - collects tales of his adventures"],
    },
  },
  {
    entity_id: "npc_hermit_alchemist",
    name: "Vex the Hermit Alchemist",
    backstory:
      "Lost their family to an incurable plague, leading to an obsession with medicinal alchemy. Their reclusive nature stems from a failed cure that had devastating side effects.",
    personalMission: "To create an elixir that can cure any ailment.",
    hopes: "To prevent others from experiencing their loss.",
    fears: "That their experiments might cause more harm than good.",
    relationships: {
      collaborates: [
        "Willow the Guardian - studies natural remedies",
        "Professor Lumen - shares research notes",
      ],
      distrusts: ["Elara the Sage - differs on approach to magical healing"],
      helps: ["Thorne the Warrior - provides healing potions for his quests"],
    },
  },
  {
    entity_id: "npc_blacksmith",
    name: "Forge the Master Blacksmith",
    backstory:
      "Descendant of legendary dwarven smiths, raised by humans after being orphaned. Combines traditional techniques with innovative methods learned through necessity.",
    personalMission:
      "To forge a legendary weapon using rare materials from the crystal cavern.",
    hopes:
      "To create something that proves they honor both their dwarven heritage and human upbringing.",
    fears: "That they'll never live up to their ancestors' legacy.",
    relationships: {
      partnerships: [
        "Gizmo the Inventor - collaborate on mechanical projects",
        "Thorne the Warrior - tests weapons and provides feedback",
      ],
      suspicious: ["Zephyr the Merchant - questions source of rare materials"],
      respects: ["Doran the Elder - appreciates their traditional knowledge"],
    },
  },
  {
    entity_id: "npc_mystic_seer",
    name: "Celeste the Mystic Seer",
    backstory:
      "Cursed with visions of possible futures after drinking from an enchanted spring. Each prophecy she prevents adds another strand of white to her raven hair.",
    personalMission: "To prevent a dark prophecy from coming true.",
    hopes: "To find someone who can share her burden of knowledge.",
    fears: "That attempting to prevent one disaster will cause a worse one.",
    relationships: {
      confidants: [
        "Elara the Sage - discusses prophetic visions",
        "Professor Lumen - helps interpret historical context",
      ],
      worried_about: [
        "Vex the Alchemist - has seen troubling futures involving their experiments",
      ],
      inspires: ["Lyria the Bard - provides cryptic warnings through her"],
    },
  },
  {
    entity_id: "npc_ranger",
    name: "Sylvan the Forest Ranger",
    backstory:
      "Raised by woodland spirits after being lost in the forest as a child. Can communicate with animals but struggles to understand human social cues.",
    personalMission:
      "To protect the forest from a creeping corruption spreading from the abandoned mine.",
    hopes: "To bridge the gap between the human and spirit worlds.",
    fears:
      "That they'll have to choose between their human and spirit families.",
    relationships: {
      partners: [
        "Willow the Guardian - work together protecting the forest",
        "Finn the Fisherman - helps monitor water purity",
      ],
      distrusts: ["Gizmo the Inventor - worries about mechanical disturbances"],
      learns_from: ["Doran the Elder - helps understand human customs"],
    },
  },
  {
    entity_id: "npc_fisherman",
    name: "Finn the Lucky Fisherman",
    backstory:
      "Made a deal with a water spirit for legendary fishing luck, but must tell a true story for every fish caught. His tall tales are actually all true.",
    personalMission:
      "To catch the legendary fish said to inhabit the depths of the wondrous waterfall.",
    hopes:
      "To find an apprentice who appreciates both fishing and storytelling.",
    fears: "Running out of stories to tell the water spirit.",
    relationships: {
      friends: [
        "Lyria the Bard - share stories and songs",
        "Merry the Innkeeper - favorite storytelling spot",
      ],
      helps: ["Sylvan the Ranger - monitors river health"],
      entertains: ["Grizzled Greg - they compete with adventure stories"],
    },
  },
  {
    entity_id: "npc_scholar",
    name: "Professor Lumen",
    backstory:
      "Former royal archivist who discovered a conspiracy in ancient texts. Now poses as an absent-minded academic while secretly documenting a pattern in historical events.",
    personalMission:
      "To decipher the mysterious runes found in the crystal cavern.",
    hopes: "To prevent history from repeating a forgotten catastrophe.",
    fears:
      "That publishing their findings would trigger the very disaster they hope to prevent.",
    relationships: {
      collaborates: [
        "Elara the Sage - share magical research",
        "Celeste the Seer - connects prophecies to historical events",
      ],
      mentors: ["Gizmo the Inventor - guides theoretical studies"],
      concerned_about: [
        "Vex the Alchemist - recognizes dangerous historical parallels",
      ],
    },
  },
  {
    entity_id: "npc_innkeeper",
    name: "Merry the Welcoming Innkeeper",
    backstory:
      "A retired spy who now uses her network of contacts to protect travelers and track threats to the village. Her famous recipes contain coded messages for other former spies.",
    personalMission:
      "To make her inn famous throughout the land for its hospitality and hearty meals.",
    hopes: "To create a true safe haven for all travelers.",
    fears: "That her past will endanger her guests.",
    relationships: {
      information_network: [
        "Zephyr the Merchant - exchange traveler news",
        "Doran the Elder - reports village concerns",
      ],
      hosts: ["Lyria the Bard - regular performer at the inn"],
      watches: ["Celeste the Seer - monitors their prophetic mumblings"],
    },
  },
  {
    entity_id: "npc_retired_adventurer",
    name: "Grizzled Greg",
    backstory:
      "Lost his leg to a legendary beast he failed to slay. The creature still lives, and he secretly tracks its movements while training others to succeed where he failed.",
    personalMission:
      "To train a worthy successor to take up his mantle and continue his unfinished quests.",
    hopes: "To see his greatest failure turned into someone else's triumph.",
    fears: "That his pride will lead another adventurer to their doom.",
    relationships: {
      mentors: [
        "Thorne the Warrior - sees potential for redemption",
        "Several young villagers - teaches combat basics",
      ],
      drinking_buddies: ["Finn the Fisherman - they exchange tall tales"],
      respects: ["Doran the Elder - fellow retired adventurer"],
    },
  },
];
