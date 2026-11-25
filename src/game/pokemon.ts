// Species, wild encounters, battle rules, levelling and team management.

export type PokemonType =
  | "electric"
  | "fire"
  | "water"
  | "grass"
  | "rock"
  | "flying"
  | "tech"
  | "legendary";

export interface PokemonSpecies {
  id: string;
  name: string;
  type: PokemonType;
  primary: string;
  secondary: string;
  shape: "blob" | "bug" | "sparky" | "aqua" | "brick" | "leaf" | "goose" | "codey";
  isLegendary?: boolean;
  // Only obtainable as a gift, so it can't grow by stacking duplicates.
  // These get a better chance to level up after a win.
  giftOnly?: boolean;
}

export interface Pokemon {
  species: PokemonSpecies;
  level: number;
  uid: string;
}

export const SPECIES: Record<string, PokemonSpecies> = {
  // Gifts
  honkling: {
    id: "honkling",
    name: "Honkling",
    type: "flying",
    primary: "#8a7a66",
    secondary: "#1a1a1a",
    shape: "goose",
    giftOnly: true,
  },
  codey: {
    id: "codey",
    name: "Codey",
    type: "water",
    primary: "#5aaff5",
    secondary: "#26285e",
    shape: "codey",
    giftOnly: true,
  },

  // Wild
  codeling: { id: "codeling", name: "Codeling", type: "tech", primary: "#38bdf8", secondary: "#0369a1", shape: "blob" },
  leafling: { id: "leafling", name: "Leafling", type: "grass", primary: "#4ade80", secondary: "#166534", shape: "leaf" },
  emberling: { id: "emberling", name: "Emberling", type: "fire", primary: "#fb923c", secondary: "#9a3412", shape: "blob" },
  aquapaw: { id: "aquapaw", name: "Aquapaw", type: "water", primary: "#60a5fa", secondary: "#1e40af", shape: "aqua" },
  sparkbee: { id: "sparkbee", name: "Sparkbee", type: "electric", primary: "#fde047", secondary: "#713f12", shape: "sparky" },
  weedie: { id: "weedie", name: "Weedie", type: "grass", primary: "#84cc16", secondary: "#365314", shape: "leaf" },
  skyling: { id: "skyling", name: "Skyling", type: "flying", primary: "#a5f3fc", secondary: "#0e7490", shape: "bug" },
  rockjaw: { id: "rockjaw", name: "Rockjaw", type: "rock", primary: "#a8a29e", secondary: "#44403c", shape: "brick" },

  // Legendary
  compileon: {
    id: "compileon",
    name: "Compileon",
    type: "legendary",
    primary: "#fde047",
    secondary: "#78350f",
    shape: "sparky",
    isLegendary: true,
  },
};

const WILD_POOL = ["leafling", "emberling", "aquapaw", "sparkbee", "weedie", "codeling", "skyling", "rockjaw"];
const LEGENDARY_ID = "compileon";
const LEGENDARY_CHANCE = 1 / 30;
const LEGENDARY_MIN_LEVEL = 12;
const LEGENDARY_MAX_LEVEL = 19;

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

let uidCounter = 1;
export const makePokemon = (speciesId: string, level = randomInt(1, 10)): Pokemon => {
  const species = SPECIES[speciesId];
  return { species, level, uid: `${species.id}-${uidCounter++}` };
};

export const rollWildEncounter = (): Pokemon => {
  if (Math.random() < LEGENDARY_CHANCE) {
    return makePokemon(LEGENDARY_ID, randomInt(LEGENDARY_MIN_LEVEL, LEGENDARY_MAX_LEVEL));
  }
  return makePokemon(WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)]);
};

// ============ BATTLES ============
// Each matchup compares effective level: level plus a bonus if your type beats
// theirs. Higher effective level wins, and ties go to the player.

const STRONG_AGAINST: Record<PokemonType, PokemonType[]> = {
  fire: ["grass"],
  water: ["fire", "rock"],
  grass: ["water", "rock"],
  rock: ["fire", "flying"],
  flying: ["grass"],
  electric: ["water", "flying"],
  tech: [],
  legendary: ["electric", "fire", "water", "grass", "rock", "flying", "tech"],
};

const TYPE_BONUS = 5;
const LEGENDARY_BONUS = 7;

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export interface BattleOutcome {
  outcome: "win" | "lose";
  explanation: string; // why a type advantage applied, empty if none did
}

export const resolveBattle = (yours: Pokemon, theirs: Pokemon): BattleOutcome => {
  const yourType = yours.species.type;
  const theirType = theirs.species.type;
  let yourBonus = 0;
  let theirBonus = 0;
  let explanation = "";

  if (STRONG_AGAINST[yourType].includes(theirType)) {
    yourBonus = yourType === "legendary" ? LEGENDARY_BONUS : TYPE_BONUS;
    explanation =
      yourType === "legendary"
        ? `${yours.species.name} is a legendary. Its power overwhelms ${theirs.species.name}.`
        : `${capitalize(yourType)} is strong against ${capitalize(theirType)}. ${yours.species.name} hits harder!`;
  } else if (STRONG_AGAINST[theirType].includes(yourType)) {
    theirBonus = theirType === "legendary" ? LEGENDARY_BONUS : TYPE_BONUS;
    explanation =
      theirType === "legendary"
        ? `${theirs.species.name} is a legendary. It'll take everything to bring it down.`
        : `${capitalize(theirType)} is strong against ${capitalize(yourType)}. ${yours.species.name} struggles!`;
  }

  const outcome = yours.level + yourBonus >= theirs.level + theirBonus ? "win" : "lose";
  return { outcome, explanation };
};

// ============ LEVELLING ============

export const MAX_LEVEL = 99;
const LEVEL_UP_CHANCE = 1 / 4;
const GIFT_ONLY_LEVEL_UP_CHANCE = 1 / 2;

// After a win, every Pokemon that fought rolls once to gain a level.
// Returns the ones that do. `random` can be swapped out in tests.
export const rollLevelUps = (participants: Pokemon[], random: () => number = Math.random): Pokemon[] =>
  participants.filter(
    (p) =>
      p.level < MAX_LEVEL &&
      random() < (p.species.giftOnly ? GIFT_ONLY_LEVEL_UP_CHANCE : LEVEL_UP_CHANCE)
  );

// Catching a species you already have adds its level to the one on your team.
export const addToTeam = (team: Pokemon[], caught: Pokemon): Pokemon[] => {
  const existing = team.findIndex((p) => p.species.id === caught.species.id);
  if (existing === -1) return [...team, caught];
  return team.map((p, i) =>
    i === existing ? { ...p, level: Math.min(MAX_LEVEL, p.level + caught.level) } : p
  );
};

export const hasLegendary = (team: Pokemon[]): boolean => team.some((p) => p.species.isLegendary);
