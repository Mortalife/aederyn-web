import type { Quest } from "./types.js";

export const quests: Quest[] = [
  {
    id: "quest_pulling_your_weight",
    kind: "story",
    type: "collection",
    name: "Pulling Your Weight",
    description:
      "Maren Pike, the company's quartermaster, wants every new settler earning their keep. Hobb can't put a tool in your hand without the makings: flint from Flint Beck, sticks and grass.",
    giver: { entity_id: "npc_maren_pike" },
    objectives: [
      {
        id: "talk_maren",
        type: "talk",
        description: "Speak with Maren Pike at the camp",
        entity_id: "npc_maren_pike",
        dialog_steps: [
          {
            entity_id: "npc_maren_pike",
            dialog:
              "Off the last boat, are you? Welcome to the Landing. The company's fed you this far. From here on you earn your keep.",
          },
          { entity_id: null, dialog: "Where do I start?" },
          {
            entity_id: "npc_maren_pike",
            dialog:
              "Hobb needs makings before he can put a tool in your hand: grass for twine, sticks for hafts, and flint for an edge. The best flint's at Flint Beck, a short walk east of camp. Gather what you can and bring it back here.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_flint_beck",
        type: "explore",
        description: "Walk to Flint Beck, east of camp",
        landmark: "landmark_flint_beck",
        chance: 1,
        found_message:
          "The beck runs clear over a bed of grey flint. There's long grass and deadwood along the bank.",
        progress: null,
      },
      {
        id: "gather_flint",
        type: "gather",
        description: "Pick flint from the beck bed",
        resource_id: "resource_flint_pebbles",
        amount: 2,
        progress: null,
      },
      {
        id: "gather_sticks",
        type: "gather",
        description: "Gather sticks from fallen branches",
        resource_id: "resource_fallen_branches",
        amount: 2,
        progress: null,
      },
      {
        id: "gather_grass",
        type: "gather",
        description: "Pull long grass",
        resource_id: "resource_long_grass",
        amount: 3,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_maren_pike",
      message:
        "Flint, sticks and grass. That's a start, and it's in the ledger. Take it to Hobb at the workbench next door. He'll show you what it's for.",
      return_message:
        "Hobb's at the workbench, just east of my tent. The board's here when you want paid work.",
    },
    rewards: [
      { type: "gold", amount: 10 },
      { type: "item", item_id: "item_blackberries", amount: 3 },
    ],
    is_tutorial: true,
  },
  {
    id: "quest_an_edge_to_work_with",
    kind: "story",
    type: "crafting",
    name: "An Edge to Work With",
    description:
      "Hobb Carrow will show you how to turn grass, sticks and flint into your first tool, and what to do with it.",
    giver: { entity_id: "npc_hobb_carrow" },
    objectives: [
      {
        id: "talk_hobb",
        type: "talk",
        description: "Speak with Hobb Carrow at the workbench",
        entity_id: "npc_hobb_carrow",
        dialog_steps: [
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "Maren sent you? Let's see what you've got. Flint, sticks, grass. That's an axe, near enough.",
          },
          {
            entity_id: null,
            dialog: "How do I make an axe out of grass?",
          },
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "The grass is for the binding. Twist three handfuls into twine first. Then knap two flints to an edge, set them in the stick and bind it tight. Use the bench, it's what it's for.",
          },
        ],
        progress: null,
      },
      {
        id: "craft_twine",
        type: "craft",
        description: "Twist grass into twine at the workbench",
        resource_id: "resource_crafting_item_grass_twine",
        amount: 1,
        progress: null,
      },
      {
        id: "craft_axe",
        type: "craft",
        description: "Make a flint axe at the workbench",
        resource_id: "resource_crafting_item_flint_axe",
        amount: 1,
        progress: null,
      },
      {
        id: "chop_trunk",
        type: "gather",
        description: "Chop a log from a fallen trunk at the tree line",
        resource_id: "resource_fallen_trunk",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_hobb_carrow",
      message:
        "Good clean cut. Keep that log, you'll want it. Mind the axe, too: flint chips, and when it's blunt it's done and you come back and make another. A pick and a sickle are the same work. The bench knows how.",
      return_message:
        "Pick for the old walls, sickle for the flax. Bring me the makings and the bench is yours.",
    },
    rewards: [
      { type: "gold", amount: 10 },
      { type: "item", item_id: "item_grass_twine", amount: 2 },
    ],
    prerequisites: ["quest_pulling_your_weight"],
    is_tutorial: true,
  },
  {
    id: "quest_something_hot",
    kind: "story",
    type: "crafting",
    name: "Something Hot",
    description:
      "Ada Thwaite has noticed the cut on your hand. She'll show you how to make a yarrow poultice, and why you eat before you're in trouble, not after.",
    giver: { entity_id: "npc_ada_thwaite" },
    objectives: [
      {
        id: "talk_ada",
        type: "talk",
        description: "Speak with Ada Thwaite at the campfire",
        entity_id: "npc_ada_thwaite",
        dialog_steps: [
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "You've been at Hobb's bench all morning and you've a cut on your hand to show for it. Sit down.",
          },
          { entity_id: null, dialog: "It's nothing." },
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "It's nothing here. Out there it'll be something. Yarrow grows at the meadow's edge and by the beck: feathery leaves, flat white flowers. Bring me two sprigs and a flask of spring water and I'll show you a poultice.",
          },
        ],
        progress: null,
      },
      {
        id: "gather_yarrow",
        type: "gather",
        description: "Pick yarrow",
        resource_id: "resource_yarrow",
        amount: 2,
        progress: null,
      },
      {
        id: "fill_water",
        type: "gather",
        description: "Fill a flask at a spring",
        resource_id: "resource_spring",
        amount: 1,
        progress: null,
      },
      {
        id: "cook_poultice",
        type: "craft",
        description: "Make a yarrow poultice at the campfire",
        resource_id: "resource_crafting_item_yarrow_poultice",
        amount: 1,
        progress: null,
      },
      {
        id: "talk_ada_after",
        type: "talk",
        description: "Show Ada the poultice",
        entity_id: "npc_ada_thwaite",
        dialog_steps: [
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "There. Keep it by you and use it when you're hurt, not after you've fallen over. Food's the same: a handful of berries, a bit of roast.",
          },
          { entity_id: null, dialog: "And the fire?" },
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "The fire's for everyone. Sit by it, or by Maren's tent, and you mend faster. Here, take a bowl of stew. Eat it slow and it keeps working on you for a good while after.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ada_thwaite",
      message:
        "You'll do. Next time you come back hurt, eat something before you do anything else. And don't bring me any mushrooms from past the trees. I mean it.",
      return_message:
        "Rabbit's easy meat. Bring me one with a sprig of yarrow and some spring water and you've a stew.",
    },
    rewards: [
      { type: "item", item_id: "item_rabbit_stew", amount: 1 },
      { type: "item", item_id: "item_blackberries", amount: 2 },
    ],
    prerequisites: ["quest_an_edge_to_work_with"],
    is_tutorial: true,
  },
  {
    id: "quest_hen_trouble",
    kind: "story",
    type: "combat",
    name: "Hen Trouble",
    description:
      "The feral hens are into the flax again, and Hobb reckons you're ready to deal with them. Make a club from your log, try it on a rabbit, then take on a hen and bring it to Ada.",
    giver: { entity_id: "npc_hobb_carrow" },
    objectives: [
      {
        id: "talk_hobb",
        type: "talk",
        description: "Speak with Hobb Carrow at the workbench",
        entity_id: "npc_hobb_carrow",
        dialog_steps: [
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "The hens are at the flax again. Feral, the lot of them, bred from farm flocks, if you can believe there were ever farms up here. Barehanded they'll peck you raw.",
          },
          { entity_id: null, dialog: "So I need a weapon." },
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "You've got a log. Shape it at the bench, a knob at one end, and you've a club. Put it in your hand before you go, not in your pack. Try it on a rabbit first. Anyone can catch a rabbit.",
          },
        ],
        progress: null,
      },
      {
        id: "craft_club",
        type: "craft",
        description: "Make a wooden club at the workbench",
        resource_id: "resource_crafting_item_wooden_club",
        amount: 1,
        progress: null,
      },
      {
        id: "kill_rabbit",
        type: "kill",
        description: "Catch a rabbit",
        monster_id: "monster_rabbit",
        count: 1,
        progress: null,
      },
      {
        id: "kill_chicken",
        type: "kill",
        description: "Kill a feral chicken",
        monster_id: "monster_chicken",
        count: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ada_thwaite",
      message:
        "Hobb said you'd be by with a hen, and you've still got both eyes. Roast it here any time: a stick for the spit and it's done. Take these two I made earlier.",
      return_message:
        "Hens for the fire, rabbits for the pot. The adders you leave alone till you've got something over your shins.",
    },
    rewards: [
      { type: "gold", amount: 15 },
      { type: "item", item_id: "item_roast_chicken", amount: 2 },
    ],
    prerequisites: ["quest_something_hot"],
    is_tutorial: true,
  },
  {
    id: "quest_lanes_end",
    kind: "story",
    type: "exploration",
    name: "Lane's End",
    description:
      "Ansel Morrow, the old man who keeps to the northern edge of camp, asks you to walk to where the old lane meets the Southwood and tell him what you see.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the camp's edge",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "You've been walking the Landing. Have you been north yet, to where the lane goes into the trees?",
          },
          { entity_id: null, dialog: "Not yet." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Go and look at it for me. My knees won't take the walk there and back. Stand at the end of the lane and look up the valley, then come and tell me what you saw. Don't go in.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_lanes_end",
        type: "explore",
        description: "Walk to Lane's End on the northern edge of the Landing",
        landmark: "landmark_lanes_end",
        chance: 1,
        found_message:
          "The lane runs between two old walls and stops at the trees as if cut with a knife. The walls go on under the leaves. A few steps in, pale mushrooms stand in a straight line, like a row of pegs.",
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow what you saw",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "The lane just stops at the trees. And there were mushrooms growing in a line.",
          },
          { entity_id: "npc_ansel_morrow", dialog: "In a line. Yes." },
          { entity_id: null, dialog: "Where did the lane go?" },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Up the valley, once, to the farms and past them. The people who lived on the Landing were taken downriver a long time ago. They were the lucky ones. Keep to the Landing for now, and if Ada tells you to leave the mushrooms be, you listen to her.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Thank you for being my legs. There'll be more I need to ask of you, when I can find the words for it.",
      return_message:
        "I'm only watching the valley. It's greener than I remember.",
    },
    rewards: [
      { type: "gold", amount: 20 },
      { type: "item", item_id: "item_yarrow_poultice", amount: 2 },
    ],
    prerequisites: ["quest_hen_trouble"],
  },
  {
    id: "quest_dressed_for_the_long_grass",
    kind: "story",
    type: "crafting",
    name: "Dressed for the Long Grass",
    description:
      "Adders bask in the gorse and on the old wall stones, and they bite through a bare shin. Hobb will show you how to make a sickle, cut wild flax, and turn it into linen.",
    giver: { entity_id: "npc_hobb_carrow" },
    objectives: [
      {
        id: "talk_hobb",
        type: "talk",
        description: "Speak with Hobb Carrow at the workbench",
        entity_id: "npc_hobb_carrow",
        dialog_steps: [
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "The adders are out on the wall stones and in the gorse. Quick as you like, and they'll bite through a bare shin. You want linen on you.",
          },
          { entity_id: null, dialog: "Where does linen come from?" },
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "Flax. It grows wild in the old fields. Cut it with a sickle, soak it in spring water, beat it and spin it, and the bench does the rest. Make a sickle first: flint, stick and twine, same as the axe.",
          },
        ],
        progress: null,
      },
      {
        id: "craft_sickle",
        type: "craft",
        description: "Make a flint sickle at the workbench",
        resource_id: "resource_crafting_item_sickle_01",
        amount: 1,
        progress: null,
      },
      {
        id: "cut_flax",
        type: "gather",
        description: "Cut wild flax in an old field",
        resource_id: "resource_wild_flax",
        amount: 2,
        progress: null,
      },
      {
        id: "fill_water",
        type: "gather",
        description: "Fill a flask at a spring",
        resource_id: "resource_spring",
        amount: 1,
        progress: null,
      },
      {
        id: "craft_linen",
        type: "craft",
        description: "Make linen at the workbench",
        resource_id: "resource_crafting_item_linen",
        amount: 1,
        progress: null,
      },
      {
        id: "craft_cap",
        type: "craft",
        description: "Make a linen cap at the workbench",
        resource_id: "resource_crafting_item_linen_cap",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_hobb_carrow",
      message:
        "It won't stop a wolf, but it'll make a snake think twice. Leggings and a quilted jerkin are the same work, only more of it, and hen feathers make the quilting. Keep the sickle: the flax always wants cutting.",
      return_message:
        "Adder skins make better gloves than anything I've got. Just saying.",
    },
    rewards: [
      { type: "gold", amount: 15 },
      { type: "item", item_id: "item_grass_twine", amount: 2 },
    ],
    prerequisites: ["quest_hen_trouble"],
  },
  {
    id: "quest_rabbits_in_the_flax",
    kind: "contract",
    type: "defence",
    name: "Rabbits in the Flax",
    description:
      "The company means to sow the old fields next spring, and the Landing's rabbits have other ideas. Thin them out.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_rabbits",
        type: "kill",
        description: "Catch rabbits on the Landing",
        monster_id: "monster_rabbit",
        count: 4,
        region: "landing",
        progress: null,
      },
    ],
    completion: {
      message:
        "Four rabbits off the books, and Ada will be glad of the meat. Signed and paid.",
    },
    rewards: [{ type: "gold", amount: 12 }],
  },
  {
    id: "quest_flax_for_the_company",
    kind: "contract",
    type: "collection",
    name: "Flax for the Company",
    description:
      "Linen sells downriver, and the company wants to know if the Landing's wild flax is worth sowing. Cut some for the stores.",
    board: "landmark_camp",
    objectives: [
      {
        id: "cut_flax",
        type: "gather",
        description: "Cut wild flax on the Landing",
        resource_id: "resource_wild_flax",
        amount: 3,
        region: "landing",
        progress: null,
      },
    ],
    completion: {
      message:
        "Good long stalks. Maren weighs them, writes a number down, and pays you.",
    },
    rewards: [{ type: "gold", amount: 18 }],
  },
  {
    id: "quest_stone_for_the_storehouse",
    kind: "contract",
    type: "collection",
    name: "Stone for the Storehouse",
    description:
      "The company's first stone building will be a storehouse, and the old field walls are full of good squared stone. Prise some out.",
    board: "landmark_camp",
    objectives: [
      {
        id: "prise_stone",
        type: "gather",
        description: "Prise stone from an old field wall on the Landing",
        resource_id: "resource_tumbled_wall",
        amount: 4,
        region: "landing",
        progress: null,
      },
    ],
    completion: {
      message:
        "Squared and true. Whoever built those walls knew their trade. The storehouse thanks you.",
    },
    rewards: [{ type: "gold", amount: 22 }],
  },
  {
    id: "quest_walk_the_old_walls",
    kind: "contract",
    type: "exploration",
    name: "Walk the Old Walls",
    description:
      "The company's surveyor is mapping the old field walls on the Landing to plan the first fields. One has been marked on the sketch map for checking.",
    board: "landmark_camp",
    objectives: [
      {
        id: "survey_wall",
        type: "explore",
        description: "Find the marked field wall on the Landing",
        region: "landing",
        tile: "tile_field_wall",
        chance: 1,
        found_message:
          "You find the marked wall and pace its length. The stones are set without mortar and cut square, older than anyone's grandmother.",
        progress: null,
      },
    ],
    completion: {
      message:
        "Maren copies your paces into the survey book and pays you for the walk.",
    },
    rewards: [{ type: "gold", amount: 10 }],
  },
  {
    id: "quest_adders_on_the_path",
    kind: "contract",
    type: "defence",
    name: "Adders on the Path",
    description:
      "Two settlers have been bitten this week. The company pays for every adder cleared from the Landing's gorse and walls. Wear something on your legs.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_adders",
        type: "kill",
        description: "Kill adders on the Landing",
        monster_id: "monster_adder",
        count: 2,
        region: "landing",
        progress: null,
      },
    ],
    completion: {
      message:
        "Two fewer adders by the path. The company pays danger money, and you've earned it.",
    },
    rewards: [{ type: "gold", amount: 25 }],
  },
  {
    id: "quest_past_the_tree_line",
    kind: "story",
    type: "exploration",
    name: "Past the Tree Line",
    description:
      "Jory Flint, the company's hunter, keeps a lodge in the Southwood and hasn't brought meat to camp in a week. Maren wants to know why, and she wants someone who can swing a club to go and ask.",
    giver: { entity_id: "npc_maren_pike" },
    objectives: [
      {
        id: "talk_maren",
        type: "talk",
        description: "Speak with Maren Pike at the camp",
        entity_id: "npc_maren_pike",
        dialog_steps: [
          {
            entity_id: "npc_maren_pike",
            dialog:
              "Jory Flint hasn't been in with meat for a week. He's the company's hunter, and he's built himself a lodge in a clearing past the tree line, north of camp.",
          },
          {
            entity_id: null,
            dialog: "Ansel told me to keep to the Landing.",
          },
          {
            entity_id: "npc_maren_pike",
            dialog:
              "Ansel doesn't pay you. The company does. Take your club, go north past Lane's End and find out if Jory's alive. If he is, he owes me a carcass.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_lodge",
        type: "explore",
        description: "Find Jory Flint's lodge in the Southwood, north of camp",
        landmark: "landmark_hunters_lodge",
        chance: 1,
        found_message:
          "A low lodge in a clearing, built of old squared beams still pegged together. Pelts hang on a rack by the door, pecked to rags, and a crowd of crows lifts off it as you come near.",
        progress: null,
      },
      {
        id: "talk_jory",
        type: "talk",
        description: "Speak with Jory Flint at the hunter's lodge",
        entity_id: "npc_jory_flint",
        dialog_steps: [
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Maren sent you? Then she's counting. Tell her the crows have had my rack for a week, and I can't shoot them fast enough.",
          },
          { entity_id: null, dialog: "I've got a club." },
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Better. Arrows go straight through a mob of crows and hit nothing. Wade in swinging and they break. There's a mob in every clearing hereabouts. Kill a couple, and cut me some birch on your way back. I've a fire to keep in.",
          },
        ],
        progress: null,
      },
      {
        id: "kill_crows",
        type: "kill",
        description: "Drive off crow swarms in the Southwood's clearings",
        monster_id: "monster_crow_swarm",
        count: 2,
        progress: null,
      },
      {
        id: "chop_birch",
        type: "gather",
        description: "Chop birch with your flint axe",
        resource_id: "resource_birch",
        amount: 2,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_jory_flint",
      message:
        "Rack's clear and the fire's in. Here's some sinew for your trouble. There's no better bowstring, and you'll want a bow before long. Tell Maren she'll get her boar when I've a hand to spare.",
      return_message:
        "Crows in the clearings, boar under the oaks, wolves up on the deer tracks. You'll get to know them all.",
    },
    rewards: [
      { type: "gold", amount: 20 },
      { type: "item", item_id: "item_sinew", amount: 2 },
    ],
    prerequisites: ["quest_lanes_end"],
  },
  {
    id: "quest_wolf_sign",
    kind: "story",
    type: "combat",
    name: "Wolf Sign",
    description:
      "Wolves have been robbing Jory's snares on the deer tracks. He'll show you how to make a skinning knife and a sinew-backed bow, and how to bring a wolf down before it reaches you.",
    giver: { entity_id: "npc_jory_flint" },
    objectives: [
      {
        id: "talk_jory",
        type: "talk",
        description: "Speak with Jory Flint at the hunter's lodge",
        entity_id: "npc_jory_flint",
        dialog_steps: [
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Wolves have been at my snares on the deer tracks, rabbits and all. I want a pelt or two off them, and you'll need more than a club for that. They weave. You'll swing at air.",
          },
          { entity_id: null, dialog: "What do I need?" },
          {
            entity_id: "npc_jory_flint",
            dialog:
              "A bow, and a knife to skin with. There's old bones on the deer tracks, picked clean. Split one for a handle and knap a flint for the blade. The bow's an oak stave backed with that sinew and glued down with birch tar. Ada's fire will render the bark to tar. Hobb's bench does the rest.",
          },
        ],
        progress: null,
      },
      {
        id: "gather_bones",
        type: "gather",
        description: "Gather old bones on a deer track",
        resource_id: "resource_scattered_bones",
        amount: 1,
        progress: null,
      },
      {
        id: "craft_knife",
        type: "craft",
        description: "Make a skinning knife at the workbench",
        resource_id: "resource_crafting_item_skinning_knife",
        amount: 1,
        progress: null,
      },
      {
        id: "chop_oak",
        type: "gather",
        description: "Chop an oak log in the oak wood",
        resource_id: "resource_oak",
        amount: 1,
        progress: null,
      },
      {
        id: "render_tar",
        type: "craft",
        description: "Render birch bark to tar at the campfire",
        resource_id: "resource_crafting_item_birch_tar",
        amount: 1,
        progress: null,
      },
      {
        id: "craft_bow",
        type: "craft",
        description: "Make a sinew-backed shortbow at the workbench",
        resource_id: "resource_crafting_item_shortbow",
        amount: 1,
        progress: null,
      },
      {
        id: "kill_wolves",
        type: "kill",
        description: "Shoot wolves on the deer tracks",
        monster_id: "monster_wolf",
        count: 2,
        progress: null,
      },
      {
        id: "scrape_pelt",
        type: "craft",
        description: "Scrape a wolf pelt on the rack at the lodge",
        resource_id: "resource_crafting_item_cured_hide",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_jory_flint",
      message:
        "Clean scrape, and you never let them close. That's all hunting is. A few more pelts and Hobb can make you a jerkin that'll turn a wolf's teeth. Boar hide wants salt and oak bark, and the old pollards and the salt licks want better tools than flint. Hobb knows how to set a flint in bone.",
      return_message:
        "Bow for wolves, a spear for crows, and for a boar, the bow and a tree to get behind.",
    },
    rewards: [
      { type: "gold", amount: 25 },
      { type: "item", item_id: "item_salt_boar", amount: 2 },
    ],
    prerequisites: ["quest_past_the_tree_line"],
  },
  {
    id: "quest_what_the_crows_wont_touch",
    kind: "story",
    type: "investigation",
    name: "What the Crows Won't Touch",
    description:
      "Something has been dragging Jory's kills north to the old wall at the edge of the Southwood, and it isn't wolves. He wants a second pair of eyes, and a boar for the pot first.",
    giver: { entity_id: "npc_jory_flint" },
    objectives: [
      {
        id: "talk_jory",
        type: "talk",
        description: "Speak with Jory Flint at the hunter's lodge",
        entity_id: "npc_jory_flint",
        dialog_steps: [
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Two days back I shot a boar under the oaks and went for the barrow. When I came back it was gone, dragged north. Not wolves. No blood, and the drag marks ran straight as a furrow.",
          },
          { entity_id: null, dialog: "Straight?" },
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Like it walked. Get me a boar first, so I know you can handle one. Arrows, mind: a spear skids off them. Then go up the tracks to the Far Stile at the north edge of the wood and tell me what's there. I'd go myself, but I've no wish to.",
          },
        ],
        progress: null,
      },
      {
        id: "kill_boar",
        type: "kill",
        description: "Kill a boar in the oak woods",
        monster_id: "monster_boar",
        count: 1,
        progress: null,
      },
      {
        id: "explore_far_stile",
        type: "explore",
        description:
          "Go north to the Far Stile at the Southwood's northern edge",
        landmark: "landmark_far_stile",
        chance: 1,
        found_message:
          "A hind lies across the old stile, dead a while, and nothing has touched it. Soft white growths stand along its back in neat rows, fine as lace. Threads of the same stuff run from its mouth into the leaf litter and away north, under the wall.",
        progress: null,
      },
      {
        id: "talk_jory_after",
        type: "talk",
        description: "Tell Jory Flint what you found",
        entity_id: "npc_jory_flint",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "There's a hind on the stile. White growths on it, in rows, and threads going down into the ground.",
          },
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Rows. That's what Ada says about the mushrooms past the tree line. I told her she was daft.",
          },
          { entity_id: null, dialog: "The crows won't go near it." },
          {
            entity_id: "npc_jory_flint",
            dialog:
              "Crows eat anything. I've seen them on a hanged man. Don't tell Maren yet: she'll want it in the ledger, and she'll want it explained. The old man at camp's edge asked me once if I'd seen anything odd up north. Go and tell him yes.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_jory_flint",
      message:
        "I'm moving my snares to the south side of the wood for a while. You'd do well to hunt there too. Take these. If you're walking about up north, you'll want them.",
      return_message:
        "I've moved my snares south. The wolves have moved south too, and I don't like that either.",
    },
    rewards: [
      { type: "gold", amount: 30 },
      { type: "item", item_id: "item_self_heal_salve", amount: 3 },
    ],
    prerequisites: ["quest_wolf_sign"],
  },
  {
    id: "quest_a_light_in_the_cellar",
    kind: "story",
    type: "investigation",
    name: "A Light in the Cellar",
    description:
      "Ansel Morrow went grey when you told him about the hind at the Far Stile. He asks you to take a light into the cellar of a sunken farm in the eastern Southwood and read what's cut above its door.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Tell Ansel Morrow about the hind at the Far Stile",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "Jory sent me. There's a dead hind at the Far Stile, grown over with white, in rows. Threads from it run into the ground.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog: "At the stile. As far south as that.",
          },
          { entity_id: null, dialog: "You know what it is." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "I know it shouldn't be there. There's a farm in the east of the wood, sunk to its sills. Its cellar has a stone over the door with lines cut in it, like my slab here. Take a light down and tell me whether the lines are whole. And look at what's written beside them.",
          },
        ],
        progress: null,
      },
      {
        id: "craft_torch",
        type: "craft",
        description: "Make a pitch torch at the workbench",
        resource_id: "resource_crafting_item_pitch_torch",
        amount: 1,
        progress: null,
      },
      {
        id: "explore_sunken_farm",
        type: "explore",
        description:
          "Go down into the cellar at the Sunken Farm, in the east of the Southwood",
        landmark: "landmark_sunken_farm",
        chance: 1,
        found_message:
          "By torchlight the cellar is dry and lined with old salt crocks. The lintel stone over the door is cut with careful lines like Ansel's slab, and one of them is cracked right through. Beside it someone has scratched a list of families into the plaster, and under the list, in another hand: TAKEN DOWN. ALL SOUTH OF THE STONES.",
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow what you read",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "One of the lines is cracked through. And there's a list of families, and under it: 'taken down, all south of the stones'.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog: "Cracked. Then it's failing from the outside as well.",
          },
          {
            entity_id: null,
            dialog:
              "What does 'south of the stones' mean? Who was north of them?",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "The stones are further up the valley. Everyone south of them was taken downriver before the work was done. That farm was on the list. That's all the list says.",
          },
          { entity_id: null, dialog: "That isn't what I asked." },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "No. It isn't. Keep your torch by you. There are darker holes in this valley than a cellar, and one day I'll have to ask you to go down them. Not yet.",
      return_message:
        "It's failing from the outside in. I thought we would have longer.",
    },
    rewards: [{ type: "gold", amount: 30 }],
    prerequisites: ["quest_what_the_crows_wont_touch"],
  },
  {
    id: "quest_wolves_on_the_deer_tracks",
    kind: "contract",
    type: "defence",
    name: "Wolves on the Deer Tracks",
    description:
      "Wolves have taken two of the company's goats and most of Jory's snares. The company pays a bounty for every wolf killed in the Southwood. Take a bow.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_wolves",
        type: "kill",
        description: "Kill wolves in the Southwood",
        monster_id: "monster_wolf",
        count: 3,
        region: "southwood",
        progress: null,
      },
    ],
    completion: {
      message:
        "Three wolves. Maren pays the bounty and asks, not for the first time, why there are so many of them this close to camp.",
    },
    rewards: [{ type: "gold", amount: 40 }],
    prerequisites: ["quest_past_the_tree_line"],
  },
  {
    id: "quest_boar_for_the_camp",
    kind: "contract",
    type: "combat",
    name: "Boar for the Camp",
    description:
      "Ada has a camp to feed and Jory can't keep up. The company pays for boar brought down in the Southwood's oak woods.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_boar",
        type: "kill",
        description: "Kill boar in the Southwood",
        monster_id: "monster_boar",
        count: 2,
        region: "southwood",
        progress: null,
      },
    ],
    completion: {
      message:
        "Two boar for the pot. Ada's already arguing with Maren over who gets the hides.",
    },
    rewards: [{ type: "gold", amount: 45 }],
    prerequisites: ["quest_past_the_tree_line"],
  },
  {
    id: "quest_oak_for_the_storehouse",
    kind: "contract",
    type: "collection",
    name: "Oak for the Storehouse",
    description:
      "The storehouse walls are going up, and it wants oak for the lintels and roof beams. Cut some in the Southwood.",
    board: "landmark_camp",
    objectives: [
      {
        id: "chop_oak",
        type: "gather",
        description: "Chop oak in the Southwood",
        resource_id: "resource_oak",
        amount: 4,
        region: "southwood",
        progress: null,
      },
    ],
    completion: {
      message:
        "Good straight oak. Hobb says it'll outlast the lot of us, and Maren writes that down too.",
    },
    rewards: [{ type: "gold", amount: 30 }],
    prerequisites: ["quest_past_the_tree_line"],
  },
  {
    id: "quest_where_the_deer_run",
    kind: "contract",
    type: "exploration",
    name: "Where the Deer Run",
    description:
      "The surveyor wants the Southwood's deer tracks on the map, to know where the game runs and where a road might go. One has been marked on the sketch map for checking.",
    board: "landmark_camp",
    objectives: [
      {
        id: "survey_track",
        type: "explore",
        description: "Find the marked deer track in the Southwood",
        region: "southwood",
        tile: "tile_deer_track",
        chance: 1,
        found_message:
          "You find the marked track and follow it to where it forks. Fresh slots in the mud, a salt lick worn into a bank, and wolf tracks over the deer's.",
        progress: null,
      },
    ],
    completion: {
      message:
        "Maren copies the track into the survey book and pays you for the walk. She asks whether a cart could get down it. It couldn't.",
    },
    rewards: [{ type: "gold", amount: 15 }],
    prerequisites: ["quest_past_the_tree_line"],
  },
  {
    id: "quest_smoke_on_the_scarp",
    kind: "story",
    type: "exploration",
    name: "Smoke on the Scarp",
    description:
      "There's smoke on the Scarp most mornings. Hobb says it's Bett Oakes, the company's smith, who went up the western hills to look for copper and hardly comes down. He wants bronze, and he wants you to go and ask for it.",
    giver: { entity_id: "npc_hobb_carrow" },
    objectives: [
      {
        id: "talk_hobb",
        type: "talk",
        description: "Speak with Hobb Carrow at the workbench",
        entity_id: "npc_hobb_carrow",
        dialog_steps: [
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "See the smoke up on the Scarp, west of the wood? That's Bett Oakes, the company's smith. She went up the first week to look for copper, and she only comes down to buy charcoal off Jory.",
          },
          { entity_id: null, dialog: "You want me to fetch her?" },
          {
            entity_id: "npc_hobb_carrow",
            dialog:
              "I want bronze. Flint's a good edge but a short one. Go west past the hunter's lodge to where the trees give out onto the hill, and follow the smoke. Take your bone pick. She'll want ore.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_forge",
        type: "explore",
        description:
          "Find Bett Oakes' forge on the Scarp, west of the Southwood",
        landmark: "landmark_forge",
        chance: 1,
        found_message:
          "An ore-house of squared stone at a mine mouth in the hillside, with a new roof of company canvas and a forge glowing inside. The doorway into the hill behind it is cut dead square, and there are lines carved over the lintel.",
        progress: null,
      },
      {
        id: "talk_bett",
        type: "talk",
        description: "Speak with Bett Oakes at the forge",
        entity_id: "npc_bett_oakes",
        dialog_steps: [
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Hobb sent you? Then he wants bronze, and he wanted it last week.",
          },
          { entity_id: null, dialog: "He says flint's a short edge." },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "It is. There's copper in the outcrops all over this hill, rock stained green where it breaks. Tin's the dark grit in the grey. That bone pick of yours will scratch out both. Bring me some and I'll show you what they're for.",
          },
        ],
        progress: null,
      },
      {
        id: "mine_copper",
        type: "gather",
        description: "Mine copper ore from an outcrop on the Scarp",
        resource_id: "resource_copper_outcrop",
        amount: 3,
        progress: null,
      },
      {
        id: "mine_tin",
        type: "gather",
        description: "Mine tin ore from an outcrop on the Scarp",
        resource_id: "resource_tin_outcrop",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_bett_oakes",
      message:
        "Good ore. Three of copper to one of tin, and charcoal under it, and that's bronze. Here's some charcoal from the clamp to start you. Come back when you've an hour and an oak log, and we'll pour.",
      return_message:
        "Green rock's copper, grey grit's tin. The hill's full of both.",
    },
    rewards: [
      { type: "gold", amount: 25 },
      { type: "item", item_id: "item_charcoal", amount: 4 },
    ],
    prerequisites: ["quest_a_light_in_the_cellar"],
  },
  {
    id: "quest_first_pour",
    kind: "story",
    type: "crafting",
    name: "First Pour",
    description:
      "Bett Oakes will teach you to make bronze: charcoal from Southwood oak, a soapstone mould from the old quarry, copper and tin in the crucible, and a bronze pick at the end of it.",
    giver: { entity_id: "npc_bett_oakes" },
    objectives: [
      {
        id: "talk_bett",
        type: "talk",
        description: "Speak with Bett Oakes at the forge",
        entity_id: "npc_bett_oakes",
        dialog_steps: [
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Bronze wants three things this valley doesn't sell: charcoal, a mould and patience. Charcoal's oak, burnt slow in my clamp. Moulds are soapstone, and there's a quarry up the hill where someone cut a great deal of it once.",
          },
          { entity_id: null, dialog: "Someone?" },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Pour first, questions after. Cut me two blocks of soapstone and carve them with that knife of yours. Bring an oak log or two from the wood for the clamp and the haft.",
          },
        ],
        progress: null,
      },
      {
        id: "cut_soapstone",
        type: "gather",
        description: "Cut soapstone at a quarry face on the Scarp",
        resource_id: "resource_soapstone",
        amount: 2,
        progress: null,
      },
      {
        id: "carve_mould",
        type: "craft",
        description: "Carve a soapstone mould at the forge",
        resource_id: "resource_crafting_item_soapstone_mould",
        amount: 1,
        progress: null,
      },
      {
        id: "burn_charcoal",
        type: "craft",
        description: "Burn an oak log to charcoal in the forge's clamp",
        resource_id: "resource_crafting_item_charcoal",
        amount: 1,
        progress: null,
      },
      {
        id: "smelt_bronze",
        type: "craft",
        description: "Smelt copper and tin into bronze at the forge",
        resource_id: "resource_crafting_item_bronze_ingot",
        amount: 1,
        progress: null,
      },
      {
        id: "cast_pick",
        type: "craft",
        description: "Cast a bronze pick at the forge",
        resource_id: "resource_crafting_item_bronze_pick",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_bett_oakes",
      message:
        "There. Your first pour, and it'll cut rock your bone pick bounces off. The same mould takes an axe for the cliff yews, and yew makes a hilt that won't split, if you want a sword. The rich ore's in the lower galleries, where it's dark. There's something else down there I want your eyes on.",
      return_message: "Keep the mould dry and the charcoal drier.",
    },
    rewards: [
      { type: "gold", amount: 30 },
      { type: "item", item_id: "item_bronze_ingot", amount: 2 },
    ],
    prerequisites: ["quest_smoke_on_the_scarp"],
  },
  {
    id: "quest_the_lined_gallery",
    kind: "story",
    type: "investigation",
    name: "The Lined Gallery",
    description:
      "Bett Oakes is sure the old mine wasn't dug by prospectors. She wants you to take a light down into the dark galleries, past the lines cut over every doorway, and bring her a piece of the grey-green stone at the bottom.",
    giver: { entity_id: "npc_bett_oakes" },
    objectives: [
      {
        id: "talk_bett",
        type: "talk",
        description: "Speak with Bett Oakes at the forge",
        entity_id: "npc_bett_oakes",
        dialog_steps: [
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Prospectors don't square their adits, and they don't carve lines over the doors. Every level of this mine has them, the same lines, all the way down.",
          },
          {
            entity_id: null,
            dialog:
              "Ansel Morrow has a stone at the camp's edge cut like that.",
          },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Then Ansel Morrow knows more than he says, which I'd guessed. Past the rich seams, at the very bottom, there's grey-green stone that nobody mined for ore. They cut it out in blocks. Take a light and your bronze pick and bring me a piece. Mind the bats. They go for the flame.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_gallery",
        type: "explore",
        description: "Go down into the old mine gallery behind the forge",
        landmark: "landmark_upper_gallery",
        chance: 1,
        found_message:
          "Past the forge the adit runs square into the hill and the daylight gives out. Your light shows rotten props, old ladders, and green seams in the walls. Over every doorway are the same careful lines as Ansel's slab. Something with leathery wings drops off the ceiling.",
        progress: null,
      },
      {
        id: "kill_bats",
        type: "kill",
        description: "Drive off the cave bats in the dark galleries",
        monster_id: "monster_cave_bat",
        count: 2,
        progress: null,
      },
      {
        id: "mine_seam",
        type: "gather",
        description: "Mine a rich copper seam by the light you carry",
        resource_id: "resource_copper_seam",
        amount: 2,
        progress: null,
      },
      {
        id: "explore_lined_gallery",
        type: "explore",
        description: "Find the grey-green stone at the bottom of the mine",
        landmark: "landmark_lined_gallery",
        chance: 1,
        found_message:
          "The deepest gallery ends at a wall of grey-green stone cut back in blocks, the cuts as sharp as if they were made last year. Each gap is numbered in the Wardens' careful hand, one to twelve. Beside the twelfth someone has cut: THE RING IS RAISED. SEAL THE LEVEL. Nobody did. Below the seam, a rust-red vein runs down into the rock and turns the point of your pick.",
        progress: null,
      },
      {
        id: "cut_wardstone",
        type: "gather",
        description: "Cut a block from the wardstone seam",
        resource_id: "resource_wardstone_seam",
        amount: 1,
        progress: null,
      },
      {
        id: "talk_bett_after",
        type: "talk",
        description: "Tell Bett Oakes what you found",
        entity_id: "npc_bett_oakes",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "The stone's cut out in blocks, numbered one to twelve. Beside the last it says 'The ring is raised. Seal the level.'",
          },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Twelve blocks, and there's twelve strokes on the cairn up top. Wardstones, then. They cut the ring out of my mine and carried it up the valley.",
          },
          { entity_id: null, dialog: "What was the ring for?" },
          {
            entity_id: "npc_bett_oakes",
            dialog: "That's not a smith's question. It's a Warden's.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_bett_oakes",
      message:
        "Keep that piece. Take it to your Warden at the camp's edge, put it in his hand, and watch his face. If it's what I think, he'll know it by the weight. And if he wants more, he'll have to come up here and ask me for it.",
      return_message:
        "Twelve stones out of my mine, and not a word of it in the company's survey.",
    },
    rewards: [
      { type: "gold", amount: 40 },
      { type: "item", item_id: "item_bronze_ingot", amount: 2 },
    ],
    prerequisites: ["quest_first_pour"],
  },
  {
    id: "quest_copper_for_the_company",
    kind: "contract",
    type: "collection",
    name: "Copper for the Company",
    description:
      "The company wants to know what the Scarp's copper is worth before the next boat. It pays for ore mined from the outcrops, and Bett will take it off your hands after.",
    board: "landmark_camp",
    objectives: [
      {
        id: "mine_copper",
        type: "gather",
        description: "Mine copper from outcrops on the Scarp",
        resource_id: "resource_copper_outcrop",
        amount: 4,
        region: "scarp",
        progress: null,
      },
    ],
    completion: {
      message:
        "Maren weighs the ore twice and writes the figure in red. She's already drafting a letter downriver.",
    },
    rewards: [{ type: "gold", amount: 40 }],
    prerequisites: ["quest_smoke_on_the_scarp"],
  },
  {
    id: "quest_crabs_on_the_scree",
    kind: "contract",
    type: "combat",
    name: "Crabs on the Scree",
    description:
      "Rock crabs have been going for the surveyors on the Scarp's scree. Nobody's blade does much to them, so the company pays well for any that are brought down.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_crabs",
        type: "kill",
        description: "Kill rock crabs on the Scarp",
        monster_id: "monster_rock_crab",
        count: 2,
        region: "scarp",
        progress: null,
      },
    ],
    completion: {
      message:
        "Maren pays out and asks how long it took. She writes 'crabs: expensive' in the margin of the survey.",
    },
    rewards: [{ type: "gold", amount: 60 }],
    prerequisites: ["quest_smoke_on_the_scarp"],
  },
  {
    id: "quest_the_old_workings",
    kind: "contract",
    type: "exploration",
    name: "The Old Workings",
    description:
      "The Scarp is riddled with old adits nobody has on a map. The surveyor has marked one on the sketch map and wants to know whether it's safe to walk into.",
    board: "landmark_camp",
    objectives: [
      {
        id: "survey_adit",
        type: "explore",
        description: "Find the marked mine mouth on the Scarp",
        region: "scarp",
        tile: "tile_mine_mouth",
        chance: 1,
        found_message:
          "The marked adit is cut dead square into the hill, with the same lines over its lintel as the forge door. Cold air breathes out of it, and something pale moves in the dark past the daylight.",
        progress: null,
      },
    ],
    completion: {
      message:
        "Maren adds the adit to the survey and marks it 'not safe'. She asks who cut it. You don't know, and you say so.",
    },
    rewards: [{ type: "gold", amount: 20 }],
    prerequisites: ["quest_smoke_on_the_scarp"],
  },
  {
    id: "quest_down_to_the_fen",
    kind: "story",
    type: "exploration",
    name: "Down to the Fen",
    description:
      "The company's jars came up the river in pieces, and Ada Thwaite has nothing to put stores in. Col Reeve, the company's potter, went east to the fen to fire new ones. Ada wants to know where they are.",
    giver: { entity_id: "npc_ada_thwaite" },
    objectives: [
      {
        id: "talk_ada",
        type: "talk",
        description: "Speak with Ada Thwaite at the campfire",
        entity_id: "npc_ada_thwaite",
        dialog_steps: [
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "Every jar the company sent up came off the boat in pieces. I've salt boar and nothing to put it in.",
          },
          { entity_id: null, dialog: "Can't Hobb make you something?" },
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "Hobb makes handles. Col Reeve makes pots. He went east past the Southwood to the fen the first month, found clay, and built himself a kiln. I've had one basket of fish off him and not one jar.",
          },
          {
            entity_id: "npc_ada_thwaite",
            dialog:
              "Go east through the wood until the ground goes soft, and look for peat smoke. And ask him why he's stopped sleeping. His last note said he had.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_kiln",
        type: "explore",
        description:
          "Find Col Reeve's kiln in the Sinks, east of the Southwood",
        landmark: "landmark_kiln",
        chance: 1,
        found_message:
          "A beehive kiln of turf and clay on a rise above the fen, smoke seeping out of it, and a reed-roofed hut beside it. Below the rise the fen runs north as far as you can see, and the cold comes up off it like the breath off a cellar.",
        progress: null,
      },
      {
        id: "talk_col",
        type: "talk",
        description: "Speak with Col Reeve at the kiln",
        entity_id: "npc_col_reeve",
        dialog_steps: [
          {
            entity_id: "npc_col_reeve",
            dialog:
              "Ada sent you? Then she wants jars, and she's right to. I've fired three loads and cracked two. Peat's the only fuel and I've been too tired to cut it.",
          },
          {
            entity_id: null,
            dialog: "She says you've stopped sleeping.",
          },
          {
            entity_id: "npc_col_reeve",
            dialog:
              "The ground moves at night. Up and down, slow. I'd sooner not talk about it. Make yourself a spade, and dig me clay from the bank and peat from the cuttings. Mind the water. Wade in unprepared and your hands'll be no use to you.",
          },
        ],
        progress: null,
      },
      {
        id: "craft_spade",
        type: "craft",
        description: "Make an oak turf spade at the kiln",
        resource_id: "resource_crafting_item_turf_spade",
        amount: 1,
        progress: null,
      },
      {
        id: "dig_clay",
        type: "gather",
        description: "Dig clay from a clay bank in the Sinks",
        resource_id: "resource_clay_bank",
        amount: 2,
        progress: null,
      },
      {
        id: "cut_peat",
        type: "gather",
        description: "Cut peat from the peat cuttings",
        resource_id: "resource_peat_cutting",
        amount: 2,
        progress: null,
      },
      {
        id: "fire_jars",
        type: "craft",
        description: "Fire clay jars in the kiln",
        resource_id: "resource_crafting_item_clay_jar",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_col_reeve",
      message:
        "Two whole jars. Ada can have those and the next load too, now I've peat stacked. Here, drink these before you go back in the water. It's the only thing out here that warms you. You'll want waders, if you mean to keep coming.",
      return_message:
        "Clay from the bank, peat from the cuttings, and the kiln hot. That's a potter's whole life.",
    },
    rewards: [
      { type: "gold", amount: 25 },
      { type: "item", item_id: "item_fen_broth", amount: 2 },
    ],
    prerequisites: ["quest_a_light_in_the_cellar"],
  },
  {
    id: "quest_cold_water",
    kind: "story",
    type: "crafting",
    name: "Cold Water",
    description:
      "Col Reeve says nobody works the Sinks for long without waders. He'll show you how to tan leather in the peat pits and patch it with mossback skin, if you bring him the skins.",
    giver: { entity_id: "npc_col_reeve" },
    objectives: [
      {
        id: "talk_col",
        type: "talk",
        description: "Speak with Col Reeve at the kiln",
        entity_id: "npc_col_reeve",
        dialog_steps: [
          {
            entity_id: "npc_col_reeve",
            dialog:
              "Look at your hands. That's the fen. Water that cold makes every job take twice as long, and it's only spring.",
          },
          { entity_id: null, dialog: "What do you do about it?" },
          {
            entity_id: "npc_col_reeve",
            dialog:
              "Waders. Wolf hide steeped in the peat pits by the kiln until it's dark and tight, patched with mossback skin, which sheds water like a duck. The toads sit out in the fen and spit at you. Bring me two skins, and bring your own hides. Jory'll tell you where to get those.",
          },
        ],
        progress: null,
      },
      {
        id: "kill_toads",
        type: "kill",
        description: "Kill mossback toads in the fen",
        monster_id: "monster_mossback_toad",
        count: 2,
        progress: null,
      },
      {
        id: "tan_leather",
        type: "craft",
        description: "Tan wolf hide in the peat pits at the tanning rack",
        resource_id: "resource_crafting_item_fen_leather",
        amount: 2,
        progress: null,
      },
      {
        id: "make_waders",
        type: "craft",
        description: "Make mossback waders at the tanning rack",
        resource_id: "resource_crafting_item_mossback_waders",
        amount: 1,
        progress: null,
      },
      {
        id: "cut_reeds",
        type: "gather",
        description: "Wear your waders and cut reeds in a reedbed",
        resource_id: "resource_reeds",
        amount: 2,
        progress: null,
      },
      {
        id: "talk_col_after",
        type: "talk",
        description: "Tell Col Reeve how the waders held up",
        entity_id: "npc_col_reeve",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "Still cold. But I can feel my fingers.",
          },
          {
            entity_id: "npc_col_reeve",
            dialog:
              "That's all waders are for. Nothing keeps that water out entirely.",
          },
          {
            entity_id: null,
            dialog: "You said the ground moves at night.",
          },
          {
            entity_id: "npc_col_reeve",
            dialog:
              "Like it's breathing. And the herons. There's a carr up north where they nest, and they've stopped nesting. They just stand there.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_col_reeve",
      message:
        "Keep those greased with tar and they'll see you through the summer. Take a couple of pots of pike, for the walk. Come back when you've a day to spare. There's something up at the carr I want another pair of eyes on.",
      return_message:
        "Peat water tans a hide better than any bark. Folk downriver used to find whole men in the bogs, kept like leather. Don't think about that.",
    },
    rewards: [
      { type: "gold", amount: 30 },
      { type: "item", item_id: "item_potted_pike", amount: 2 },
    ],
    prerequisites: ["quest_down_to_the_fen"],
  },
  {
    id: "quest_the_fen_breathes",
    kind: "story",
    type: "combat",
    name: "The Fen Breathes",
    description:
      "Col Reeve wants to see into the dark of the carr where the herons have stopped nesting. First he needs glass, and then he needs someone to go and look.",
    giver: { entity_id: "npc_col_reeve" },
    objectives: [
      {
        id: "talk_col",
        type: "talk",
        description: "Speak with Col Reeve at the kiln",
        entity_id: "npc_col_reeve",
        dialog_steps: [
          {
            entity_id: "npc_col_reeve",
            dialog:
              "I've been trying to watch the carr at night, but the peat smoke fogs a horn lantern till you can't see your hand. Glass would do it.",
          },
          { entity_id: null, dialog: "Can you make glass out here?" },
          {
            entity_id: "npc_col_reeve",
            dialog:
              "Sand off the lake shore, reed ash to flux it, peat as hot as the kiln goes. I've done it once. Bring me sand and we'll try again.",
          },
        ],
        progress: null,
      },
      {
        id: "gather_sand",
        type: "gather",
        description: "Collect sand from the lake shore",
        resource_id: "resource_lake_sand",
        amount: 3,
        progress: null,
      },
      {
        id: "melt_glass",
        type: "craft",
        description: "Melt glass in the kiln",
        resource_id: "resource_crafting_item_glass",
        amount: 1,
        progress: null,
      },
      {
        id: "explore_carr",
        type: "explore",
        description: "Go north to Heron Carr and see what the herons are doing",
        landmark: "landmark_heron_carr",
        chance: 1,
        found_message:
          "A drowned wood of alder and willow, the nests in it empty. One grey heron stands among the roots, and it's wrong: white growths are laid along its neck and wings in rows, like the hind at the Far Stile, and threads from its feet run down into the water. It turns its head in jerks and looks at you without blinking.",
        progress: null,
      },
      {
        id: "kill_heron",
        type: "kill",
        description: "Kill the colonised heron",
        monster_id: "monster_colonised_heron",
        count: 1,
        progress: null,
      },
      {
        id: "talk_col_after",
        type: "talk",
        description: "Tell Col Reeve what you found in the carr",
        entity_id: "npc_col_reeve",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "The heron was grown over. White, in rows, with threads going down into the water. I cut a piece off it.",
          },
          {
            entity_id: "npc_col_reeve",
            dialog:
              "Don't bring it near the kiln. Put it somewhere I can't see it.",
          },
          {
            entity_id: null,
            dialog: "Threads into the water. Into the ground under it.",
          },
          {
            entity_id: "npc_col_reeve",
            dialog: "Then the fen isn't breathing. Something under it is.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_col_reeve",
      message:
        "Take that thing up to the old man at camp's edge. He looked at the fen from the lane the day we landed like a man looking at a grave, and I want to know what he saw. Here's a string off the rack. You'll want a bow that can reach the water.",
      return_message: "I sleep with the lantern lit now. Much good it does.",
    },
    rewards: [
      { type: "gold", amount: 40 },
      { type: "item", item_id: "item_gut_string", amount: 1 },
    ],
    prerequisites: ["quest_cold_water"],
  },
  {
    id: "quest_the_weight_of_a_wardstone",
    kind: "story",
    type: "investigation",
    name: "The Weight of a Wardstone",
    description:
      "You have a block of grey-green stone from the bottom of Bett Oakes' mine and a piece of pale growth cut from a heron in the Sinks. Both of them say Ansel Morrow knows what's going on. Put them in front of him.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Show Ansel Morrow the wardstone and the heron's growth",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "Bett Oakes sent this from the bottom of her mine. Twelve blocks cut out, and 'the ring is raised'. And this came off a heron in the Sinks.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Put the growth down. On the grass, not the stone. ... That's wardstone, yes. I'd know the weight of it anywhere.",
          },
          {
            entity_id: null,
            dialog:
              "You said one day you'd have to tell me. The heron was outside anything. It was in the fen.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Then I'll tell you what I can. There are twelve stones in a ring across the middle of the valley, cut from Bett's seam and cut again with lines, and the lines draw on the rock under us. Together they're a ward. It holds in the thing that grew that. It's one thing, under the whole of the upper valley, the way a mushroom is only the fruit of what's in the ground.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "The ring stops it going further. It isn't doing that any more. There's an old causeway across the Sinks with a boundary stone at the end, like the one in the sunken farm. Go and read it for me.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_causeway",
        type: "explore",
        description: "Read the boundary stone on the Old Causeway in the Sinks",
        landmark: "landmark_old_causeway",
        chance: 1,
        found_message:
          "The causeway runs north across the fen on fitted stones, and at its far end a boundary stone stands up out of the moss. Its lines are cut the same as Ansel's slab. On the fen side they're cracked through, and white threads have come up through the cracks and laid themselves along the grooves, as if they were following them.",
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow what you saw at the causeway",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "The lines are cracked. And the threads are growing along them.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog: "Along them. It's learning them.",
          },
          {
            entity_id: null,
            dialog:
              "Who's inside the ring, Ansel? The list in the cellar said everyone south of the stones was taken down. Who was north?",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Nobody you could help. Not now. What you can do is learn to hold a line, before there's nobody left who can. Take this. It was mine when I was sworn.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "That's a Warden's stylus. With it you can cut a line at my table that holds. It's been a long time since anyone but me touched that slab. Come back when you're ready to use it, and bring the growth. You'll need it.",
      return_message:
        "Twelve stones, and every one of them cracking. I thought we'd have longer.",
    },
    rewards: [
      { type: "gold", amount: 30 },
      { type: "item", item_id: "item_wardens_stylus", amount: 1 },
    ],
    prerequisites: ["quest_the_lined_gallery", "quest_the_fen_breathes"],
  },
  {
    id: "quest_the_warding_staff",
    kind: "story",
    type: "crafting",
    name: "The Warding Staff",
    description:
      "Ansel Morrow will teach you to cut a warding line. The first thing every Warden made was a staff, and the first thing every staff was set against was a piece of what it was meant to hold.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "A ward holds a thing by knowing its shape. So you start with the thing. Lay that growth on the wardstone, and cut your lines around it with the stylus until they close.",
          },
          { entity_id: null, dialog: "And then?" },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Then the stone knows it. Bind the shard to a yew staff with a bronze shoe and a gut string, so the line runs from the ground through you and into whatever you strike. It won't cut anything. It holds and presses, and things that shrug off a blade can't shrug off that.",
          },
        ],
        progress: null,
      },
      {
        id: "inscribe_shard",
        type: "craft",
        description: "Inscribe a wardstone shard at the warding table",
        resource_id: "resource_crafting_item_inscribed_shard",
        amount: 1,
        progress: null,
      },
      {
        id: "bind_staff",
        type: "craft",
        description: "Bind the warding staff at the warding table",
        resource_id: "resource_crafting_item_warding_staff",
        amount: 1,
        progress: null,
      },
      {
        id: "kill_crab",
        type: "kill",
        description: "Try the staff on a rock crab on the Scarp",
        monster_id: "monster_rock_crab",
        count: 1,
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow how the staff worked",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "The crab's shell didn't help it at all.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "No. Stone doesn't stop stone. That's all warding is, underneath: holding things where they are.",
          },
          {
            entity_id: null,
            dialog: "Holding what where, Ansel? The ring. Who did you hold?",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Not today. Look after that staff. When the stones need mending, and they will, it'll be you or nobody.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "My master made his first staff at a table like this, from that same seam, the spring before the ring went up. He was proud of it. So was I, of mine. Use it well, and don't be proud of it.",
      return_message: "Keep your lines closed and your staff by you.",
    },
    rewards: [{ type: "gold", amount: 50 }],
    prerequisites: ["quest_the_weight_of_a_wardstone"],
  },
  {
    id: "quest_pike_in_the_mere",
    kind: "contract",
    type: "defence",
    name: "Pike in the Mere",
    description:
      "Col Reeve's traps keep coming up empty and torn, and the company wants fish off the books. Thin out the pike in the Sinks.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_pike",
        type: "kill",
        description: "Kill pike in the Sinks",
        monster_id: "monster_pike",
        count: 2,
        region: "sinks",
        progress: null,
      },
    ],
    completion: {
      message:
        "Two pike, and a good pair of fish-gut bowstrings' worth. Maren pays and says nothing about the smell.",
    },
    rewards: [{ type: "gold", amount: 50 }],
    prerequisites: ["quest_down_to_the_fen"],
  },
  {
    id: "quest_peat_for_the_winter",
    kind: "contract",
    type: "collection",
    name: "Peat for the Winter",
    description:
      "The company means to winter in the valley, and oak won't last a winter. Cut peat in the Sinks and stack it to dry.",
    board: "landmark_camp",
    objectives: [
      {
        id: "cut_peat",
        type: "gather",
        description: "Cut peat in the Sinks",
        resource_id: "resource_peat_cutting",
        amount: 4,
        region: "sinks",
        progress: null,
      },
    ],
    completion: {
      message:
        "Four good bricks. Maren writes 'fuel, local' in the ledger and pays you by the brick.",
    },
    rewards: [{ type: "gold", amount: 35 }],
    prerequisites: ["quest_down_to_the_fen"],
  },
  {
    id: "quest_toads_in_the_fen",
    kind: "contract",
    type: "defence",
    name: "Toads in the Fen",
    description:
      "Mossback toads have been spitting at anyone who goes out to Col Reeve's cuttings. Clear a few from the Sinks.",
    board: "landmark_camp",
    objectives: [
      {
        id: "kill_toads",
        type: "kill",
        description: "Kill mossback toads in the Sinks",
        monster_id: "monster_mossback_toad",
        count: 3,
        region: "sinks",
        progress: null,
      },
    ],
    completion: {
      message:
        "Three toads. Col says he can hear himself think again. Signed and paid.",
    },
    rewards: [{ type: "gold", amount: 45 }],
    prerequisites: ["quest_down_to_the_fen"],
  },
  {
    id: "quest_smoke_over_the_wall",
    kind: "story",
    type: "exploration",
    name: "Smoke over the Wall",
    description:
      "On clear evenings there's smoke to the north, past the Far Stile, where the company's survey shows nothing but empty fields. Ansel Morrow has been watching it. Somebody up there keeps a fire.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at camp's edge",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "There's smoke up the valley in the evenings, past the stile and over the tree line. Do you see it? Tell me you see it.",
          },
          {
            entity_id: null,
            dialog: "I see it. Chimney smoke, and a lot of it.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "A lot of it. ... Go and look. Past the stile the air has spores in it, so wear that moss wrap of Col's and don't stay out longer than you must. The ground up there takes it out of you.",
          },
          {
            entity_id: null,
            dialog: "Who'd be living up there, Ansel?",
          },
          { entity_id: "npc_ansel_morrow", dialog: "Go and look." },
        ],
        progress: null,
      },
      {
        id: "explore_holdfast",
        type: "explore",
        description: "Follow the smoke north into the Wardline",
        landmark: "landmark_holdfast",
        chance: 1,
        found_message:
          "Past the Far Stile the fields are walled and wild, and the air tastes of mushroom. Over a rise stands a walled hamlet with a dozen chimneys smoking and pans of something bitter smouldering along the wall-top. The gate is shut. A face looks down at you from the wall, and then several more.",
        progress: null,
      },
      {
        id: "talk_wick",
        type: "talk",
        description: "Speak to the old man on the holdfast wall",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: "npc_old_wick",
            dialog:
              "That's far enough. You're from the fire at the valley mouth. We've watched it since the thaw.",
          },
          {
            entity_id: null,
            dialog:
              "We're settlers, with the charter company. We thought the valley was empty.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "Empty. Hear that, Tam? We're empty. ... And what's that on your back? I know a warder's staff. My grandmother drew me one in the hearth ash when I was small, so I'd know one if they ever came back.",
          },
          {
            entity_id: null,
            dialog: "A man at our camp taught me to make it. Ansel Morrow.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "A Warden. At your fire. Then go back and tell your Warden the Wickens are still here, and watch what his face does. The gate stays shut.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "Still here? Tam's throwing you something over the wall because she's soft. Take it and go. If you want this gate open you'll earn it, and not with a warder's stick.",
      return_message: "The gate's shut. It's been shut a long time.",
    },
    rewards: [
      { type: "gold", amount: 20 },
      { type: "item", item_id: "item_spore_tincture", amount: 2 },
    ],
    prerequisites: ["quest_the_warding_staff"],
  },
  {
    id: "quest_the_lane_at_night",
    kind: "story",
    type: "defence",
    name: "The Lane at Night",
    description:
      "Old Wick won't open the holdfast's gate to a stranger with a warder's staff. Hounds have been at the holdfast's ewes, and a wanderer has come down from the stones to stand at the gate. Deal with both and he might.",
    giver: { entity_id: "npc_old_wick" },
    objectives: [
      {
        id: "talk_wick",
        type: "talk",
        description: "Speak with Old Wick at the holdfast gate",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: "npc_old_wick",
            dialog:
              "You want in. Everyone wants in, once they've breathed out there a while. Here's the price. There's a pack of hounds running the lanes, bred down from our own farm dogs, and they've had three ewes this month.",
          },
          { entity_id: null, dialog: "And?" },
          {
            entity_id: "npc_old_wick",
            dialog:
              "And there's a walker come down from the stones. It's stood at the gate two nights, looking in. We don't go out to them. It isn't their fault, what they are. But it can't stand there.",
          },
          { entity_id: null, dialog: "What is it?" },
          {
            entity_id: "npc_old_wick",
            dialog:
              "Somebody's grandmother. Somebody's anything. Be quick about it, and don't make a show of it.",
          },
        ],
        progress: null,
      },
      {
        id: "kill_hounds",
        type: "kill",
        description: "Kill a feral hound pack in the Wardline",
        monster_id: "monster_feral_hounds",
        count: 1,
        progress: null,
      },
      {
        id: "kill_wanderer",
        type: "kill",
        description: "Put a host wanderer to rest",
        monster_id: "monster_host_wanderer",
        count: 1,
        progress: null,
      },
      {
        id: "talk_wick_after",
        type: "talk",
        description: "Tell Old Wick it's done",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "It's done. The hounds, and the wanderer.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "I watched from the wall. You were quick. ... It had clogs on. Our clogs, the kind we still make. It went into the grass before any of us were born, and the ground has kept it as it was.",
          },
          { entity_id: null, dialog: "Who was it?" },
          {
            entity_id: "npc_old_wick",
            dialog:
              "There's no knowing, and it doesn't do to guess. Come in, then. Wipe your feet. Tam's been at me since you came.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "The gate's open to you. Not to your company and not to your Warden: to you. There's a board by the gate where Nell posts what needs doing. Do some of it.",
      return_message: "Mind the gate behind you.",
    },
    rewards: [
      { type: "gold", amount: 40 },
      { type: "item", item_id: "item_comfrey_salve", amount: 2 },
    ],
    prerequisites: ["quest_smoke_over_the_wall"],
  },
  {
    id: "quest_the_unsealed_level",
    kind: "story",
    type: "crafting",
    name: "The Unsealed Level",
    description:
      "There's a rust-red vein under the wardstone in the Lined Gallery, and Bett Oakes has wanted it since the day she found it. The Wardens walled up the level below. Bett wants it opened, and she wants to try her hand at iron.",
    giver: { entity_id: "npc_bett_oakes" },
    objectives: [
      {
        id: "talk_bett",
        type: "talk",
        description: "Speak with Bett Oakes at the mine forge",
        entity_id: "npc_bett_oakes",
        dialog_steps: [
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "You've seen the red under the wardstone. Iron. The Wardens cut their twelve stones and walled up the level below, and nobody's been down since. Bronze will just about scratch it.",
          },
          { entity_id: null, dialog: "Why wall it up?" },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Ask your Warden. My guess is they didn't want anyone digging where they'd been. Take a light and a bronze pick past the lined gallery and bring me ore. And burn a deal of oak: iron wants twice the charcoal bronze does, and then some.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_level",
        type: "explore",
        description: "Go down past the Lined Gallery to the unsealed level",
        landmark: "landmark_unsealed_level",
        chance: 1,
        found_message:
          "Past the wardstone seam the gallery is walled up with dry stone, and a warding line is cut across the wall like a bar across a door. The mortar has crumbled away. Beyond it the level runs on into the hill, its walls streaked rust-red, and something has been living in the dark.",
        progress: null,
      },
      {
        id: "mine_iron",
        type: "gather",
        description: "Mine iron ore from the seam in the unsealed level",
        resource_id: "resource_iron_seam",
        amount: 4,
        progress: null,
      },
      {
        id: "smelt_iron",
        type: "craft",
        description: "Smelt two iron ingots at the forge",
        resource_id: "resource_crafting_item_iron_ingot",
        amount: 2,
        progress: null,
      },
      {
        id: "forge_pick",
        type: "craft",
        description: "Forge an iron pick",
        resource_id: "resource_crafting_item_iron_pick",
        amount: 1,
        progress: null,
      },
      {
        id: "talk_bett_after",
        type: "talk",
        description: "Show Bett Oakes the iron pick",
        entity_id: "npc_bett_oakes",
        dialog_steps: [
          { entity_id: null, dialog: "Iron. It took an age to smelt." },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Twice the charcoal and three times the swearing. But look at it. That pick will open anything the Wardens bolted shut, and there's a lot up the valley they bolted shut.",
          },
          { entity_id: null, dialog: "How do you know that?" },
          {
            entity_id: "npc_bett_oakes",
            dialog:
              "Because they bolted my mine shut, and they cut their lines on everything. Go and see what else they locked.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_bett_oakes",
      message:
        "Swords, mail, a crossbow if you can find me the gut. Bring me ore and I'll show you the lot. Iron's slower than bronze in every way but one: it lasts.",
      return_message: "Iron wants patience and charcoal. Mostly charcoal.",
    },
    rewards: [
      { type: "gold", amount: 40 },
      { type: "item", item_id: "item_iron_ingot", amount: 2 },
    ],
    prerequisites: ["quest_the_warding_staff"],
  },
  {
    id: "quest_your_people_did_this",
    kind: "story",
    type: "investigation",
    name: "Your People Did This",
    description:
      "Old Wick has a grievance a hundred and twenty years old, and now he has someone from outside to put it to. The Wardens kept houses along the ring and left their steel in them. He wants the steel, and he wants you to read what else they left.",
    giver: { entity_id: "npc_old_wick" },
    objectives: [
      {
        id: "talk_wick",
        type: "talk",
        description: "Speak with Old Wick at the holdfast",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: "npc_old_wick",
            dialog:
              "Sit. You've been in and out of my gate a week and never once asked why there's a wall round us.",
          },
          { entity_id: null, dialog: "Why is there?" },
          {
            entity_id: "npc_old_wick",
            dialog:
              "Because your people did this to us. Not your company. The ones who came before, with staffs like yours. My grandmother was nine. The Wardens came up through the fields in spring and took the southern families down the valley, cart after cart. They told the rest to stay put, they'd be back within the week. Then the stones lit, and the road south shut like a door.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "They kept a house by every stone. Square, lines over the doors, barred from outside. There's steel in them, and it's ours by any reckoning. You've an iron pick now. Break a couple open and bring me what's in them, and read me what's on the wall of the one by the Fifth Stone. I can't read Warden hand.",
          },
        ],
        progress: null,
      },
      {
        id: "salvage_steel",
        type: "gather",
        description: "Prise Warden steel out of a Warden's house",
        resource_id: "resource_warden_salvage",
        amount: 2,
        progress: null,
      },
      {
        id: "explore_fifth",
        type: "explore",
        description: "Read the wall of the Warden's house by the Fifth Stone",
        landmark: "landmark_fifth_stone",
        chance: 1,
        found_message:
          "The house by the Fifth Stone is barred from outside like the others. Inside, a roll is pinned to the wall under a cracked slate: the families of the upper fields, farm by farm. Most are struck through and marked TAKEN DOWN. The last column has no mark at all: Wicken, Reed, Dunning, Hale, Thackery and thirty more. At the foot, in a different hand: Sister E. asks again that these be told. Refused.",
        progress: null,
      },
      {
        id: "talk_wick_after",
        type: "talk",
        description: "Tell Old Wick what the roll says",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "It's a roll of the upper families. Most are marked 'taken down'. The last column isn't marked at all, and Wicken is the first name on it.",
          },
          {
            entity_id: "npc_old_wick",
            dialog: "Wicken. That was us, before the name wore down.",
          },
          {
            entity_id: null,
            dialog:
              "At the bottom someone wrote: 'Sister E. asks again that these be told. Refused.'",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "Asks again. So one of them knew it was wrong, and they did it anyway. ... Your Warden at the valley mouth. Does he know his letters?",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "Keep the steel, you've earned it, and your smith can do something with it. But one day I'll have that roll said out loud, by a Warden, in front of this gate. You tell him that.",
      return_message: "Wicken. Written down all this time, and nobody came.",
    },
    rewards: [
      { type: "gold", amount: 50 },
      { type: "item", item_id: "item_spore_tincture", amount: 3 },
    ],
    prerequisites: ["quest_the_lane_at_night", "quest_the_unsealed_level"],
  },
  {
    id: "quest_masks_and_tinctures",
    kind: "story",
    type: "crafting",
    name: "Masks and Tinctures",
    description:
      "Tam Reedsdaughter, the holdfast's healer, took one look at your moss spore-wrap and laughed. She'll show you how the holdfast makes its masks, if you'll tell her about downriver while you work.",
    giver: { entity_id: "npc_tam_reedsdaughter" },
    objectives: [
      {
        id: "talk_tam",
        type: "talk",
        description: "Speak with Tam Reedsdaughter at the loom and apothecary",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Moss? Who told you to breathe through moss? ... Sorry. It's not bad, for someone who's never been shown. Sit down. How many people live at your fire?",
          },
          {
            entity_id: null,
            dialog: "Forty or so. More coming up the river every month.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Forty. And downriver, is it true there are towns with a thousand people and nobody knows everybody? ... Never mind. Masks. Wool first: the sheep went wild when the wall went up, and they leave half their fleece on the lane hedges. Then wax. The old steadings have bees in the walls. Smoke them with a torch or they'll have you.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Full the wool into felt at my loom, pack it with mugwort off the hedges and wax it stiff. It won't stop everything. Nothing does. But you'll breathe.",
          },
        ],
        progress: null,
      },
      {
        id: "gather_wool",
        type: "gather",
        description: "Pick snagged wool off the lane hedges",
        resource_id: "resource_snagged_wool",
        amount: 3,
        progress: null,
      },
      {
        id: "smoke_hive",
        type: "gather",
        description: "Smoke a wild hive in an abandoned steading for wax",
        resource_id: "resource_wild_hive",
        amount: 2,
        progress: null,
      },
      {
        id: "gather_mugwort",
        type: "gather",
        description: "Pick mugwort from the hedgerows",
        resource_id: "resource_mugwort",
        amount: 2,
        progress: null,
      },
      {
        id: "full_felt",
        type: "craft",
        description: "Full the wool into felt at the loom",
        resource_id: "resource_crafting_item_wool_felt",
        amount: 2,
        progress: null,
      },
      {
        id: "make_mask",
        type: "craft",
        description: "Make a waxed mask",
        resource_id: "resource_crafting_item_waxed_mask",
        amount: 1,
        progress: null,
      },
      {
        id: "talk_tam_after",
        type: "talk",
        description: "Show Tam Reedsdaughter your mask",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "It's stiff. And it smells of mugwort.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "The mugwort's how you know it's working. Wear it past the wall and the air won't sit on your chest half so hard.",
          },
          { entity_id: null, dialog: "Better than moss, then." },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Better than moss. Now. Is it true the rivers downriver have bridges you can take a cart across? Stone ones?",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_tam_reedsdaughter",
      message:
        "Come back when you need another. Masks don't last out there, and neither do people who don't wear them. And bring me news from downriver. Anything. What they eat.",
      return_message:
        "Mind the wax near a fire, and keep it on your face, not round your neck.",
    },
    rewards: [
      { type: "gold", amount: 30 },
      { type: "item", item_id: "item_honey", amount: 3 },
    ],
    prerequisites: ["quest_the_lane_at_night"],
  },
  {
    id: "quest_what_the_ground_keeps",
    kind: "story",
    type: "investigation",
    name: "What the Ground Keeps",
    description:
      "Tam brews the tinctures that let the holdfast work its fields, and she wants to know why they work. For that she needs something off a host. She'd go herself, if Wick would let her over the wall.",
    giver: { entity_id: "npc_tam_reedsdaughter" },
    objectives: [
      {
        id: "talk_tam",
        type: "talk",
        description: "Speak with Tam Reedsdaughter in her stillroom",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "You've drunk my tinctures. Do you know why they work? Neither do I. Mugwort and honey, the way Gran made them, and her gran. I want to know what the spores do inside you, so I can do better than 'the way Gran made them'.",
          },
          { entity_id: null, dialog: "How?" },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "The walkers. What grows on them is what's in the air, only more of it. Bring me a hank of their threads. Wick says I'm not to ask. So I'm asking you. Steep yourself a couple of tinctures at the still first. You'll be out there a while.",
          },
        ],
        progress: null,
      },
      {
        id: "steep_tincture",
        type: "craft",
        description: "Steep spore tinctures at the apothecary",
        resource_id: "resource_crafting_item_spore_tincture",
        amount: 1,
        progress: null,
      },
      {
        id: "kill_host",
        type: "kill",
        description: "Bring down a host wanderer and take its threads",
        monster_id: "monster_host_wanderer",
        count: 1,
        progress: null,
      },
      {
        id: "talk_tam_after",
        type: "talk",
        description: "Show Tam Reedsdaughter the grey threads",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "Here. Grey threads, off a host out by the ring.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "They're warm. ... They're still warm. Gran's brother went into the wood laughing, the spring after the stones were lit. She used to say he'd have children in there by now, and laugh, and then she'd cry.",
          },
          { entity_id: null, dialog: "Your gran's brother?" },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Davy Reed. I sing her song about him over the still, and the old ones get up and leave. ... Never mind. Keep the threads, I've taken what I need. Your Warden will want some. They always want a piece of the thing.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_tam_reedsdaughter",
      message:
        "I'll have these under a glass for a month. If I learn anything, you'll hear it before Wick does. Take some salve for your trouble: comfrey and wax, it'll close up whatever the hounds leave you.",
      return_message: "Still warm, they were. I can't stop thinking about it.",
    },
    rewards: [
      { type: "gold", amount: 40 },
      { type: "item", item_id: "item_comfrey_salve", amount: 3 },
    ],
    prerequisites: ["quest_masks_and_tinctures"],
  },
  {
    id: "quest_the_seventh_stone",
    kind: "story",
    type: "investigation",
    name: "The Seventh Stone",
    description:
      "You told Ansel Morrow about the holdfast and the Wickens. He went grey, and sent you back up the valley to the stone that Sister Edith kept.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Tell Ansel Morrow about the holdfast",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "There are people up there, a walled hamlet past the stile. An old man called Wick said to tell you the Wickens are still here.",
          },
          { entity_id: "npc_ansel_morrow", dialog: "... Wicken." },
          { entity_id: null, dialog: "You know the name." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "I know the lists. ... No. Not yet. Go to the Seventh Stone, north of the stile where the ring runs. Sister Edith kept it. She stayed when the others came down. If she wrote anything, it's there. Read it, and then come and ask me whatever you like.",
          },
        ],
        progress: null,
      },
      {
        id: "explore_seventh",
        type: "explore",
        description: "Find Sister Edith's hut at the Seventh Stone",
        landmark: "landmark_seventh_stone",
        chance: 1,
        found_message:
          "Behind the cracked stone is a keeper's hut with the roof still on. Under the hearthstone, in a lead box, is a book in a small, square hand. 'The Keepers say the upper farms have been warned. They have not. I went to the Reeds and the Wickens myself.' Weeks later: 'The stones are lit. The Reeds' girl came to the line at dusk and called my name. I did not answer her.' The last pages are only dates, each with a line drawn under it, as if she kept a watch.",
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow what Sister Edith wrote",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "Edith wrote that the Keepers said the upper farms had been warned, and they hadn't. She went to the Reeds and the Wickens herself. Then the stones were lit, and a girl came to the line and called her name.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Edith. She begged my master, the night before the lighting. He told me so himself the winter he died, like a man putting down something heavy.",
          },
          {
            entity_id: null,
            dialog: "So people were left north of the stones. On purpose.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "The growth was already in the upper fields. The Keepers said that if those families were moved they'd carry it downriver in their clothes and their seed corn, so they were left. And they weren't told, because people who are told run. That's the order's wisdom, and it's been rotting in me since I was sworn.",
          },
          {
            entity_id: null,
            dialog: "Wick wants a Warden to say that to his face.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "He's entitled. ... Not yet. There's more to it than my master's part, and I haven't the stomach for the rest of it today.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Edith's book belongs to the holdfast more than to us. Leave it where it lies a while. I want to be the one who carries it to them, when I can carry it.",
      return_message: "She stayed. We all should have.",
    },
    rewards: [{ type: "gold", amount: 40 }],
    prerequisites: ["quest_smoke_over_the_wall"],
  },
  {
    id: "quest_the_wardstone_focus",
    kind: "story",
    type: "crafting",
    name: "The Wardstone Focus",
    description:
      "The Seventh Stone is cracked and the threads are following the crack. Ansel can't walk that far any more, but he can teach you to cut a focus that holds harder than a staff, and send you to hold the line in his place.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Edith's stone is cracked up one face, you said, with threads in the crack. If the Seventh goes, the Sixth and the Eighth go after it.",
          },
          { entity_id: null, dialog: "Can it be mended?" },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Not by me, and not yet. But it can be held. A staff will hold a crab. For a stone you want a focus: wardstone cut closed around a piece of the thing and set in Warden steel. Two hanks of threads off a host, and steel from one of our houses on the line. The Wickens will tell you it's theirs. They're right, so ask.",
          },
        ],
        progress: null,
      },
      {
        id: "kill_hosts",
        type: "kill",
        description: "Bring down two host wanderers for their threads",
        monster_id: "monster_host_wanderer",
        count: 2,
        progress: null,
      },
      {
        id: "cut_focus",
        type: "craft",
        description: "Cut a wardstone focus at the warding table",
        resource_id: "resource_crafting_item_wardstone_focus",
        amount: 1,
        progress: null,
      },
      {
        id: "hold_seventh",
        type: "explore",
        description: "Set the focus against the Seventh Stone",
        landmark: "landmark_seventh_stone",
        chance: 1,
        found_message:
          "You set the focus against the cracked face of the Seventh Stone and hold it there. The stone hums under your hand, and the threads laid in the crack draw back from the grooves, a finger's width, then a hand's. The crack is still there, but the lines hold, for now.",
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow the stone is holding",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "The threads drew back from the crack. The stone's holding.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "For now. That's all warding ever is. ... Edith would have liked you.",
          },
          { entity_id: null, dialog: "Will you go to the holdfast?" },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "When the stone's mended, and not before. Give me that much.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Keep the focus by you. The hosts come to it the way they come to the stones, because it's the same shape. You'll find it presses them harder than any blade.",
      return_message:
        "Hold the line. Someone has to, and I'm too old to walk it.",
    },
    rewards: [{ type: "gold", amount: 60 }],
    prerequisites: ["quest_the_seventh_stone", "quest_the_unsealed_level"],
  },
  {
    id: "quest_hounds_at_the_ewes",
    kind: "contract",
    type: "defence",
    name: "Hounds at the Ewes",
    description:
      "Nell-of-the-Ditch says the hound packs are at the holdfast's ewes again. Thin them out in the Wardline.",
    board: "landmark_holdfast",
    objectives: [
      {
        id: "kill_hounds",
        type: "kill",
        description: "Kill feral hound packs in the Wardline",
        monster_id: "monster_feral_hounds",
        count: 2,
        region: "wardline",
        progress: null,
      },
    ],
    completion: {
      message:
        "Nell counts the ewes twice and grunts. From Nell, that's thanks.",
    },
    rewards: [{ type: "gold", amount: 60 }],
    prerequisites: ["quest_the_lane_at_night"],
  },
  {
    id: "quest_mugwort_for_the_still",
    kind: "contract",
    type: "collection",
    name: "Mugwort for the Still",
    description:
      "Tam's stillroom goes through mugwort faster than the holdfast can pick it. Gather some from the Wardline's hedges and ditches.",
    board: "landmark_holdfast",
    objectives: [
      {
        id: "gather_mugwort",
        type: "gather",
        description: "Pick mugwort in the Wardline",
        resource_id: "resource_mugwort",
        amount: 5,
        region: "wardline",
        progress: null,
      },
    ],
    completion: {
      message:
        "Tam takes the mugwort, sniffs it and says it'll do. Five more jars on the shelf by nightfall.",
    },
    rewards: [{ type: "gold", amount: 40 }],
    prerequisites: ["quest_the_lane_at_night"],
  },
  {
    id: "quest_walk_the_ditch",
    kind: "contract",
    type: "exploration",
    name: "Walk the Ditch",
    description:
      "Nell wants to know how many walkers are standing along the ward ditch this week. Walk the marked stretch and count them.",
    board: "landmark_holdfast",
    objectives: [
      {
        id: "walk_ditch",
        type: "explore",
        description:
          "Walk the marked stretch of the ward ditch in the Wardline",
        region: "wardline",
        tile: "tile_ward_ditch",
        chance: 1,
        found_message:
          "You walk the stretch of ditch Nell marked. Here and there a host stands in the long grass, facing the stones, as still as a post. None of them turns to watch you go.",
        progress: null,
      },
    ],
    completion: {
      message:
        "Nell chalks your count on the board beside last week's. It's gone up.",
    },
    rewards: [{ type: "gold", amount: 35 }],
    prerequisites: ["quest_the_lane_at_night"],
  },
  {
    id: "quest_inside_the_ring",
    kind: "story",
    type: "exploration",
    name: "Inside the Ring",
    description:
      "The ring bends north past the Fifth Stone, and the Fourth stands inside the growth now. Nobody has seen it in a hundred and twenty years. Ansel wants to know whether it's still standing, and he can't walk that far.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Since you set the focus on Edith's stone I can feel the ring through it, the way you feel a tooth. The Fifth, Sixth, Seventh, Eighth. Past the Fifth it bends north, and the Fourth has gone quiet.",
          },
          {
            entity_id: null,
            dialog: "The Fourth is inside the growth.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "It always was. The ring was drawn round the worst of it, not in front of it. Nobody has stood at the Fourth since the lighting. I need to know if it's still standing.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "You'll want an axe that bites grown wood, and iron is the least that will. Bett can forge one. Keep your mask on, go in past the Fifth, and follow the stones east and north.",
          },
        ],
        progress: null,
      },
      {
        id: "forge_iron_axe",
        type: "craft",
        description: "Have an iron axe forged at the Mine Forge",
        resource_id: "resource_crafting_item_iron_axe",
        amount: 1,
        progress: null,
      },
      {
        id: "find_fourth",
        type: "explore",
        description: "Find the Fourth Stone in the Bloom",
        landmark: "landmark_fourth_stone",
        chance: 1,
        found_message:
          "The Fourth Stone is still standing, up to its shoulders in growth. The growth hasn't just grown over it. It's been laid into the Wardens' lines one groove at a time and pressed flat, like thread worked through a needle, until every line on the face is filled. A host stands with both palms against the stone and doesn't turn round.",
        progress: null,
      },
      {
        id: "kill_host",
        type: "kill",
        description: "Bring down the host at the stone",
        monster_id: "monster_host",
        count: 1,
        progress: null,
      },
      {
        id: "break_crust",
        type: "gather",
        description:
          "Break a piece of the hard crust off the stone with an iron pick",
        resource_id: "resource_chitin_crust",
        amount: 2,
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow what you found at the Fourth Stone",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "It's standing. But the growth's been laid into the lines, groove by groove, and pressed down. And it goes hard as horn in there. Here.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Laid in. ... Hosts don't lay anything. They stand where they're put. Something in there took the time to fill every line on a wardstone, and knew which lines to fill.",
          },
          { entity_id: null, dialog: "Something that can think." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Don't say it to the holdfast. Not yet. And don't go back in on a wax mask. You were coughing before you came through the gate. Tam Reedsdaughter is cleverer than any Warden I knew. Ask her.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Horn. The Wardens' respirators had plates like this over the mouth, and I always thought they were bone. Take the tinctures, and go and see the Reeds' girl before you go back in.",
      return_message:
        "Filled, every line. I keep thinking about the patience of it.",
    },
    rewards: [
      { type: "gold", amount: 70 },
      { type: "item", item_id: "item_spore_tincture", amount: 3 },
    ],
    prerequisites: ["quest_the_wardstone_focus"],
  },
  {
    id: "quest_something_better_than_either",
    kind: "story",
    type: "crafting",
    name: "Something Better Than Either",
    description:
      "A waxed mask won't keep you breathing in the Bloom. Tam has a page in her grandmother's book about the Wardens' old respirators, with glass eyes and a sealed filter, and she has never had glass to try it with.",
    giver: { entity_id: "npc_tam_reedsdaughter" },
    objectives: [
      {
        id: "talk_tam",
        type: "talk",
        description: "Speak with Tam Reedsdaughter in her stillroom",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Sit down. Breathe out. ... You've been inside the ring on one of my masks, and it sounds like it. The masks are for the fields. They were never meant for in there.",
          },
          { entity_id: null, dialog: "Can you make something better?" },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Gran's book has a page from before the wall: a Warden's respirator, with glass eyes and a filter sealed over the mouth. I've never had glass. Your potter in the fen has. The birches in there weep a resin that sets hard and clear. Tap some, have him fuse it into his glass, and bring me the panes. I'll build the rest round them with felt and a mat of that white root.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "And Nell says the growth in there goes hard enough to cut with. Have your smith put an edge of it on an axe. Then use the respirator for something. Nell went over the ring once as a girl and came back talking about a pit north of the old green, with the growth set out in beds like a kitchen garden. Wick had her whipped for it. Go and look.",
          },
        ],
        progress: null,
      },
      {
        id: "tap_resin",
        type: "gather",
        description: "Tap spore resin from weeping birches in the Bloom",
        resource_id: "resource_weeping_birch",
        amount: 4,
        progress: null,
      },
      {
        id: "fuse_glass",
        type: "craft",
        description: "Fuse spore-glass at the Kiln",
        resource_id: "resource_crafting_item_spore_glass",
        amount: 2,
        progress: null,
      },
      {
        id: "build_respirator",
        type: "craft",
        description: "Build a filter respirator at the loom and apothecary",
        resource_id: "resource_crafting_item_filter_respirator",
        amount: 1,
        progress: null,
      },
      {
        id: "forge_chitin_axe",
        type: "craft",
        description: "Have a chitin-edged axe forged at the Mine Forge",
        resource_id: "resource_crafting_item_chitin_axe",
        amount: 1,
        progress: null,
      },
      {
        id: "find_pit",
        type: "explore",
        description: "Find the pit Nell saw, north of the old green",
        landmark: "landmark_growing_pit",
        chance: 1,
        found_message:
          "It's there, north and east of the green: a broad pit terraced into beds, the growth set out in rows with channels of water between them, as neat as any garden at the holdfast. Someone is kneeling in the far bed with their sleeves rolled up. They look up at you through the spores. They don't come at you, and they don't run.",
        progress: null,
      },
      {
        id: "talk_tam_after",
        type: "talk",
        description: "Tell Tam Reedsdaughter what's in the pit",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "It's a garden. Beds and water channels. And someone was working in it. They looked at me and went back to work.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog: "Someone. Not a walker?",
          },
          { entity_id: null, dialog: "A walker doesn't weed." },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "... Don't tell Wick. Not yet, not until we know what they are. Go back, with your respirator on, and sit on the edge and ask their name. Then come and tell me every word.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_tam_reedsdaughter",
      message:
        "Gran's book was right about the glass. Keep the respirator on inside the ring, and drink a tincture on top of it in the worst of the air. It thins the spores. It doesn't stop them, and neither does anything else I can make.",
      return_message: "Someone weeding. I can't stop thinking about it.",
    },
    rewards: [
      { type: "gold", amount: 80 },
      { type: "item", item_id: "item_spore_tincture", amount: 2 },
    ],
    prerequisites: ["quest_inside_the_ring", "quest_what_the_ground_keeps"],
  },
  {
    id: "quest_moths_on_the_north_wind",
    kind: "contract",
    type: "defence",
    name: "Moths on the North Wind",
    description:
      "Spore-moth swarms have been drifting over the ring on the north wind and settling on the holdfast's washing. Nell wants them thinned out at the source, in the Bloom.",
    board: "landmark_holdfast",
    objectives: [
      {
        id: "kill_moths",
        type: "kill",
        description: "Kill spore-moth swarms in the Bloom",
        monster_id: "monster_spore_moths",
        count: 2,
        region: "bloom",
        progress: null,
      },
    ],
    completion: {
      message:
        "Nell shakes a sheet out over the wall and nothing comes off it but dust. She nods once.",
    },
    rewards: [{ type: "gold", amount: 90 }],
    prerequisites: ["quest_inside_the_ring"],
  },
  {
    id: "quest_horn_for_the_gate",
    kind: "contract",
    type: "collection",
    name: "Horn for the Gate",
    description:
      "Nell wants plates of the Bloom's hard crust to face the holdfast gate where the oak has gone soft. Break some off in the Bloom with an iron pick.",
    board: "landmark_holdfast",
    objectives: [
      {
        id: "break_crust",
        type: "gather",
        description: "Break chitin crust in the Bloom",
        resource_id: "resource_chitin_crust",
        amount: 3,
        region: "bloom",
        progress: null,
      },
    ],
    completion: {
      message: `Nell knocks a plate against the gatepost and listens to it ring. "Better than oak," she says, and doesn't look happy about it.`,
    },
    rewards: [{ type: "gold", amount: 80 }],
    prerequisites: ["quest_inside_the_ring"],
  },
  {
    id: "quest_elk_in_the_barley",
    kind: "contract",
    type: "combat",
    name: "Elk in the Barley",
    description:
      "A colonised elk has come over the ring and trampled a strip of the holdfast's barley. Nell wants one brought down in the Bloom before the rest follow it.",
    board: "landmark_holdfast",
    objectives: [
      {
        id: "kill_elk",
        type: "kill",
        description: "Bring down a colonised elk in the Bloom",
        monster_id: "monster_colonised_elk",
        count: 1,
        region: "bloom",
        progress: null,
      },
    ],
    completion: {
      message:
        "Nell hears you out and chalks the elk up on the board. Somebody at the back asks whether it's good eating. Nobody answers.",
    },
    rewards: [{ type: "gold", amount: 100 }],
    prerequisites: ["quest_inside_the_ring"],
  },
  {
    id: "quest_ask_their_name",
    kind: "story",
    type: "dialog",
    name: "Ask Their Name",
    description:
      "Tam wants to know who keeps the garden in the pit. Go back with your respirator on, sit on the edge of the beds, and ask.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description:
          "Sit at the edge of the growing pit and ask the gardener's name",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "I'm from the camp at the valley mouth. Tam Reedsdaughter sent me. What's your name?",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "Gill. For the underside of things, where the growing happens. You're the one who comes and goes with the stone-thing on your back. The wax-women's smoke is on you too.",
          },
          { entity_id: null, dialog: "Wax-women?" },
          {
            entity_id: "npc_gill",
            dialog:
              "Behind the wall with the bitter fires. We hear them singing when the wind's right. ... You can sit. But the moths are in the far beds again, eating the new growth, and I can't shift them on my own. Then go and sit with the parents on the green a while. You should meet them.",
          },
        ],
        progress: null,
      },
      {
        id: "kill_moths",
        type: "kill",
        description: "Drive the spore-moths off Gill's beds",
        monster_id: "monster_spore_moths",
        count: 2,
        progress: null,
      },
      {
        id: "explore_green",
        type: "explore",
        description:
          "Sit with the hosts Gill calls the parents, on the Standing Green",
        landmark: "landmark_standing_green",
        chance: 1,
        found_message:
          "The hosts round the well have grown into each other at the shoulders, a ring of them facing inward, as if they'd been listening to someone at the well when the growth took them. Someone has swept the flagstones round their feet and left fresh water in the trough. Nothing moves to meet you.",
        progress: null,
      },
      {
        id: "talk_gill_after",
        type: "talk",
        description: "Go back to Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "I sat with them. Someone sweeps round their feet.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "I do. They were the first. They went into the ground so there'd be something left of them when the stone-cutters shut the ring, and the ground kept them. We came after, and grew up in their shade.",
          },
          {
            entity_id: null,
            dialog: "Tam's people think the ring keeps them safe.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "It keeps them out. It keeps us in. It hums all day, like a wasp in a jar, and past it nothing of ours can go. Not a thread. ... Tell your Tam my name. Tell her I asked after the singing.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_tam_reedsdaughter",
      message:
        "Gill. They've a name, and they sweep round the walkers' feet. And they asked after the singing. ... Don't tell Wick. I'll tell him myself, when I know what to say.",
      return_message: "Gill. I keep saying it over.",
    },
    rewards: [{ type: "gold", amount: 90 }],
    prerequisites: ["quest_something_better_than_either"],
  },
  {
    id: "quest_grow_dont_cut",
    kind: "story",
    type: "collection",
    name: "Grow, Don't Cut",
    description:
      "Gill has watched you hack your way through the Bloom with iron and chitin. Before teaching you anything, Gill wants to see what you do with what you take, and wants you to see what your focus does to the parents.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description: "Speak with Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: "npc_gill",
            dialog:
              "You cut everything. Trees, crust, the parents' threads. Everything you carry was cut off something.",
          },
          { entity_id: null, dialog: "That's how we make things." },
          {
            entity_id: "npc_gill",
            dialog:
              "It's one way. We grow them. A bed doesn't want a blade, it wants feeding. Tap the weeping birches, don't fell them, and bring me the resin. And the white mats off the fallen logs. They're for the beds.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "Then one more thing. There's a cluster of the parents who grew together at the end. Press on one with your stone-thing, the way the ring does. I want to watch what it does to them, and I want you to watch it too.",
          },
        ],
        progress: null,
      },
      {
        id: "tap_resin",
        type: "gather",
        description: "Tap spore resin from the weeping birches",
        resource_id: "resource_weeping_birch",
        amount: 3,
        progress: null,
      },
      {
        id: "lift_mats",
        type: "gather",
        description: "Lift mycelium mats off grown-through logs",
        resource_id: "resource_rotten_log",
        amount: 3,
        progress: null,
      },
      {
        id: "press_cluster",
        type: "kill",
        description:
          "Bring down a host-cluster with warding while Gill watches",
        monster_id: "monster_host_cluster",
        count: 1,
        progress: null,
      },
      {
        id: "talk_gill_after",
        type: "talk",
        description: "Go back to Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "It shrank from the focus, like it was being pushed into a smaller space.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "That's how the stones feel. All day, from all twelve sides. Warding doesn't cut us. It tells us what shape to be and presses until we are.",
          },
          { entity_id: null, dialog: "And growing?" },
          {
            entity_id: "npc_gill",
            dialog:
              "Growing asks. ... Here. The first one I ever grew. It opens the ground, and the ground does the rest. Come back when you want to learn what it can do.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_gill",
      message:
        "Keep it by you. Nobody from outside the ring has held one since the stones went up. Your old stone-cutter would spit if he saw it in your hand.",
      return_message: "Growing asks. Remember that.",
    },
    rewards: [
      { type: "item", item_id: "item_chitin_dibber", amount: 1 },
      { type: "gold", amount: 60 },
    ],
    prerequisites: ["quest_ask_their_name"],
  },
  {
    id: "quest_the_sporecraft_wand",
    kind: "story",
    type: "crafting",
    name: "The Sporecraft Wand",
    description:
      "Gill will teach you to grow a wand in the pit's beds: threaded heartwood for the stem, the parents' threads and the birches' resin to feed it, and chitin for the grip. It carries the Bloom with it, and Gill won't pretend it doesn't.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description: "Speak with Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: "npc_gill",
            dialog:
              "A stone-thing presses. A grown thing bursts. You feed it until it wants to spread, and then you point where. That's all sporecraft is.",
          },
          { entity_id: null, dialog: "What does it cost?" },
          {
            entity_id: "npc_gill",
            dialog:
              "You'll carry some of us with you. A little, in your chest, all the time, wherever you go. The wax-women's glass mask thins it. Nothing stops it. We don't mind it. You will.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "A stem of heartwood off a threaded oak, cut with that chitin axe of yours. Three hanks of the parents' threads: when one of them falls the ground takes it back and it stands up again somewhere, so take what they leave. Two of resin, two of horn. Set them in the beds with the dibber.",
          },
        ],
        progress: null,
      },
      {
        id: "cut_heartwood",
        type: "gather",
        description: "Cut threaded heartwood from a threaded oak",
        resource_id: "resource_threaded_oak",
        amount: 1,
        progress: null,
      },
      {
        id: "threads_from_hosts",
        type: "kill",
        description: "Take threads from the hosts of the Bloom",
        monster_id: "monster_host",
        count: 2,
        progress: null,
      },
      {
        id: "grow_wand",
        type: "craft",
        description: "Grow a sporecraft wand in the growing pit's beds",
        resource_id: "resource_crafting_item_sporecraft_wand",
        amount: 1,
        progress: null,
      },
      {
        id: "burst_clusters",
        type: "kill",
        description: "Burst two host-clusters with the wand",
        monster_id: "monster_host_cluster",
        count: 2,
        progress: null,
      },
      {
        id: "talk_gill_after",
        type: "talk",
        description: "Go back to Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "It went straight through the cluster. And I can feel it in my chest.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "That's us, saying hello. It won't go away. ... Now you've held both, the stone-thing and the grown thing. The old stone-cutter at the valley mouth will want you to choose. So will I. Not yet.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_gill",
      message:
        "Grow the balm too, if you're going to be in the beds. Resin, a white mat and the wax-women's honey. It closes a wound faster than their comfrey, and it leaves a little of us behind.",
      return_message:
        "Point it where you mean it. It goes further than you think.",
    },
    rewards: [
      { type: "gold", amount: 100 },
      { type: "item", item_id: "item_thread_balm", amount: 3 },
    ],
    prerequisites: ["quest_grow_dont_cut"],
  },
  {
    id: "quest_davy_reeds_song",
    kind: "story",
    type: "dialog",
    name: "Davy Reed's Song",
    description:
      "Gill asked after the singing, and Tam can't let it go. There's a song the Reed women sing over the still that makes the old ones leave the room, and Tam wants to know whether anyone in the pit knows it.",
    giver: { entity_id: "npc_tam_reedsdaughter" },
    objectives: [
      {
        id: "talk_tam",
        type: "talk",
        description: "Speak with Tam Reedsdaughter in her stillroom",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Gill asked after the singing. Out of everything, that. ... Gran sang me a song about her brother, the one who went into the wood.",
          },
          { entity_id: null, dialog: "Davy Reed." },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "'Davy's gone down to the wood, laughing, laughing, left his boots at the door and his cap on the peg.' That's the first verse. There's a second, and nobody at the holdfast will sing it to me.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Take it to Gill. Sing it badly, I don't care. Watch Gill's face.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_gill",
        type: "talk",
        description: "Sing Tam's verse to Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "'Davy's gone down to the wood, laughing, laughing, left his boots at the door and his cap on the peg...'",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "'...and the ground came up to meet him, and it's holding him yet.' ... That's the second verse. Where did you get the first?",
          },
          {
            entity_id: null,
            dialog:
              "From Tam Reedsdaughter. Her grandmother's brother was Davy Reed.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "The ground sings it. It was the first thing I heard, before I had words. The parents remember in the threads, and the one who remembers that song is the one I came from. ... Davy. I never had a name for him until now.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_tam_after",
        type: "talk",
        description: "Tell Tam what Gill sang",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "Gill knows the second verse. 'The ground came up to meet him, and it's holding him yet.' Gill's father was Davy Reed.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Then Gill's a Reed. Gran's brother's child. ... She said he'd have children in there by now, and laughed, and then she cried. She was right about all of it.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "I'm going over the ring. Don't look at me like that. I'll not go on a wax mask. Make me a glass one like yours, and meet me at the pit.",
          },
        ],
        progress: null,
      },
      {
        id: "tams_respirator",
        type: "craft",
        description: "Build Tam a filter respirator at the loom and apothecary",
        resource_id: "resource_crafting_item_filter_respirator",
        amount: 1,
        progress: null,
      },
      {
        id: "meet_at_pit",
        type: "talk",
        description: "Meet Tam at the growing pit",
        entity_id: "npc_tam_reedsdaughter",
        landmark: "landmark_growing_pit",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Gill? I'm Tam. Tam Reedsdaughter. I think my gran was your father's sister.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "You're the one who sings over the still. We hear you when the wind's right. You go flat on the high note.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Everyone says that. ... Look at these beds. The channels, the way the water's laid. That's Gran's kitchen garden. That's how the Reeds have always laid a bed.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_tam_reedsdaughter",
      landmark: "landmark_growing_pit",
      message:
        "Go on back. I'll walk home when I'm ready, Gill says as far as the Sixth Stone and no further. And don't tell Wick where I am. He'll know soon enough.",
      return_message: "Cousins. I've a cousin.",
    },
    rewards: [
      { type: "gold", amount: 90 },
      { type: "item", item_id: "item_spore_tincture", amount: 3 },
    ],
    prerequisites: ["quest_grow_dont_cut"],
  },
  {
    id: "quest_over_the_ring",
    kind: "story",
    type: "investigation",
    name: "Over the Ring",
    description:
      "Nell saw Tam go north past the Sixth Stone in a glass mask, and ran to tell Old Wick. Wick wants to know where she's gone, and who put the notion in her head.",
    giver: { entity_id: "npc_old_wick" },
    objectives: [
      {
        id: "talk_wick",
        type: "talk",
        description: "Speak with Old Wick at the holdfast",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: "npc_old_wick",
            dialog:
              "Nell says Tam went north past the Sixth Stone at first light, in one of your glass masks. Where is she?",
          },
          {
            entity_id: null,
            dialog:
              "At a growing pit in the Bloom, with her cousin. Gill. Davy Reed's child.",
          },
          {
            entity_id: "npc_old_wick",
            dialog: "Her cousin. In there.",
          },
          {
            entity_id: null,
            dialog:
              "There are people inside the ring, Wick. The walkers' children. They think and talk, and they keep a garden.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "Davy Reed. My grandmother used to say his name and then spit. ... Walkers' children. Go to the Sixth Stone and bring her home. There's a walker stands at that stone, and I'll not have her pass it alone.",
          },
        ],
        progress: null,
      },
      {
        id: "clear_sixth",
        type: "kill",
        description: "Put down the walker standing at the Sixth Stone",
        monster_id: "monster_host_wanderer",
        count: 1,
        progress: null,
      },
      {
        id: "find_tam",
        type: "talk",
        description: "Find Tam at the Sixth Stone",
        entity_id: "npc_tam_reedsdaughter",
        landmark: "landmark_sixth_stone",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "I'm not lost, I'm thinking. Gill walked me to the stone and couldn't come a step further. Put a hand out past it and snatched it back like it had touched a stove.",
          },
          { entity_id: null, dialog: "The ring keeps them in." },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "It keeps Gill in. Gill's never seen a sheep. ... Take me home. I've something to say to Wick and I want it said before I lose my nerve.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_wick_after",
        type: "talk",
        description: "Bring Tam home to Old Wick",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "She's home. Gill walked her as far as the stone and couldn't go further.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "She told me. All of it. Davy's child weeding in a pit, and a ring of stones they can't cross any more than we could.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "A hundred and twenty years I've hated those stones for what they kept in. I never once thought what else was in there with us. ... Your Warden will come to this gate now, and he'll say it all, and not only about the Wickens. Tell him the Reeds have kin inside the ring. Tell him I know.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "Go on, tell him. And tell him if he means to mend those stones, he'll say why to my face first.",
      return_message: "Davy's child. Weeding.",
    },
    rewards: [{ type: "gold", amount: 100 }],
    prerequisites: ["quest_davy_reeds_song"],
  },
  {
    id: "quest_a_line_recut",
    kind: "story",
    type: "investigation",
    name: "A Line Re-Cut",
    description:
      "Wick's message has reached the valley mouth, and so has the smell of the Bloom on you. Ansel has something to show you at the Sixth Stone, and something to admit, though not all of it.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "There's something in your pack that wasn't cut. I can smell it from here. They've taught you.",
          },
          {
            entity_id: null,
            dialog:
              "Gill did. And Wick says to tell you the Reeds have kin inside the ring. He knows, and he wants you at his gate.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "He's right to. ... I told you there was more than my master's part. Go to the Sixth Stone. On the south face, low down under the moss, there's a mason's mark and a date. Read it, and come back.",
          },
        ],
        progress: null,
      },
      {
        id: "read_sixth",
        type: "explore",
        description: "Read the mark under the moss on the Sixth Stone",
        landmark: "landmark_sixth_stone",
        chance: 1,
        found_message:
          "Under the moss on the Sixth Stone's south face the lines have been cut twice: once, worn and old, and again over the top, sharp and newer. Beside them is a mark: A.M. RE-CUT, and a date sixty years gone. On the inner face, at the height of a child's hand, the growth has been scraped off the stone in five short lines, as if someone had held on to it.",
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow what the mark says",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          { entity_id: null, dialog: "A.M. Re-cut. Sixty years ago." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "I was nineteen. There were six of us left and I was the youngest, so the order sent me up the valley with a stylus to re-cut the Sixth where it was failing. Nobody was alive in there, I was told. The upper farms had gone into the growth to a man.",
          },
          { entity_id: null, dialog: "Someone came to the stone." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "... I finished the line. That's all I'll say today: I finished the line. The rest I'll say once, at Wick's gate, when I know what I'm asking him to forgive, the mending or the breaking.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "The ring was keyed from the middle. The Keepers cut the first line where the network comes up, and every stone answers to that one. If the ward's to be mended, it's mended there. If it's to be broken, it's broken there. Whatever you decide, you'll decide it at the Heart.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Get the measure of the Heart, if you can get near it. I can't, and I shouldn't be the one to choose.",
      return_message: "I finished the line. I've been finishing it ever since.",
    },
    rewards: [{ type: "gold", amount: 120 }],
    prerequisites: ["quest_over_the_ring", "quest_the_sporecraft_wand"],
  },
  {
    id: "quest_the_offer",
    kind: "story",
    type: "exploration",
    name: "The Offer",
    description:
      "Gill has taught you to grow, and has met a cousin across the ring. Now Gill wants to ask you something, and says it isn't Gill's to ask.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description: "Speak with Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: "npc_gill",
            dialog:
              "You carry both now, the stone-thing and the grown thing. You've stood at the ring and felt it hum, and you've seen Tam stop at it.",
          },
          { entity_id: null, dialog: "What do you want, Gill?" },
          {
            entity_id: "npc_gill",
            dialog:
              "The ring broken. Not for spite. The Bloom is the valley's next season, and the ring is a jar with us in it. I want to walk Tam home past the stones. I want to see a sheep.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "But it isn't mine to ask. Hollow asks. Hollow listens to the whole of the ground and says what it hears. Come north with me, to the wall, where the ground comes up.",
          },
        ],
        progress: null,
      },
      {
        id: "find_wall",
        type: "explore",
        description: "Go north with Gill to the Threaded Wall",
        landmark: "landmark_threaded_wall",
        chance: 1,
        found_message:
          "North of the pit the forest ends in a wall of grey threads as high as a barn, laid over and over each other and still growing, warm to the touch. It runs away east and west as far as you can see. When you speak, the threads nearest your mouth lean towards you, and deep inside something hums, slow and low, a note the stones answer from all round the ring.",
        progress: null,
      },
      {
        id: "talk_gill_wall",
        type: "talk",
        description: "Speak with Gill at the Threaded Wall",
        entity_id: "npc_gill",
        landmark: "landmark_threaded_wall",
        dialog_steps: [
          { entity_id: null, dialog: "Is there a way through?" },
          {
            entity_id: "npc_gill",
            dialog:
              "Here, where it hangs loose like a curtain. It parts for you. The Heart is behind it, where the ground comes up and your stone-cutters cut their first line. Hollow is there. Hollow will ask you what you will do with the ring. So will your old stone-cutter, and so will Tam's Wick.",
          },
          { entity_id: null, dialog: "And what will you ask?" },
          {
            entity_id: "npc_gill",
            dialog:
              "Nothing. I've asked. ... Don't go in until you're dressed for it. It's thicker in there than anything you've breathed, and there are things in there that the ground grew for itself. Grow what you like in the meantime. The beds are yours.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_gill",
      message:
        "Whatever you choose at the Heart, come and tell me first. I'd rather hear it from you than feel it through the ground.",
      return_message: "The wall parts for you. Hollow is waiting.",
    },
    rewards: [
      { type: "gold", amount: 120 },
      { type: "item", item_id: "item_thread_balm", amount: 2 },
    ],
    prerequisites: ["quest_the_sporecraft_wand", "quest_davy_reeds_song"],
  },
  {
    id: "quest_tap_dont_fell",
    kind: "contract",
    type: "collection",
    name: "Tap, Don't Fell",
    description:
      "Gill's beds want feeding. Tap spore resin from the weeping birches in the Bloom, and leave the trees standing.",
    board: "landmark_growing_pit",
    objectives: [
      {
        id: "tap_resin",
        type: "gather",
        description: "Tap spore resin in the Bloom",
        resource_id: "resource_weeping_birch",
        amount: 4,
        region: "bloom",
        progress: null,
      },
    ],
    completion: {
      message:
        "Gill tips the resin into the channel at the head of the beds. By evening the rows have grown a hand's width.",
    },
    rewards: [{ type: "gold", amount: 80 }],
    prerequisites: ["quest_ask_their_name"],
  },
  {
    id: "quest_mats_for_the_beds",
    kind: "contract",
    type: "collection",
    name: "Mats for the Beds",
    description:
      "New beds need a white mat laid under them. Lift mycelium mats off the grown-through logs in the Bloom.",
    board: "landmark_growing_pit",
    objectives: [
      {
        id: "lift_mats",
        type: "gather",
        description: "Lift mycelium mats in the Bloom",
        resource_id: "resource_rotten_log",
        amount: 3,
        region: "bloom",
        progress: null,
      },
    ],
    completion: {
      message:
        "Gill lays the mats down one by one and presses them flat with both palms, the way the hosts stand at the stones.",
    },
    rewards: [{ type: "gold", amount: 80 }],
    prerequisites: ["quest_ask_their_name"],
  },
  {
    id: "quest_where_the_puffballs_burst",
    kind: "contract",
    type: "exploration",
    name: "Where the Puffballs Burst",
    description:
      "Gill plants where the puffballs have burst, and wants to know which glades have gone this week. Walk one and see.",
    board: "landmark_growing_pit",
    objectives: [
      {
        id: "walk_glade",
        type: "explore",
        description: "Find a puffball glade in the Bloom that has burst",
        region: "bloom",
        tile: "tile_puffball_glade",
        chance: 1,
        found_message:
          "The puffballs here have burst and gone flat, and the ground under them is dusted grey. Gill will want to plant it.",
        progress: null,
      },
    ],
    completion: {
      message:
        "Gill nods and marks the glade on a slab of chitin with a thumbnail. You'd swear it's a map.",
    },
    rewards: [{ type: "gold", amount: 70 }],
    prerequisites: ["quest_ask_their_name"],
  },
  {
    id: "quest_the_keepers_knot",
    kind: "story",
    type: "investigation",
    name: "The Keeper's Knot",
    description:
      "Ansel says the ring was keyed from the Heart, and that one of the Keepers who keyed it never came out. Something in the order's grey mail still keeps watch at a camp inside the wall. Ansel wants to know who.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "You've been through the wall. I can see it in the way you stand. Did you see a camp in there? Tent poles, a hearth?",
          },
          {
            entity_id: null,
            dialog:
              "Grown into pillars. And something in Warden's mail keeping watch, with a knot of cord on its shoulder.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "A Keeper's knot. There were four Keepers at the sealing, and the roll says all four died of it. Three are buried at the valley mouth. Nobody ever said where the fourth lies.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Put it down, if you can. Then look inside its respirator. The Keepers scratched their names in the cheek-guard, so the order would know whose face it was taking off.",
          },
        ],
        progress: null,
      },
      {
        id: "find_camp",
        type: "explore",
        description: "Find the Keepers' Camp in the Heart",
        landmark: "landmark_keepers_camp",
        chance: 1,
        found_message:
          "The Keepers' Camp is as it was left: tent poles gone to white pillars, a cold hearth, a rack of stylus points furred over. Three bedrolls have rotted flat. The fourth has been slept on until it's shaped like a man, and the man is standing by the hearth watching you, a knot of grey cord on his shoulder.",
        progress: null,
      },
      {
        id: "rest_keeper",
        type: "kill",
        description: "Put down the Heart-Warden",
        monster_id: "monster_heart_warden",
        count: 1,
        progress: null,
      },
      {
        id: "talk_ansel_after",
        type: "talk",
        description: "Tell Ansel Morrow whose name is in the respirator",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: null,
            dialog: "Inside the cheek-guard it says J. WICKEN, KEEPER.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog: "... Joss Wicken. The Keeper who keyed the first line.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "A closed line has to be closed from inside it, and the first line closes on whoever cuts it. He knew. He cut it, sent the others out, and stayed. The order wrote him down as dead at the sealing. Near enough true.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "He was a valley boy who went south to the order young. His brother farmed the upper fields, north of where the stones went. He keyed the ring with his own brother's children inside it, and then shut himself in with them. ... I can't carry that to the holdfast and say nothing else. I'll say all of it.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Wick's grandmother waited at the gate a year for a Warden to come back. One of them never left. I don't know if that's better or worse.",
      return_message: "Joss Wicken. Still keeping it.",
    },
    rewards: [{ type: "gold", amount: 150 }],
    prerequisites: ["quest_a_line_recut"],
  },
  {
    id: "quest_at_wicks_gate",
    kind: "story",
    type: "dialog",
    name: "At Wick's Gate",
    description:
      "Ansel is ready to say it all, once, at the holdfast's gate, with Sister Edith's book in his hands. He asks you to fetch the book from the Seventh Stone and meet him there.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Edith's book is still under her hearthstone. I said I'd be the one to carry it to them, and I will, but my knees won't take me to the Seventh Stone and back. Fetch it for me, and I'll meet you at Wick's gate.",
          },
          { entity_id: null, dialog: "You're going up?" },
          {
            entity_id: "npc_ansel_morrow",
            dialog: "I've been going up for sixty years. Go on.",
          },
        ],
        progress: null,
      },
      {
        id: "fetch_book",
        type: "explore",
        description: "Fetch Sister Edith's book from the Seventh Stone",
        landmark: "landmark_seventh_stone",
        chance: 1,
        found_message:
          "Edith's book is where it was, in the lead box under the hearthstone. You wrap it in your coat. On the last page with writing on it, under the dates, she has written the upper families out again, all of them, Wicken first, and under them: I will tell them myself.",
        progress: null,
      },
      {
        id: "give_book",
        type: "talk",
        description: "Give Ansel Morrow the book at the holdfast gate",
        entity_id: "npc_ansel_morrow",
        landmark: "landmark_holdfast",
        dialog_steps: [
          { entity_id: null, dialog: "Edith's book." },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Thank you. ... Stand by me. I've never done this, and I'll only manage it once.",
          },
        ],
        progress: null,
      },
      {
        id: "confession",
        type: "talk",
        description: "Stand by Ansel while he speaks to Old Wick",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "My name is Ansel Morrow. I'm the last Warden sworn. The order took the southern families down the valley and told yours to stay put, and we knew we weren't coming back. The roll was written before the carts came. Sister Edith asked that you be told, and was refused. This is her book. She wrote your names in it again at the end.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "At nineteen I re-cut the Sixth Stone. A child came to it from inside, grey at the temples, and held on to it and called to me. I'd been told nobody was alive in there. I finished the line, and the stone burned the child's hand off it. It was Davy Reed's child. It was Gill.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "And the thing that keeps watch in the Heart is Joss Wicken, the Keeper who keyed the first line with your grandmother inside it, and then stayed in there to close it. Her uncle. Yours.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "... Annis said a Wicken went south to the stone-cutters as a boy and never wrote home. She thought he'd died young.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "You've said it, at my gate, with the book in your hands. It's not forgiven, Warden. But it's said, and I've waited my whole life to hear it.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "Leave the book with me. Tam can read it to the little ones. And he's not done yet: there's one more who should hear what he did at that stone.",
      return_message: "It's said. That's something.",
    },
    rewards: [{ type: "gold", amount: 150 }],
    prerequisites: ["quest_the_keepers_knot"],
  },
  {
    id: "quest_across_the_line",
    kind: "story",
    type: "dialog",
    name: "Across the Line",
    description:
      "Ansel has said it at Wick's gate. Wick wants one thing more for his reckoning: the Warden to say it to the child whose hand he burned off the Sixth Stone.",
    giver: { entity_id: "npc_old_wick" },
    objectives: [
      {
        id: "talk_wick",
        type: "talk",
        description: "Speak with Old Wick at the holdfast",
        entity_id: "npc_old_wick",
        dialog_steps: [
          {
            entity_id: "npc_old_wick",
            dialog:
              "He's said it to me. He's not said it to the one it was done to. Davy's child is at their pit, and your Warden is sat on my bench like a man who's put down something heavy. He's not done.",
          },
          {
            entity_id: "npc_old_wick",
            dialog:
              "Fetch Gill to the Sixth Stone, their side of it. I'll send him up to ours. Whatever the stones are for, they can stand between the two of them while he says it.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_gill",
        type: "talk",
        description: "Ask Gill to come to the Sixth Stone",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: null,
            dialog:
              "Ansel Morrow wants to speak to you at the Sixth Stone. He's the one who re-cut it.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "The boy with the bronze point. ... He didn't look up. That's what I remember most. I called and called, and he didn't look up.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "I'll come. I can't cross it. He'll have to look up this time.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_ansel_sixth",
        type: "talk",
        description: "Find Ansel Morrow at the Sixth Stone",
        entity_id: "npc_ansel_morrow",
        landmark: "landmark_sixth_stone",
        dialog_steps: [
          { entity_id: "npc_ansel_morrow", dialog: "Is that Gill?" },
          { entity_id: null, dialog: "On the other side. Waiting." },
          {
            entity_id: "npc_ansel_morrow",
            dialog: "Then I'll look up.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_gill_sixth",
        type: "talk",
        description: "Stand at the Sixth Stone while Ansel speaks to Gill",
        entity_id: "npc_gill",
        landmark: "landmark_sixth_stone",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "I was told there was nobody alive in there. When I saw you, I told myself you weren't. I finished the line because it was easier than believing you. I'm sorry. I've been sorry for sixty years, and it hasn't helped you at all.",
          },
          {
            entity_id: "npc_gill",
            dialog: "It hasn't. ... But you looked up.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "Tell Wick the stone-cutter looked up. And tell him that whatever happens at the Heart, I'd have liked to see his sheep.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "He looked up. Well. That's my reckoning, and more than Annis ever got. What happens to the stones now is between you and the Heart. Don't ask me to choose it: I've hated them too long to see straight.",
      return_message:
        "Tam's been reading Edith's book to the little ones. They like the bit where she goes to the Reeds herself.",
    },
    rewards: [
      { type: "gold", amount: 150 },
      { type: "item", item_id: "item_spore_tincture", amount: 4 },
    ],
    prerequisites: ["quest_at_wicks_gate"],
  },
  {
    id: "quest_what_the_ground_wants",
    kind: "story",
    type: "dialog",
    name: "What the Ground Wants",
    description:
      "Gill has made the offer, and says it isn't Gill's to make. Hollow sits at the Threadwell inside the Heart, hears the whole of the ground, and will ask you properly.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description: "Speak with Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: "npc_gill",
            dialog:
              "You're dressed for it now. Go through the Parting. Something the ground grew watches the door, and it won't let you by for asking.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "Hollow is at the well. Sit when Hollow says sit, and listen longer than you want to.",
          },
        ],
        progress: null,
      },
      {
        id: "clear_parting",
        type: "kill",
        description: "Put down a Slinger in the Heart",
        monster_id: "monster_grown_slinger",
        count: 1,
        region: "heart",
        progress: null,
      },
      {
        id: "find_well",
        type: "explore",
        description: "Find the Threadwell",
        landmark: "landmark_threadwell",
        chance: 1,
        found_message:
          "Past the Keepers' Camp the ground dips into a round hollow where the network swells up pale and slow, like water over a spring. At the lip someone sits with their legs down in it to the knee, and further. Threads run from their temples straight into the swell. They turn their head before you make a sound.",
        progress: null,
      },
      {
        id: "talk_hollow",
        type: "talk",
        description: "Speak with Hollow at the Threadwell",
        entity_id: "npc_hollow",
        dialog_steps: [
          {
            entity_id: "npc_hollow",
            dialog:
              "Gill's friend. Sit. ... The ground's been talking about you since the Landing. You cut, and then you learned to grow. It liked that.",
          },
          {
            entity_id: null,
            dialog: "Gill says you speak for the network.",
          },
          {
            entity_id: "npc_hollow",
            dialog:
              "I say what I hear. The ground wants to go on, the way water wants to go downhill. The ring is a jar with the whole Bloom in it, my people with the hosts. Open the first line and we walk out, and the ground walks out with us. Re-cut it and we stay in, and it stays in with us.",
          },
          {
            entity_id: "npc_hollow",
            dialog:
              "Whether that's what the ground wants or what I want, I stopped being able to tell a long time ago. I won't pretend otherwise. Go and look at the Keystone. When you've decided, come and tell me, or tell your stone-cutter. We'll both be where you left us.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_hollow",
      message:
        "Whatever you choose, it'll be the first choosing anyone's done about us in a hundred and twenty years. That's already more than we had.",
      return_message: "The ground's listening. So am I.",
    },
    rewards: [{ type: "gold", amount: 150 }],
    prerequisites: ["quest_the_offer"],
  },
  {
    id: "quest_mend_the_first_line",
    kind: "story",
    type: "crafting",
    name: "Mend the First Line",
    description:
      "Ansel will have you re-cut the Keystone so the ring holds for another hundred years. It keeps the Bloom and its spores off the holdfast and the valley, and it keeps Gill's people in the jar. Once it's done, it can't be undone, and Hollow won't ask you to break it.",
    giver: { entity_id: "npc_ansel_morrow" },
    objectives: [
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the warding table",
        entity_id: "npc_ansel_morrow",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "You've heard Hollow. Now hear me, and then choose. I won't ask twice.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "If the first line goes, the stones go with it, all twelve at once. The Bloom comes down the valley a field at a time: the holdfast first, then the Sinks, then this camp. Nobody downriver knows how to breathe it.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "If it's re-cut, the ring holds. Gill stays behind the Sixth Stone and Hollow at the well, and every one of them with them, for another hundred years, because we decided so. I know what that costs. I paid it at nineteen.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "Take your stylus to the Keystone. Put down whatever's humming on it, and cut the first line clean with wardstone and a thread of the Heart closed inside it. Then tell Hollow yourself. Don't let them feel it through the ground first.",
          },
        ],
        progress: null,
      },
      {
        id: "clear_keystone",
        type: "kill",
        description: "Put down a Singer in the Heart",
        monster_id: "monster_grown_singer",
        count: 1,
        region: "heart",
        progress: null,
      },
      {
        id: "recut",
        type: "craft",
        description:
          "Re-cut the first line at the Keystone with the Warden's Stylus",
        resource_id: "resource_crafting_item_keystone_chip",
        amount: 1,
        progress: null,
      },
      {
        id: "tell_hollow",
        type: "talk",
        description: "Tell Hollow what you've done",
        entity_id: "npc_hollow",
        dialog_steps: [
          { entity_id: null, dialog: "I've re-cut the first line." },
          {
            entity_id: "npc_hollow",
            dialog:
              "I know. Every stone went hot at once, all round the ring, like a hand closing. The ground's gone quiet. It has never been quiet.",
          },
          {
            entity_id: "npc_hollow",
            dialog:
              "You chose your side of the jar. I'd have chosen mine. ... Go home. It's yours to go to.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ansel_morrow",
      message:
        "Then it holds. ... I thought I'd feel lighter. Here, the last thing I'll cut: a chip of the Keystone, closed round a thread of the Heart and set in Joss Wicken's steel. It knows the Heart's own shape, and it'll cost you nothing to carry. Look after Gill for me, from your side.",
      return_message: "It holds. Everything it holds in, it holds in.",
    },
    rewards: [
      { type: "item", item_id: "item_keystone_focus", amount: 1 },
      { type: "gold", amount: 200 },
    ],
    prerequisites: ["quest_across_the_line", "quest_what_the_ground_wants"],
    excludes: ["quest_break_the_first_line"],
  },
  {
    id: "quest_break_the_first_line",
    kind: "story",
    type: "crafting",
    name: "Break the First Line",
    description:
      "Hollow asks you to open the jar: unpick the Keystone's first line with a dibber and let the ring fall. Gill's people will walk out of the Bloom, and the Bloom will walk out with them. Once it's done, it can't be undone, and Ansel won't ask you to mend it.",
    giver: { entity_id: "npc_hollow" },
    objectives: [
      {
        id: "talk_hollow",
        type: "talk",
        description: "Speak with Hollow at the Threadwell",
        entity_id: "npc_hollow",
        dialog_steps: [
          {
            entity_id: "npc_hollow",
            dialog:
              "You've heard your stone-cutter. Now hear me, and then choose.",
          },
          {
            entity_id: "npc_hollow",
            dialog:
              "Open the first line and every stone goes quiet at once. My people walk to the holdfast and see the sheep. Gill walks Tam home. And the ground comes too: the Bloom goes down the valley a field at a time, and your people will learn to breathe it or grow with it, or leave.",
          },
          {
            entity_id: "npc_hollow",
            dialog:
              "The Keeper still keeps the line. While he stands, it answers him. Let him rest, then take your dibber to the Keystone and open the spurs from the inside, the way something grows. Then tell Gill. Gill asked to hear it first.",
          },
        ],
        progress: null,
      },
      {
        id: "rest_keeper",
        type: "kill",
        description: "Let the Heart-Warden rest",
        monster_id: "monster_heart_warden",
        count: 1,
        progress: null,
      },
      {
        id: "unpick",
        type: "craft",
        description:
          "Unpick the first line at the Keystone with the Chitin Dibber",
        resource_id: "resource_crafting_item_unpicked_spur",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_gill",
      message:
        "I felt the ground open before you got here, but I'm glad it was you who said it. ... Hollow grew you this from a seed of the well, the day the line opened. It's the Heart's own, and it breathes the Heart into you, same as everything we grow. Now: Tam.",
      return_message:
        "The stones are quiet. Listen. You can hear the whole valley.",
    },
    rewards: [
      { type: "item", item_id: "item_heartseed_wand", amount: 1 },
      { type: "gold", amount: 200 },
    ],
    prerequisites: ["quest_across_the_line", "quest_what_the_ground_wants"],
    excludes: ["quest_mend_the_first_line"],
  },
  {
    id: "quest_the_ring_holds",
    kind: "story",
    type: "dialog",
    name: "The Ring Holds",
    description:
      "The first line is re-cut and the ring holds. Gill felt it through the ground, and has a word for the holdfast.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description: "Speak with Gill at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: "npc_gill",
            dialog:
              "I felt it. The stones went hot all round, all at once, and the beds leaned away from the ring for an hour.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "You chose your people. I'd have chosen mine, and I don't hate you for it. ... Tell Tam I'll be at the Sixth Stone at dusk. On my side of it.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_tam",
        type: "talk",
        description: "Take Gill's word to Tam at the apothecary",
        entity_id: "npc_tam_reedsdaughter",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog: "At dusk? ... I'll take bread. Gill's never had bread.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Come with me? I don't want to walk up there on my own the first time.",
          },
        ],
        progress: null,
      },
      {
        id: "meet_at_sixth",
        type: "talk",
        description: "Go with Tam to the Sixth Stone",
        entity_id: "npc_tam_reedsdaughter",
        landmark: "landmark_sixth_stone",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog: "There. Just the other side, sitting in the moss.",
          },
          {
            entity_id: "npc_gill",
            dialog: "Is that bread? Put it on the stone. ... It's warm.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "I'll come up every dusk. It's not a sheep, but it's something.",
          },
          { entity_id: "npc_gill", dialog: "It's something." },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "Mended, and my Tam goes up to that stone every dusk to talk to a cousin who can't come down. ... It's what Annis had: a wall, and someone on the other side of it. At least Tam's talks back.",
      return_message: "Every dusk, like Annis at the gate.",
    },
    rewards: [
      { type: "gold", amount: 150 },
      { type: "item", item_id: "item_comfrey_salve", amount: 3 },
    ],
    prerequisites: ["quest_mend_the_first_line"],
  },
  {
    id: "quest_past_the_stones",
    kind: "story",
    type: "exploration",
    name: "Past the Stones",
    description:
      "The ring is open. Gill means to walk Tam home past the stones and see a sheep, and wants you along.",
    giver: { entity_id: "npc_gill" },
    objectives: [
      {
        id: "talk_gill",
        type: "talk",
        description: "Speak with Gill and Tam at the growing pit",
        entity_id: "npc_gill",
        dialog_steps: [
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog: "I came up at first light. I wasn't going to miss this.",
          },
          {
            entity_id: "npc_gill",
            dialog:
              "Walk with us. I've never been past the Sixth Stone, and I'd like someone along who has.",
          },
        ],
        progress: null,
      },
      {
        id: "past_sixth",
        type: "explore",
        description: "Walk Gill and Tam past the Sixth Stone",
        landmark: "landmark_sixth_stone",
        chance: 1,
        found_message:
          "At the Sixth Stone Gill stops, as Gill always has, and puts a hand out. The stone is cold and quiet. Gill's hand goes past it, and then Gill does, and Tam laughs out loud. Behind you the moss on the stone's inner face has already crept round to the outer.",
        progress: null,
      },
      {
        id: "gill_at_holdfast",
        type: "talk",
        description: "Bring Gill to the holdfast",
        entity_id: "npc_gill",
        landmark: "landmark_holdfast",
        dialog_steps: [
          { entity_id: "npc_gill", dialog: "That's a sheep." },
          { entity_id: null, dialog: "That's a sheep." },
          {
            entity_id: "npc_gill",
            dialog: "It's much stupider than I thought. I love it.",
          },
          {
            entity_id: "npc_tam_reedsdaughter",
            dialog:
              "Nell says the north ditch went white overnight, the whole length of it. She says it like it's my fault.",
          },
        ],
        progress: null,
      },
      {
        id: "talk_ansel",
        type: "talk",
        description: "Speak with Ansel Morrow at the holdfast",
        entity_id: "npc_ansel_morrow",
        landmark: "landmark_holdfast",
        dialog_steps: [
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "I stayed on Wick's bench. I thought someone should be here who knows what's coming. The Bloom will come down this valley now, and smudge fires and masks will only slow it. The company will have to learn to grow, or leave.",
          },
          {
            entity_id: "npc_ansel_morrow",
            dialog:
              "And Gill walked in at the gate. ... I never thought I'd see that. I'm glad I did.",
          },
        ],
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_old_wick",
      message:
        "Davy's child, in my yard, frightening the ewes. ... The ditch is white and there's a walker's child at my table, and I can't tell if we've been saved or finished. Both, maybe. Tam's happy. We'll double the smudge fires and see.",
      return_message: "Gill wants to learn to shear. Heaven help the sheep.",
    },
    rewards: [
      { type: "gold", amount: 150 },
      { type: "item", item_id: "item_thread_balm", amount: 2 },
    ],
    prerequisites: ["quest_break_the_first_line"],
  },
];

export const questsById = new Map<string, Quest>(quests.map((q) => [q.id, q]));
