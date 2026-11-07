import { useEffect, useRef, useState, useCallback } from "react";
import { Keyboard, Volume2, VolumeX } from "lucide-react";
import {
  TILE_SIZE,
  MAPS,
  SPAWN,
  isSolid,
  isTallGrass,
  buildingAt,
  warpAt,
  bumpMessage,
  examineMessage,
  type Direction,
  type MapId,
  type Warp,
} from "./world";
import {
  drawTileCached,
  drawCharacter,
  drawBuildingLabel,
  drawMapLabel,
  drawPokemon,
  drawTrain,
  drawCrossingLights,
  type OutfitStyle,
} from "./sprites";
import { npcs, npcsOnMap, type NPC } from "./npcs";
import {
  makePokemon,
  rollWildEncounter,
  addToTeam,
  hasLegendary,
  SPECIES,
  type Pokemon,
} from "./pokemon";
import { sounds } from "./sounds";
import BattleScreen from "./BattleScreen";
import PokemonHUD from "./PokemonHUD";
import NamePromptModal from "./NamePromptModal";
import TouchControls, { type TouchDir } from "./TouchControls";

const DIRS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: 1 },
  1: { dx: 0, dy: -1 },
  2: { dx: -1, dy: 0 },
  3: { dx: 1, dy: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { 0: 1, 1: 0, 2: 3, 3: 2 };

const MOVE_MS = 160;
const CUSTOM_NPC_MOVE_MS = 260;
const ENCOUNTER_CHANCE = 0.28;
const REPELLENT_MS = 30_000;
const CUSTOM_NPC_SPAWN = { x: 18, y: 12 };
const FADE_MS = 200;
const TOAST_MS = 2400;
const BUMP_COOLDOWN_MS = 1200;

// ============ NPC MOVEMENT ============

const NPC_MOVE_MS = 300; // NPCs stroll a bit slower than the player
const NPC_PAUSE_MIN_MS = 1200;
const NPC_PAUSE_MAX_MS = 3800;
const NPC_LOOK_AROUND_CHANCE = 0.3; // sometimes they just turn instead of stepping
const NPC_TALK_PAUSE_MS = 2500; // stay put for a moment after talking to you

interface NPCState {
  tileX: number;
  tileY: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  moveStart: number;
  moving: boolean;
  facing: Direction;
  walkFrame: number;
  nextMoveAt: number;
}

const createNPCStates = (now: number): Record<string, NPCState> =>
  Object.fromEntries(
    npcs.map((n) => [
      n.id,
      {
        tileX: n.x,
        tileY: n.y,
        fromX: n.x,
        fromY: n.y,
        toX: n.x,
        toY: n.y,
        moveStart: 0,
        moving: false,
        facing: n.facing ?? 0,
        walkFrame: 0,
        nextMoveAt: now + 1000 + Math.random() * 3000,
      },
    ])
  );

// Tiles next to a door or exit. Wanderers keep off them so they never block one.
const WARP_FRONTS = Object.fromEntries(
  Object.values(MAPS).map((m) => [
    m.id,
    new Set(
      m.warps.flatMap((w) =>
        [
          [w.x + 1, w.y],
          [w.x - 1, w.y],
          [w.x, w.y + 1],
          [w.x, w.y - 1],
        ].map(([x, y]) => `${x},${y}`)
      )
    ),
  ])
) as Record<MapId, Set<string>>;

// ============ ION TRAINS ============

const TRAIN_LENGTH = 6; // tiles
const TRAIN_SPEED = 6; // tiles per second
const TRAIN_IDLE_MIN_MS = 4000;
const TRAIN_IDLE_MAX_MS = 10000;
const TRAIN_ENTRY_MARGIN = 2.5; // can't step onto a crossing with a train this close
const TRAIN_LIGHTS_MARGIN = 7; // crossing lights flash when a train is this close
const TRAIN_BELL_RANGE = 9; // you hear the bell within this many rows of the tracks

interface Train {
  row: number;
  dir: 1 | -1;
  x: number; // left edge, in tiles
  running: boolean;
  idleUntil: number;
}

const randomIdle = () =>
  TRAIN_IDLE_MIN_MS + Math.random() * (TRAIN_IDLE_MAX_MS - TRAIN_IDLE_MIN_MS);

const createTrains = (now: number): Train[] =>
  MAPS.campus.trackRows.map((row, i) => ({
    row,
    // North track runs west, south track runs east.
    dir: (i === 0 ? -1 : 1) as 1 | -1,
    x: 0,
    running: false,
    idleUntil: now + 2000 + i * 3500,
  }));

// True when the train covers column tileX or is within `margin` tiles of it.
const trainNear = (t: Train, tileX: number, margin: number) =>
  t.running && t.x < tileX + 1 + margin && t.x + TRAIN_LENGTH > tileX - margin;

// ============ DIALOGUE ============

interface DialogueState {
  npc: NPC;
  line: number;
  extraLines: string[] | null;
  choiceShown: boolean;
  finished: boolean;
  isLegendaryReview?: boolean;
  isRepeat?: boolean; // extraLines are the NPC's repeat dialogue
  openedAt?: number; // used to ignore the tap that opened the dialogue
}

// The choice shows at the end of the first conversation, or at the end of the
// repeat conversation for NPCs that re-offer it.
const choiceAvailable = (s: DialogueState): boolean =>
  !!s.npc.choice && (!s.extraLines || (!!s.isRepeat && !!s.npc.repeatOffersChoice));

// A tap on the A button opens a dialogue, and on mobile the trailing click can
// land on the dialogue box and skip the first line. Ignore advances this soon.
const OPEN_GUARD_MS = 350;

interface CustomNPC {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  moveStart: number;
  moving: boolean;
  facing: Direction;
  walkFrame: number;
  color: string;
  hair: string;
  outfit: OutfitStyle;
  lastMoveTime: number;
  lastGreetTime: number;
}

const CUSTOM_NPC_COLORS = ["#f87171", "#60a5fa", "#a3e635", "#fbbf24", "#c084fc"];

const ExploreGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [team, setTeam] = useState<Pokemon[]>([]);
  // `trainer` is set for trainer battles; otherwise it's a wild encounter.
  const [battle, setBattle] = useState<{ team: Pokemon[]; wild: Pokemon; trainer?: NPC } | null>(
    null
  );
  const [repels, setRepels] = useState(0);
  const [muted, setMuted] = useState(() => sounds.isMuted());
  const [toast, setToast] = useState<string | null>(null);
  const [fainted, setFainted] = useState(false);
  const [repellentExpires, setRepellentExpires] = useState<number | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  // null until the player enters a name on the opening screen.
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [customNPCs, setCustomNPCs] = useState<CustomNPC[]>([]);
  const [legendaryReviewed, setLegendaryReviewed] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [fading, setFading] = useState(false);

  const talkedTo = useRef<Set<string>>(new Set());
  const giftGiven = useRef<Set<string>>(new Set());
  const defeatedTrainers = useRef<Set<string>>(new Set());
  const npcStateRef = useRef<Record<string, NPCState> | null>(null);
  if (npcStateRef.current === null) npcStateRef.current = createNPCStates(performance.now());
  const repelsRef = useRef(0);
  repelsRef.current = repels;

  const playerRef = useRef({
    tileX: SPAWN.x,
    tileY: SPAWN.y,
    facing: SPAWN.facing as Direction,
    fromX: SPAWN.x,
    fromY: SPAWN.y,
    toX: SPAWN.x,
    toY: SPAWN.y,
    moveStart: 0,
    moving: false,
    walkFrame: 0,
  });
  const mapIdRef = useRef<MapId>("campus");
  const trainsRef = useRef<Train[] | null>(null);
  if (trainsRef.current === null) trainsRef.current = createTrains(performance.now());
  const keysRef = useRef<Set<string>>(new Set());
  const animFrameRef = useRef(0);
  const dialogueRef = useRef<DialogueState | null>(null);
  dialogueRef.current = dialogue;
  const battleRef = useRef<typeof battle>(null);
  battleRef.current = battle;
  const teamRef = useRef<Pokemon[]>([]);
  teamRef.current = team;
  const faintedRef = useRef(false);
  faintedRef.current = fainted;
  const repellentExpiresRef = useRef<number | null>(null);
  repellentExpiresRef.current = repellentExpires;
  const customNPCsRef = useRef<CustomNPC[]>([]);
  customNPCsRef.current = customNPCs;
  const legendaryReviewedRef = useRef(false);
  legendaryReviewedRef.current = legendaryReviewed;
  const showNamePromptRef = useRef(false);
  showNamePromptRef.current = showNamePrompt;
  const playerNameRef = useRef<string | null>(null);
  playerNameRef.current = playerName;
  const fadingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const lastBumpRef = useRef({ text: "", at: 0 });

  // Detect touch-capable devices to show on-screen controls.
  useEffect(() => {
    const coarse =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window);
    setIsTouch(!!coarse);
  }, []);

  // Unlock audio on the first real user gesture. pointerup/touchend/keydown
  // count as user activation on mobile; pointerdown from a finger does not.
  useEffect(() => {
    const unlock = () => sounds.unlock();
    const events = ["pointerup", "touchend", "keydown", "click"] as const;
    events.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, unlock));
  }, []);

  // Map a touch direction to the same key the movement loop already listens for.
  const TOUCH_KEY: Record<TouchDir, string> = {
    up: "arrowup",
    down: "arrowdown",
    left: "arrowleft",
    right: "arrowright",
  };
  const pressDir = useCallback((dir: TouchDir) => {
    keysRef.current.add(TOUCH_KEY[dir]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const releaseDir = useCallback((dir: TouchDir) => {
    keysRef.current.delete(TOUCH_KEY[dir]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If a battle or name prompt begins while a D-pad direction is held, the touch
  // controls unmount before their pointer-up fires. Clear any held keys so the
  // player doesn't keep walking after returning to the map.
  useEffect(() => {
    if (battle || showNamePrompt || playerName === null) {
      keysRef.current.clear();
    }
  }, [battle, showNamePrompt, playerName]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // Toast for walking into something. Holding a direction against a locked door
  // calls this every frame, so repeats of the same message are throttled.
  const bump = useCallback(
    (text: string) => {
      const now = performance.now();
      const last = lastBumpRef.current;
      if (last.text === text && now - last.at < BUMP_COOLDOWN_MS) return;
      lastBumpRef.current = { text, at: now };
      showToast(text);
    },
    [showToast]
  );

  const placePlayer = useCallback((x: number, y: number, facing: Direction) => {
    const p = playerRef.current;
    p.tileX = x;
    p.tileY = y;
    p.fromX = x;
    p.fromY = y;
    p.toX = x;
    p.toY = y;
    p.moving = false;
    p.facing = facing;
  }, []);

  const respawn = useCallback(() => {
    mapIdRef.current = "campus";
    placePlayer(SPAWN.x, SPAWN.y, SPAWN.facing);
  }, [placePlayer]);

  // Fade to black, move to the warp's destination, fade back in.
  const warpTo = useCallback(
    (w: Warp) => {
      if (fadingRef.current) return;
      fadingRef.current = true;
      setFading(true);
      sounds.door();
      window.setTimeout(() => {
        mapIdRef.current = w.to;
        placePlayer(w.toX, w.toY, w.facing);
        showToast(MAPS[w.to].name);
        // Let the new map draw one frame before fading back in.
        requestAnimationFrame(() => {
          setFading(false);
          fadingRef.current = false;
        });
      }, FADE_MS);
    },
    [placePlayer, showToast]
  );

  // The NPC standing on (x, y), using their live position. A walking NPC
  // occupies both the tile they're leaving and the tile they're heading to.
  // NPCs that joined your team are skipped.
  const npcAt = useCallback((x: number, y: number, mapId: MapId = mapIdRef.current) => {
    return npcsOnMap(mapId).find((n) => {
      if (n.hideAfterGift && giftGiven.current.has(n.id)) return false;
      const s = npcStateRef.current![n.id];
      return (s.tileX === x && s.tileY === y) || (s.moving && s.fromX === x && s.fromY === y);
    });
  }, []);

  const findCustomNPCAt = useCallback((x: number, y: number): CustomNPC | undefined => {
    if (mapIdRef.current !== "campus") return undefined;
    return customNPCsRef.current.find((c) => c.tileX === x && c.tileY === y);
  }, []);

  const startEncounter = useCallback(() => {
    // Skip encounters while repellent is active
    if (repellentExpiresRef.current && Date.now() < repellentExpiresRef.current) {
      return;
    }
    const roster = teamRef.current;
    if (roster.length === 0) {
      sounds.faint();
      setFainted(true);
      setTimeout(() => {
        respawn();
        setFainted(false);
        showToast("You fainted with no Pokemon! Talk to Vardaan outside E7 first.");
      }, 900);
      return;
    }
    const wild = rollWildEncounter();
    sounds.encounter();
    setBattle({ team: roster, wild });
  }, [respawn, showToast]);

  const onStepComplete = useCallback(() => {
    const p = playerRef.current;
    const tile = MAPS[mapIdRef.current].tiles[p.tileY]?.[p.tileX];
    if (tile && isTallGrass(tile) && Math.random() < ENCOUNTER_CHANCE) {
      startEncounter();
    }
  }, [startEncounter]);

  const tryMove = useCallback(
    (direction: Direction) => {
      const p = playerRef.current;
      if (p.moving || fadingRef.current) return;
      p.facing = direction;
      const map = MAPS[mapIdRef.current];
      const { dx, dy } = DIRS[direction];
      const nx = p.tileX + dx;
      const ny = p.tileY + dy;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return;

      const warp = warpAt(map, nx, ny);
      if (warp) {
        warpTo(warp);
        return;
      }
      const tile = map.tiles[ny][nx];
      if (isSolid(tile)) {
        const msg = bumpMessage(map, nx, ny);
        if (msg) bump(msg);
        return;
      }
      if (npcAt(nx, ny)) return;
      if (findCustomNPCAt(nx, ny)) return;
      if (tile === "trackCrossing") {
        const train = trainsRef.current!.find((t) => t.row === ny);
        if (train && trainNear(train, nx, TRAIN_ENTRY_MARGIN)) {
          bump("Wait for the ION to pass!");
          return;
        }
      }

      p.fromX = p.tileX;
      p.fromY = p.tileY;
      p.toX = nx;
      p.toY = ny;
      p.tileX = nx;
      p.tileY = ny;
      p.moveStart = performance.now();
      p.moving = true;
      p.walkFrame = p.walkFrame === 0 ? 1 : 0;
      sounds.step();
    },
    [bump, findCustomNPCAt, npcAt, warpTo]
  );

  const finishDialogueWithNPC = useCallback(
    (npc: NPC) => {
      if (npc.givesPokemon && !giftGiven.current.has(npc.id)) {
        giftGiven.current.add(npc.id);
        const pk = makePokemon(npc.givesPokemon);
        setTeam((prev) => addToTeam(prev, pk));
        sounds.give();
        showToast(`Got ${pk.species.name} (Lv ${pk.level})!`);
      }
    },
    [showToast]
  );

  const advanceDialogue = useCallback(() => {
    const state = dialogueRef.current;
    if (!state) return;
    if (state.openedAt && performance.now() - state.openedAt < OPEN_GUARD_MS) return;

    const currentLines = state.extraLines ?? state.npc.dialogue;
    const isLast = state.line >= currentLines.length - 1;

    if (!isLast) {
      setDialogue({ ...state, line: state.line + 1 });
      sounds.talk();
      return;
    }

    if (choiceAvailable(state) && !state.choiceShown) {
      setDialogue({ ...state, choiceShown: true });
      return;
    }

    // Close
    const finishingNPC = state.npc;
    const wasLegendaryReview = !!state.isLegendaryReview;
    setDialogue(null);
    talkedTo.current.add(finishingNPC.id);
    if (!finishingNPC.choice) {
      finishDialogueWithNPC(finishingNPC);
    }
    if (wasLegendaryReview) {
      setLegendaryReviewed(true);
      setShowNamePrompt(true);
    }
  }, [finishDialogueWithNPC]);

  const chooseOption = useCallback(
    (optionIndex: number) => {
      const state = dialogueRef.current;
      if (!state || !state.npc.choice) return;
      const option = state.npc.choice.options[optionIndex];
      sounds.select();
      if (option.action === "battle" && state.npc.trainer) {
        if (teamRef.current.length === 0) {
          setDialogue({
            ...state,
            line: 0,
            extraLines: ["You don't have any Pokemon yet! Talk to Vardaan outside E7 first."],
            choiceShown: false,
            isRepeat: false,
          });
          return;
        }
        talkedTo.current.add(state.npc.id);
        setDialogue(null);
        sounds.encounter();
        setBattle({
          team: teamRef.current,
          wild: makePokemon(state.npc.trainer.pokemonId, state.npc.trainer.level),
          trainer: state.npc,
        });
        return;
      }
      if (option.action === "givePokemon" && option.pokemonId) {
        const npc = state.npc;
        if (!giftGiven.current.has(npc.id)) {
          giftGiven.current.add(npc.id);
          const pk = makePokemon(option.pokemonId);
          setTeam((prev) => addToTeam(prev, pk));
          sounds.give();
          showToast(`Got ${pk.species.name} (Lv ${pk.level})!`);
        }
      }
      setDialogue({
        ...state,
        line: 0,
        extraLines: option.responseLines,
        choiceShown: false,
        isRepeat: false,
      });
    },
    [showToast]
  );

  const openCustomNPCDialogue = useCallback((custom: CustomNPC) => {
    const tempNPC: NPC = {
      id: `custom-${custom.id}`,
      name: custom.name,
      role: "Trainer",
      mapId: "campus",
      x: custom.tileX,
      y: custom.tileY,
      color: custom.color,
      hair: custom.hair,
      dialogue: [
        `Hey! I'm ${custom.name}.`,
        "I got added to the trainer registry after catching a Compileon.",
        "Good luck out there.",
      ],
    };
    sounds.talk();
    setDialogue({
      npc: tempNPC,
      line: 0,
      extraLines: null,
      choiceShown: false,
      finished: false,
      openedAt: performance.now(),
    });
  }, []);

  const interact = useCallback(() => {
    if (dialogueRef.current) {
      if (dialogueRef.current.choiceShown) return;
      advanceDialogue();
      return;
    }
    if (fadingRef.current) return;
    const p = playerRef.current;
    const map = MAPS[mapIdRef.current];
    const { dx, dy } = DIRS[p.facing];
    const nx = p.tileX + dx;
    const ny = p.tileY + dy;

    const npc = npcAt(nx, ny);
    if (npc) {
      sounds.talk();
      // Turn to face the player, and don't wander off mid-conversation.
      const s = npcStateRef.current![npc.id];
      s.facing = OPPOSITE[p.facing];
      s.nextMoveAt = performance.now() + NPC_TALK_PAUSE_MS;
      // Trainers you've already beaten just chat.
      if (npc.trainer && defeatedTrainers.current.has(npc.id)) {
        setDialogue({
          npc,
          line: 0,
          extraLines: npc.trainer.defeatedLines,
          choiceShown: false,
          finished: false,
          isRepeat: false,
          openedAt: performance.now(),
        });
        return;
      }
      // Legendary review: an NPC with legendaryReview lines reacts once you've
      // met them and brought a legendary. No NPC uses this in the current map.
      if (
        npc.legendaryReview &&
        talkedTo.current.has(npc.id) &&
        !legendaryReviewedRef.current &&
        hasLegendary(teamRef.current)
      ) {
        setDialogue({
          npc,
          line: 0,
          extraLines: npc.legendaryReview,
          choiceShown: false,
          finished: false,
          isLegendaryReview: true,
          openedAt: performance.now(),
        });
        return;
      }
      const useRepeat = talkedTo.current.has(npc.id) && !!npc.dialogueRepeat;
      setDialogue({
        npc,
        line: 0,
        extraLines: useRepeat ? npc.dialogueRepeat! : null,
        choiceShown: false,
        finished: false,
        isRepeat: useRepeat,
        openedAt: performance.now(),
      });
      return;
    }

    const custom = findCustomNPCAt(nx, ny);
    if (custom) {
      openCustomNPCDialogue(custom);
      return;
    }

    // Look at whatever you're facing (doors you can enter are left alone).
    if (!warpAt(map, nx, ny)) {
      const msg = examineMessage(map, nx, ny);
      if (msg) showToast(msg);
    }
  }, [advanceDialogue, findCustomNPCAt, npcAt, openCustomNPCDialogue, showToast]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Let text fields (the trainer-name input) receive keys normally.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "e", "enter"].includes(k)
      ) {
        e.preventDefault();
      }
      keysRef.current.add(k);
      if (
        battleRef.current ||
        faintedRef.current ||
        showNamePromptRef.current ||
        playerNameRef.current === null
      )
        return;
      if (k === " " || k === "e" || k === "enter") interact();
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [interact]);

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      // Cap DPR at 1.5: the art is chunky pixel art, so higher density just
      // burns fill-rate and causes choppiness on mobile with no visual gain.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Move the ION trains. They keep running while you're indoors, but only
  // stop for the player when the player is on campus.
  const updateTrains = useCallback((now: number, dt: number) => {
    const width = MAPS.campus.width;
    const p = playerRef.current;
    const onCampus = mapIdRef.current === "campus";
    for (const t of trainsRef.current!) {
      if (!t.running) {
        if (now >= t.idleUntil) {
          t.running = true;
          t.x = t.dir === 1 ? -TRAIN_LENGTH - 1 : width + 1;
          if (onCampus && Math.abs(p.tileY - t.row) <= TRAIN_BELL_RANGE) sounds.trainBell();
        }
        continue;
      }
      // Columns the player occupies on this track (both ends of a step in progress).
      const blocked: number[] = [];
      if (onCampus) {
        if (p.tileY === t.row) blocked.push(p.tileX);
        if (p.moving && p.fromY === t.row) blocked.push(p.fromX);
      }
      const nx = t.x + (t.dir * TRAIN_SPEED * dt) / 1000;
      const wouldHit = blocked.some((bx) => nx < bx + 1 && nx + TRAIN_LENGTH > bx);
      if (!wouldHit) t.x = nx;
      const done = t.dir === 1 ? t.x > width + 1 : t.x + TRAIN_LENGTH < -1;
      if (done) {
        t.running = false;
        t.idleUntil = now + randomIdle();
      }
    }
  }, []);

  // Students with a wander area stroll around it. Steps already in progress
  // always finish; new steps only start when the game isn't paused.
  const updateNPCs = useCallback(
    (now: number, allowNewMoves: boolean) => {
      const mapId = mapIdRef.current;
      const map = MAPS[mapId];
      const p = playerRef.current;
      for (const n of npcsOnMap(mapId)) {
        const area = n.wander;
        if (!area) continue;
        const s = npcStateRef.current![n.id];
        if (s.moving) {
          if (now - s.moveStart >= NPC_MOVE_MS) {
            s.moving = false;
            s.fromX = s.toX;
            s.fromY = s.toY;
          }
          continue;
        }
        if (!allowNewMoves || now < s.nextMoveAt) continue;
        s.nextMoveAt = now + NPC_PAUSE_MIN_MS + Math.random() * (NPC_PAUSE_MAX_MS - NPC_PAUSE_MIN_MS);
        const dir = Math.floor(Math.random() * 4) as Direction;
        s.facing = dir;
        if (Math.random() < NPC_LOOK_AROUND_CHANCE) continue;

        const { dx, dy } = DIRS[dir];
        const nx = s.tileX + dx;
        const ny = s.tileY + dy;
        if (nx < area.x || nx >= area.x + area.w || ny < area.y || ny >= area.y + area.h) continue;
        const tile = map.tiles[ny]?.[nx];
        if (tile === undefined || isSolid(tile) || isTallGrass(tile) || tile === "trackCrossing") {
          continue;
        }
        if (WARP_FRONTS[mapId].has(`${nx},${ny}`)) continue;
        if (mapId === "campus" && nx === SPAWN.x && ny === SPAWN.y) continue;
        const playerThere =
          (p.tileX === nx && p.tileY === ny) || (p.moving && p.fromX === nx && p.fromY === ny);
        if (playerThere || npcAt(nx, ny, mapId) || findCustomNPCAt(nx, ny)) continue;

        s.fromX = s.tileX;
        s.fromY = s.tileY;
        s.toX = nx;
        s.toY = ny;
        s.tileX = nx;
        s.tileY = ny;
        s.moveStart = now;
        s.moving = true;
        s.walkFrame = s.walkFrame === 0 ? 1 : 0;
      }
    },
    [npcAt, findCustomNPCAt]
  );

  // Wandering AI for trainers added after the legendary review (campus only).
  const updateCustomNPCs = useCallback(
    (now: number) => {
      const player = playerRef.current;
      const campus = MAPS.campus;
      for (const c of customNPCsRef.current) {
        if (c.moving) {
          const t = Math.min(1, (now - c.moveStart) / CUSTOM_NPC_MOVE_MS);
          if (t >= 1) {
            c.moving = false;
            c.fromX = c.toX;
            c.fromY = c.toY;
          }
          continue;
        }
        // Try to move every 2.5-4 seconds
        if (now - c.lastMoveTime > 2500 + Math.random() * 1500) {
          c.lastMoveTime = now;
          const dir = Math.floor(Math.random() * 4) as Direction;
          const { dx, dy } = DIRS[dir];
          const nx = c.tileX + dx;
          const ny = c.tileY + dy;
          c.facing = dir;
          const tile = campus.tiles[ny]?.[nx];
          const playerHere =
            mapIdRef.current === "campus" && player.tileX === nx && player.tileY === ny;
          const validTile =
            tile !== undefined &&
            !isSolid(tile) &&
            !isTallGrass(tile) &&
            tile !== "trackCrossing" &&
            !npcAt(nx, ny, "campus") &&
            !customNPCsRef.current.some((o) => o !== c && o.tileX === nx && o.tileY === ny) &&
            !playerHere &&
            // Keep the spawn tile free so a respawning player never overlaps them.
            !(nx === SPAWN.x && ny === SPAWN.y);
          if (validTile) {
            c.fromX = c.tileX;
            c.fromY = c.tileY;
            c.toX = nx;
            c.toY = ny;
            c.tileX = nx;
            c.tileY = ny;
            c.moveStart = now;
            c.moving = true;
            c.walkFrame = c.walkFrame === 0 ? 1 : 0;
          }
        }
      }
    },
    [npcAt]
  );

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let lastAnimTick = 0;
    let lastFrame = performance.now();

    const loop = (now: number) => {
      // Clamp the frame time so a background tab doesn't teleport the trains.
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      const p = playerRef.current;
      const map = MAPS[mapIdRef.current];
      const onCampus = map.id === "campus";

      if (now - lastAnimTick > 400) {
        animFrameRef.current = (animFrameRef.current + 1) % 2;
        lastAnimTick = now;
      }

      const blocked =
        !!dialogueRef.current ||
        !!battleRef.current ||
        faintedRef.current ||
        showNamePromptRef.current ||
        playerNameRef.current === null ||
        fadingRef.current;

      if (!p.moving && !blocked) {
        const keys = keysRef.current;
        if (keys.has("arrowup") || keys.has("w")) tryMove(1);
        else if (keys.has("arrowdown") || keys.has("s")) tryMove(0);
        else if (keys.has("arrowleft") || keys.has("a")) tryMove(2);
        else if (keys.has("arrowright") || keys.has("d")) tryMove(3);
      }

      let renderX = p.tileX;
      let renderY = p.tileY;
      if (p.moving) {
        const t = Math.min(1, (now - p.moveStart) / MOVE_MS);
        renderX = p.fromX + (p.toX - p.fromX) * t;
        renderY = p.fromY + (p.toY - p.fromY) * t;
        if (t >= 1) {
          p.moving = false;
          p.fromX = p.toX;
          p.fromY = p.toY;
          onStepComplete();
        }
      }

      updateTrains(now, dt);
      updateNPCs(now, !blocked);
      if (!blocked && onCampus) updateCustomNPCs(now);

      // Camera: follow the player, clamp to the map, centre small maps.
      const logicalW = window.innerWidth;
      const logicalH = window.innerHeight;
      const viewTilesW = logicalW / TILE_SIZE;
      const viewTilesH = logicalH / TILE_SIZE;
      let camX = renderX - viewTilesW / 2 + 0.5;
      let camY = renderY - viewTilesH / 2 + 0.5;
      camX = Math.max(0, Math.min(map.width - viewTilesW, camX));
      camY = Math.max(0, Math.min(map.height - viewTilesH, camY));
      if (map.width < viewTilesW) camX = (map.width - viewTilesW) / 2;
      if (map.height < viewTilesH) camY = (map.height - viewTilesH) / 2;
      // Round the camera offset so the tile grid stays pixel-aligned (avoids
      // seams between blitted tiles) while the player still glides smoothly.
      const camPxX = Math.round(camX * TILE_SIZE);
      const camPxY = Math.round(camY * TILE_SIZE);

      ctx.fillStyle = map.background;
      ctx.fillRect(0, 0, logicalW, logicalH);

      const startTx = Math.max(0, Math.floor(camX) - 1);
      const endTx = Math.min(map.width, Math.ceil(camX + viewTilesW) + 1);
      const startTy = Math.max(0, Math.floor(camY) - 1);
      const endTy = Math.min(map.height, Math.ceil(camY + viewTilesH) + 1);
      const visible = (x: number, y: number) =>
        x >= startTx - 1 && x <= endTx && y >= startTy - 1 && y <= endTy;

      for (let ty = startTy; ty < endTy; ty++) {
        for (let tx = startTx; tx < endTx; tx++) {
          const tile = map.tiles[ty][tx];
          const b = tile.startsWith("building") ? buildingAt(map, tx, ty) : undefined;
          drawTileCached(
            ctx,
            tile,
            tx * TILE_SIZE - camPxX,
            ty * TILE_SIZE - camPxY,
            animFrameRef.current,
            b
          );
        }
      }

      for (const b of map.buildings) {
        if (b.x + b.w >= startTx && b.x < endTx && b.y + b.h >= startTy && b.y < endTy) {
          drawBuildingLabel(ctx, b, camPxX, camPxY);
        }
      }
      for (const l of map.labels) {
        drawMapLabel(ctx, l.x, l.y, l.text, l.accent, camPxX, camPxY);
      }

      // Crossing lights flash while either train is close to that crossing.
      const trains = trainsRef.current!;
      const leftLit = Math.floor(now / 400) % 2 === 0;
      for (const cb of map.crossbucks) {
        if (!visible(cb.x, cb.y)) continue;
        if (trains.some((t) => trainNear(t, cb.crossingX, TRAIN_LIGHTS_MARGIN))) {
          drawCrossingLights(ctx, cb.x * TILE_SIZE - camPxX, cb.y * TILE_SIZE - camPxY, leftLit);
        }
      }

      // Trains and characters are drawn sorted by row so that whatever is
      // further south is drawn in front.
      const drawables: { y: number; draw: () => void }[] = [];
      const isFacingPlayer = (x: number, y: number) => {
        const dx = x - p.tileX;
        const dy = y - p.tileY;
        return (
          (dx === 0 && dy === 1 && p.facing === 0) ||
          (dx === 0 && dy === -1 && p.facing === 1) ||
          (dx === -1 && dy === 0 && p.facing === 2) ||
          (dx === 1 && dy === 0 && p.facing === 3)
        );
      };

      if (onCampus) {
        for (const t of trains) {
          if (!t.running) continue;
          drawables.push({
            y: t.row + 0.5,
            draw: () =>
              drawTrain(
                ctx,
                t.x * TILE_SIZE - camPxX,
                t.row * TILE_SIZE - camPxY,
                TRAIN_LENGTH,
                t.dir
              ),
          });
        }
      }

      for (const npc of npcsOnMap(map.id)) {
        if (npc.hideAfterGift && giftGiven.current.has(npc.id)) continue;
        const s = npcStateRef.current![npc.id];
        let nx = s.tileX;
        let ny = s.tileY;
        if (s.moving) {
          const t = Math.min(1, (now - s.moveStart) / NPC_MOVE_MS);
          nx = s.fromX + (s.toX - s.fromX) * t;
          ny = s.fromY + (s.toY - s.fromY) * t;
        }
        if (!visible(nx, ny)) continue;
        drawables.push({
          y: ny,
          draw: () => {
            const npx = nx * TILE_SIZE - camPxX;
            const npy = ny * TILE_SIZE - camPxY;
            const species = npc.speciesId ? SPECIES[npc.speciesId] : undefined;
            if (npc.sprite === "pokemon" && species) {
              const bob = Math.sin(now / 350) * 1.5;
              drawPokemon(ctx, npx, npy + bob, TILE_SIZE, species);
            } else {
              drawCharacter(
                ctx,
                npx,
                npy,
                npc.color,
                npc.hair,
                s.facing,
                s.moving ? s.walkFrame : 0,
                null,
                npc.outfit ?? "casual"
              );
            }
            if (!blocked && isFacingPlayer(s.tileX, s.tileY)) {
              drawHint(ctx, npx + TILE_SIZE / 2, npy - 6, now);
            } else if (npc.trainer && !defeatedTrainers.current.has(npc.id)) {
              // A Pokeball over trainers who still want to battle
              drawTrainerBadge(ctx, npx + TILE_SIZE / 2, npy - 6, now);
            }
          },
        });
      }

      if (onCampus) {
        for (const c of customNPCsRef.current) {
          let cx = c.tileX;
          let cy = c.tileY;
          if (c.moving) {
            const t = Math.min(1, (now - c.moveStart) / CUSTOM_NPC_MOVE_MS);
            cx = c.fromX + (c.toX - c.fromX) * t;
            cy = c.fromY + (c.toY - c.fromY) * t;
          }
          if (!visible(cx, cy)) continue;
          drawables.push({
            y: cy,
            draw: () => {
              const npx = cx * TILE_SIZE - camPxX;
              const npy = cy * TILE_SIZE - camPxY;
              drawCharacter(
                ctx,
                npx,
                npy,
                c.color,
                c.hair,
                c.facing,
                c.moving ? c.walkFrame : 0,
                null,
                c.outfit
              );
              drawNameLabel(ctx, npx + TILE_SIZE / 2, npy - 4, c.name, "#facc15");

              // Occasional "Hi!" bubble when the player is near
              const nearby = Math.abs(c.tileX - p.tileX) <= 3 && Math.abs(c.tileY - p.tileY) <= 3;
              if (nearby && now - c.lastGreetTime > 6000) c.lastGreetTime = now;
              if (nearby && now - c.lastGreetTime < 1800) {
                drawSpeechBubble(ctx, npx + TILE_SIZE / 2, npy - 22, "Hi!");
              }
              if (!blocked && isFacingPlayer(c.tileX, c.tileY)) {
                drawHint(ctx, npx + TILE_SIZE / 2, npy - 6, now);
              }
            },
          });
        }
      }

      drawables.push({
        y: renderY,
        draw: () => {
          const playerPx = renderX * TILE_SIZE - camPxX;
          const playerPy = renderY * TILE_SIZE - camPxY;
          drawCharacter(
            ctx,
            playerPx,
            playerPy,
            "#0891b2",
            "#0f172a",
            p.facing,
            p.moving ? p.walkFrame : 0,
            null,
            "trainer"
          );
          // Player's name above their head (white, so it stands out from NPC labels)
          if (playerNameRef.current) {
            drawNameLabel(ctx, playerPx + TILE_SIZE / 2, playerPy - 4, playerNameRef.current, "#ffffff");
          }
        },
      });

      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.draw();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tryMove, onStepComplete, updateTrains, updateNPCs, updateCustomNPCs]);

  const handleBattleEnd = useCallback(
    (r: "win" | "lose") => {
      // Trainer battle: no catching. Win a Repel Spray; losing just means a
      // rematch later (you stay where you are).
      if (battle?.trainer?.trainer) {
        const npc = battle.trainer;
        const info = npc.trainer!;
        if (r === "win") {
          defeatedTrainers.current.add(npc.id);
          setRepels((n) => n + 1);
          sounds.give();
          showToast("Got a Repel Spray!");
        }
        setBattle(null);
        setDialogue({
          npc,
          line: 0,
          extraLines: r === "win" ? info.winLines : info.loseLines,
          choiceShown: false,
          finished: false,
          isRepeat: false,
          openedAt: performance.now(),
        });
        return;
      }
      if (r === "win" && battle) {
        const name = battle.wild.species.name;
        const existing = teamRef.current.find((p) => p.species.id === battle.wild.species.id);
        setTeam((prev) => addToTeam(prev, battle.wild));
        const legendaryNote = battle.wild.species.isLegendary ? " It's a legendary!" : "";
        showToast(
          existing
            ? `Caught another ${name}! Your ${name} is now Lv ${Math.min(99, existing.level + battle.wild.level)}.${legendaryNote}`
            : `Caught ${name} (Lv ${battle.wild.level})!${legendaryNote}`
        );
      } else if (r === "lose") {
        showToast("You lost the battle. Returning to spawn.");
        respawn();
      }
      setBattle(null);
    },
    [battle, respawn, showToast]
  );

  const handleTradeForRepellent = useCallback(
    (traded: Pokemon) => {
      if (traded.species.isLegendary) {
        showToast("You can't trade a legendary!");
        return;
      }
      // Gifts are one-time, so an empty team could never get a Pokemon again.
      if (teamRef.current.length <= 1) {
        showToast("You can't trade your last Pokemon!");
        return;
      }
      setTeam((prev) => prev.filter((p) => p.uid !== traded.uid));
      setRepellentExpires(Date.now() + REPELLENT_MS);
      sounds.give();
      showToast(`Traded ${traded.species.name} for Repel Spray!`);
    },
    [showToast]
  );

  // Using a spray while one is active adds another 30 seconds.
  const handleUseRepel = useCallback(() => {
    if (repelsRef.current <= 0) return;
    setRepels((n) => n - 1);
    const now = Date.now();
    setRepellentExpires((prev) => Math.max(prev ?? 0, now) + REPELLENT_MS);
    sounds.select();
    showToast("Used a Repel Spray. Wild Pokemon will stay away for 30 seconds.");
  }, [showToast]);

  const handleNameSubmit = useCallback(
    (name: string) => {
      const c = CUSTOM_NPC_COLORS[Math.floor(Math.random() * CUSTOM_NPC_COLORS.length)];
      const now = performance.now();
      const newNPC: CustomNPC = {
        id: `${Date.now()}`,
        name,
        tileX: CUSTOM_NPC_SPAWN.x,
        tileY: CUSTOM_NPC_SPAWN.y,
        fromX: CUSTOM_NPC_SPAWN.x,
        fromY: CUSTOM_NPC_SPAWN.y,
        toX: CUSTOM_NPC_SPAWN.x,
        toY: CUSTOM_NPC_SPAWN.y,
        moveStart: now,
        moving: false,
        facing: 0,
        walkFrame: 0,
        color: c,
        hair: "#1a1008",
        outfit: "trainer",
        lastMoveTime: now,
        lastGreetTime: 0,
      };
      setCustomNPCs((prev) => [...prev, newNPC]);
      setShowNamePrompt(false);
      sounds.victory();
      showToast(`Welcome to the world, ${name}!`);
    },
    [showToast]
  );

  const toggleMute = () => {
    const m = sounds.toggle();
    setMuted(m);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Fade used when walking through a door */}
      <div
        className="absolute inset-0 z-[15] bg-black pointer-events-none transition-opacity duration-200"
        style={{ opacity: fading ? 1 : 0 }}
      />

      <button
        onClick={toggleMute}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-white text-sm rounded-lg border border-slate-700 backdrop-blur-sm transition-colors"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <PokemonHUD
        team={team}
        repellentExpires={repellentExpires}
        repels={repels}
        onUseRepel={handleUseRepel}
        onTradeForRepellent={handleTradeForRepellent}
      />

      {!isTouch && (
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 text-slate-400 text-xs bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 backdrop-blur-sm">
          <div className="inline-flex items-center gap-1.5 text-slate-200">
            <Keyboard className="w-3.5 h-3.5" /> Controls
          </div>
          <div>WASD / Arrows: move</div>
          <div>Space / E: talk &amp; look</div>
        </div>
      )}

      {fainted && (
        <div className="absolute inset-0 z-20 bg-red-600/40 pointer-events-none animate-pulse" />
      )}

      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] text-center bg-slate-900/95 border-2 border-yellow-400 rounded-lg px-4 py-2 text-yellow-200 text-sm font-mono shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
          {toast}
        </div>
      )}

      {dialogue && (
        <DialogueBox
          state={dialogue}
          playerName={playerName}
          onAdvance={advanceDialogue}
          onChoose={chooseOption}
        />
      )}

      {battle && (
        <BattleScreen
          team={battle.team}
          wild={battle.wild}
          trainerName={battle.trainer?.name}
          onEnd={handleBattleEnd}
        />
      )}

      {/* Opening screen: ask for the player's name before anything else. */}
      {playerName === null && (
        <NamePromptModal
          eyebrow="Welcome to UW"
          title="What's your name?"
          footer="Your name will appear above your character."
          buttonLabel="Start"
          onSubmit={(name) => {
            setPlayerName(name);
            sounds.select();
            showToast(`Welcome, ${name}!`);
          }}
        />
      )}

      {showNamePrompt && (
        <NamePromptModal onSubmit={handleNameSubmit} initialValue={playerName ?? ""} />
      )}

      {/* On-screen controls for touch devices. Hidden during battle, name entry,
          and dialogue (those have their own UI; tap the dialogue box to advance). */}
      {isTouch && playerName !== null && !battle && !showNamePrompt && !dialogue && (
        <TouchControls onPress={pressDir} onRelease={releaseDir} onAction={interact} />
      )}
    </div>
  );
};

const drawHint = (ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) => {
  const bob = Math.sin(now / 200) * 2;
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(cx, cy + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", cx, cy + bob + 1);
};

// Small bobbing Pokeball shown over trainers who still want to battle.
const drawTrainerBadge = (ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) => {
  const y = cy + Math.sin(now / 300) * 1.5;
  const r = 6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, y, r, Math.PI, 0);
  ctx.fillStyle = "#ef4444";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI * 2);
  ctx.moveTo(cx - r, y);
  ctx.lineTo(cx + r, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// Small dark pill with a name in it, centered horizontally on cx, bottom at baseY.
const drawNameLabel = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  text: string,
  color: string
) => {
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(cx - w / 2 - 4, baseY - 12, w + 8, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, cx, baseY);
};

const drawSpeechBubble = (ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string) => {
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - w / 2 - 4, cy - 10, w + 8, 14);
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2 - 4, cy - 10, w + 8, 14);
  ctx.fillStyle = "#1e293b";
  ctx.fillText(text, cx, cy - 3);
};

interface DialogueBoxProps {
  state: DialogueState;
  playerName: string | null;
  onAdvance: () => void;
  onChoose: (index: number) => void;
}

const DialogueBox = ({ state, playerName, onAdvance, onChoose }: DialogueBoxProps) => {
  const currentLines = state.extraLines ?? state.npc.dialogue;
  const isLast = state.line >= currentLines.length - 1;
  const hasChoice = choiceAvailable(state);
  const showingChoices = state.choiceShown;
  const text = currentLines[state.line].split("{name}").join(playerName ?? "trainer");

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,760px)]">
      <div
        onClick={!showingChoices ? onAdvance : undefined}
        className={`bg-slate-950/95 border-4 border-slate-700 rounded-lg p-5 shadow-2xl backdrop-blur ${
          !showingChoices ? "cursor-pointer" : ""
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: state.npc.color }} />
          <span className="text-white font-bold text-sm">{state.npc.name}</span>
          <span className="text-slate-500 text-xs">· {state.npc.role}</span>
        </div>
        <p className="text-slate-100 text-base leading-relaxed min-h-[3rem]">{text}</p>

        {showingChoices && state.npc.choice ? (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-slate-400 text-xs mb-2">{state.npc.choice.question}</p>
            <div className="flex flex-wrap gap-2">
              {state.npc.choice.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => onChoose(i)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-yellow-400 text-white text-sm rounded transition-colors"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-end mt-2">
            <span className="text-slate-500 text-xs animate-pulse">
              {isLast && !hasChoice ? "▸ close" : "▸ continue"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreGame;
