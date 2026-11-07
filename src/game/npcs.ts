// NPCs and other things you can talk to, with dialogue and gift Pokemon.
// Dialogue lines can include {name}, which is replaced with the player's name.

import { GUIDE_SPOT, type MapId } from "./world";

export type SpecialAction = "givePokemon";

export interface NPCChoice {
  question: string;
  options: {
    label: string;
    action?: SpecialAction;
    pokemonId?: string; // when action === "givePokemon"
    responseLines: string[];
  }[];
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  mapId: MapId;
  x: number;
  y: number;
  color: string; // dialogue-box dot, and shirt colour for people
  hair: string;
  dialogue: string[];
  dialogueRepeat?: string[]; // shorter dialogue shown after the first full conversation
  legendaryReview?: string[]; // special path when player brings a legendary
  choice?: NPCChoice;
  repeatOffersChoice?: boolean; // show the choice again after the repeat dialogue
  givesPokemon?: string;
  // "pokemon" draws the species sprite instead of a person (e.g. Codey).
  sprite?: "person" | "pokemon";
  speciesId?: string;
  hideAfterGift?: boolean; // vanishes once its gift is taken (it joined your team)
}

export const npcs: NPC[] = [
  {
    id: "vardaan",
    name: "Vardaan",
    role: "Your guide",
    mapId: "campus",
    x: GUIDE_SPOT.x,
    y: GUIDE_SPOT.y,
    color: "#e11d48",
    hair: "#0f172a",
    givesPokemon: "honkling",
    dialogue: [
      "Hey {name}! I'm Vardaan. Welcome to UW.",
      "Walk with the arrow keys or WASD, and press Space or E to talk. On a phone, use the D-pad and the A button.",
      "The tall grass south of here is full of wild Pokemon. Walk through it and you'll run into them.",
      "Battles come down to level and type. Water beats fire, fire beats grass, grass beats water. Win and you catch the wild one.",
      "Catch one you already have and their levels stack, so duplicates make your team stronger.",
      "Never walk into the grass without a Pokemon, though. You'll faint and end up back here.",
      "North of E7 are the ION tracks. Only cross at the crossings, and wait if a train's coming.",
      "Past the tracks are DC, MC and SLC. MC is open, and I hear the CSC office inside has a surprise.",
      "Here, take this goose to get started. Every Waterloo student ends up with one eventually.",
    ],
    dialogueRepeat: [
      "Hey again, {name}.",
      "Head north across the ION tracks to MC. The CSC office is inside.",
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
    sprite: "pokemon",
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

export const npcsOnMap = (mapId: MapId): NPC[] => npcs.filter((n) => n.mapId === mapId);
