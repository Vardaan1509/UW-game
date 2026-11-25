// Everyone you can talk to: dialogue, gifts, wandering and trainer battles.
// Dialogue lines can include {name}, which becomes the player's name.

import { GUIDE_SPOT, MAPS, SPAWN, isSolid, type Direction, type MapId } from "./world";
import { SPECIES } from "./pokemon";
import type { OutfitStyle } from "./sprites";

export interface NPCChoice {
  question: string;
  options: {
    label: string;
    startsBattle?: boolean;
    responseLines: string[];
  }[];
}

// The tiles a wandering NPC stays on: columns x to x + w - 1, rows y to y + h - 1.
export interface WanderArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrainerBattle {
  pokemonId: string;
  level: number;
  winLines: string[]; // after you beat them (they hand over a Repel Spray)
  loseLines: string[]; // after they beat you
  defeatedLines: string[]; // talking to them again once beaten
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  mapId: MapId;
  x: number; // starting tile
  y: number;
  facing?: Direction; // defaults to facing down
  color: string; // shirt colour, and the dot in the dialogue box
  hair: string;
  outfit?: OutfitStyle;
  dialogue: string[];
  dialogueRepeat?: string[]; // shown instead of `dialogue` after the first conversation
  legendaryReview?: string[]; // shown once when the player brings a legendary
  choice?: NPCChoice;
  repeatOffersChoice?: boolean; // offer the choice again after `dialogueRepeat`
  givesPokemon?: string;
  speciesId?: string; // drawn as this Pokemon instead of a person
  hideAfterGift?: boolean; // disappears once its gift is taken
  wander?: WanderArea;
  trainer?: TrainerBattle;
}

// ============ PEOPLE WHO WALK AROUND ============

const student = (
  id: string,
  name: string,
  role: string,
  mapId: MapId,
  start: [number, number],
  area: WanderArea,
  look: { color: string; hair: string },
  dialogue: string[]
): NPC => ({
  id,
  name,
  role,
  mapId,
  x: start[0],
  y: start[1],
  color: look.color,
  hair: look.hair,
  outfit: "casual",
  dialogue,
  wander: area,
});

const wanderers: NPC[] = [
  student(
    "alex", "Alex", "1A Computer Science", "campus", [12, 7],
    { x: 2, y: 7, w: 14, h: 3 },
    { color: "#f59e0b", hair: "#3b2416" },
    ["I'm heading to DC to find a study spot. Wish me luck, it's always packed."]
  ),
  student(
    "sam", "Sam", "2B Software Engineering", "campus", [24, 8],
    { x: 22, y: 7, w: 9, h: 3 },
    { color: "#10b981", hair: "#111827" },
    ["Is the ION late again? I swear it was just here.", "Cross at the crossings, by the way. People keep trying to cut across the tracks."]
  ),
  student(
    "lena", "Lena", "3A Mathematics", "campus", [3, 13],
    { x: 2, y: 13, w: 14, h: 2 },
    { color: "#ec4899", hair: "#6b3a1f" },
    ["I have a midterm in an hour and I'm out here talking to you.", "Water beats fire. That's honestly all I remember about Pokemon."]
  ),
  student(
    "omar", "Omar", "4B Computer Engineering", "campus", [30, 14],
    { x: 24, y: 13, w: 14, h: 2 },
    { color: "#6366f1", hair: "#0f172a" },
    ["Co-op applications close tonight. I've rewritten my resume six times."]
  ),
  student(
    "kai", "Kai", "2A Physics", "campus", [28, 16],
    { x: 24, y: 15, w: 14, h: 6 },
    { color: "#0ea5e9", hair: "#fde68a" },
    ["The geese have been extra aggressive this term. Watch your back near the pond."]
  ),
  student(
    "nina", "Nina", "1B Biology", "campus", [5, 16],
    { x: 1, y: 15, w: 14, h: 6 },
    { color: "#a855f7", hair: "#1f2937" },
    ["If you beat a trainer, they might give you a Repel Spray.", "Use it before walking through the tall grass and the wild Pokemon leave you alone for a bit."]
  ),
  student(
    "theo", "Theo", "3B Architecture", "campus", [20, 27],
    { x: 2, y: 27, w: 36, h: 2 },
    { color: "#ef4444", hair: "#78350f" },
    ["Nobody comes down here. It's the quietest spot on campus.", "Well, apart from the Pokemon in the grass."]
  ),
  student(
    "ravi", "Ravi", "4A Statistics", "campus", [15, 1],
    { x: 2, y: 1, w: 36, h: 2 },
    { color: "#84cc16", hair: "#111827" },
    ["I take the long way around the buildings. Fewer geese."]
  ),
  student(
    "zoe", "Zoe", "2A Computer Science", "mc", [15, 6],
    { x: 3, y: 3, w: 16, h: 7 },
    { color: "#f97316", hair: "#1f2937" },
    ["Have you been to the CSC office? It's the door with the sign on it.", "The upper floors are closed today, so it's pretty quiet in here."]
  ),
];

// ============ TRAINERS ============
// They stand still and ask for a battle, and give a Repel Spray when beaten.
// Levels rise the further they are from the start.

const trainer = (
  id: string,
  name: string,
  role: string,
  mapId: MapId,
  start: [number, number],
  facing: Direction,
  look: { color: string; hair: string },
  challenge: string[],
  battle: TrainerBattle
): NPC => ({
  id,
  name,
  role,
  mapId,
  x: start[0],
  y: start[1],
  facing,
  color: look.color,
  hair: look.hair,
  outfit: "trainer",
  dialogue: challenge,
  dialogueRepeat: ["Back for that battle?"],
  repeatOffersChoice: true,
  choice: {
    question: `Battle ${name}?`,
    options: [
      { label: "Battle!", startsBattle: true, responseLines: [] },
      { label: "Not now", responseLines: ["No worries. I'll be right here."] },
    ],
  },
  trainer: battle,
});

const trainers: NPC[] = [
  trainer(
    "jordan", "Jordan", "Trainer", "campus", [13, 20], 3,
    { color: "#22c55e", hair: "#3b2416" },
    ["Hey! You look new. I just caught my first Pokemon.", "Want to battle? I'll go easy on you."],
    {
      pokemonId: "leafling",
      level: 3,
      winLines: ["Wow, you're good! Here, take this Repel Spray."],
      loseLines: ["Ha, I won! Catch a few more Pokemon and try again."],
      defeatedLines: ["Good battle! I'm going to go train in the grass."],
    }
  ),
  trainer(
    "maya", "Maya", "Trainer", "campus", [9, 12], 0,
    { color: "#f97316", hair: "#111827" },
    ["My Emberling has been training all term.", "Think you can handle some fire?"],
    {
      pokemonId: "emberling",
      level: 6,
      winLines: ["Put out by a rookie. Fine, here's a Repel Spray."],
      loseLines: ["Too hot to handle? Water beats fire, just saying."],
      defeatedLines: ["I'll get you next time."],
    }
  ),
  trainer(
    "marcus", "Marcus", "Trainer", "campus", [37, 7], 2,
    { color: "#3b82f6", hair: "#0f172a" },
    ["The SLC is my turf.", "Nobody gets past me without a battle."],
    {
      pokemonId: "aquapaw",
      level: 9,
      winLines: ["Okay, okay, you can pass. Take this Repel Spray."],
      loseLines: ["Not today! Come back with a stronger team."],
      defeatedLines: ["The SLC is your turf now, I guess."],
    }
  ),
  trainer(
    "dev", "Dev", "Trainer", "campus", [37, 27], 2,
    { color: "#78716c", hair: "#1f2937" },
    ["You found me. I train down here where it's quiet.", "My Rockjaw doesn't lose often."],
    {
      pokemonId: "rockjaw",
      level: 12,
      winLines: ["Didn't see that coming. You earned this Repel Spray."],
      loseLines: ["Rock beats flying. Something to think about."],
      defeatedLines: ["Back to training. You were tough."],
    }
  ),
  trainer(
    "aisha", "Aisha", "CSC Member", "mc", [17, 4], 2,
    { color: "#eab308", hair: "#111827" },
    ["I'm on my way to the CSC office, but I've always got time for a battle.", "Fair warning: Sparkbee is fast."],
    {
      pokemonId: "sparkbee",
      level: 14,
      winLines: ["Impressive. Here's a Repel Spray. Say hi to Codey for me."],
      loseLines: ["Electric beats water and flying. You'll need a different plan."],
      defeatedLines: ["You're the strongest trainer I've seen on campus."],
    }
  ),
];

// ============ STORY NPCS ============

const storyNPCs: NPC[] = [
  {
    id: "vardaan",
    name: "Vardaan",
    role: "Your guide",
    mapId: "campus",
    x: GUIDE_SPOT.x,
    y: GUIDE_SPOT.y,
    color: "#e11d48",
    hair: "#0f172a",
    outfit: "trainer",
    givesPokemon: "honkling",
    dialogue: [
      "Hey {name}! I'm Vardaan. Welcome to UW.",
      "Walk with the arrow keys or WASD, and press Space or E to talk. On a phone, use the D-pad and the A button.",
      "The tall grass south of here is full of wild Pokemon. Walk through it and you'll run into them.",
      "Battles come down to level and type. Water beats fire, fire beats grass, grass beats water. Win and you catch the wild one.",
      "Catch one you already have and their levels stack, so duplicates make your team stronger.",
      "Every Pokemon that fights in a battle you win might also gain a level.",
      "Never walk into the grass without a Pokemon, though. You'll faint and end up back here.",
      "Trainers around campus will battle you. Beat them and they'll give you a Repel Spray.",
      "North of E7 are the ION tracks. Only cross at the crossings, and wait if a train's coming.",
      "Past the tracks are DC, MC and SLC. MC is open, and I hear the CSC office inside has a surprise.",
      "There's also a tunnel from MC to PAC, where the gym is.",
      "And if you ever catch a legendary Pokemon, bring it back here to me.",
      "Here, take this goose to get started. Every Waterloo student ends up with one eventually.",
    ],
    dialogueRepeat: [
      "Hey again, {name}.",
      "Head north across the ION tracks to MC. The CSC office is inside, and the tunnel to PAC.",
    ],
    legendaryReview: [
      "Wait. {name}, is that a Compileon on your team?",
      "Nobody catches one of those. I've been here for years and I've never seen one.",
      "This belongs in the CSC Hall of Fame.",
      "What name should go on your plaque?",
    ],
  },
  {
    id: "codey",
    name: "Codey",
    role: "CSC mascot",
    mapId: "csc",
    x: 6,
    y: 4,
    color: "#5aaff5",
    hair: "#5aaff5",
    speciesId: "codey",
    givesPokemon: "codey",
    hideAfterGift: true,
    dialogue: [
      "A blue creature with big round glasses is sitting on the rug.",
      "It's Codey, the Computer Science Club's mascot!",
      "Codey looks you over, then trots to your side. Codey wants to join your team!",
    ],
  },
];

export const npcs: NPC[] = [...storyNPCs, ...trainers, ...wanderers];

const NPCS_BY_MAP = Object.fromEntries(
  Object.keys(MAPS).map((id) => [id, npcs.filter((n) => n.mapId === id)])
) as Record<MapId, NPC[]>;

export const npcsOnMap = (mapId: MapId): NPC[] => NPCS_BY_MAP[mapId];

// Fail fast on placement mistakes instead of finding them in-game.
const validateNPCs = () => {
  const taken = new Set<string>();
  for (const n of npcs) {
    const tile = MAPS[n.mapId].tiles[n.y]?.[n.x];
    if (tile === undefined || isSolid(tile)) {
      throw new Error(`NPC ${n.id} starts on a solid tile at ${n.x},${n.y}`);
    }
    const key = `${n.mapId}:${n.x},${n.y}`;
    if (taken.has(key)) throw new Error(`Two NPCs start on ${key}`);
    taken.add(key);
    if (n.mapId === "campus" && n.x === SPAWN.x && n.y === SPAWN.y) {
      throw new Error(`NPC ${n.id} starts on the player's spawn`);
    }
    const a = n.wander;
    if (a && (n.x < a.x || n.x >= a.x + a.w || n.y < a.y || n.y >= a.y + a.h)) {
      throw new Error(`NPC ${n.id} starts outside its wander area`);
    }
    for (const id of [n.trainer?.pokemonId, n.givesPokemon, n.speciesId]) {
      if (id && !SPECIES[id]) throw new Error(`NPC ${n.id} refers to unknown Pokemon ${id}`);
    }
  }
};
validateNPCs();
