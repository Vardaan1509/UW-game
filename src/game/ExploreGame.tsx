import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Volume2, VolumeX } from "lucide-react";
import {
  TILE_SIZE,
  MAPS,
  SPAWN,
  HALL_OF_FAME_SPOT,
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
} from "./sprites";
import { npcs, npcsOnMap, type NPC } from "./npcs";
import {
  MAX_LEVEL,
  SPECIES,
  addToTeam,
  hasLegendary,
  makePokemon,
  rollWildEncounter,
  type Pokemon,
} from "./pokemon";
import { sounds } from "./sounds";
import BattleScreen from "./BattleScreen";
import PokemonHUD, { TradeModal } from "./PokemonHUD";
import NamePromptModal from "./NamePromptModal";
import TouchControls, { type TouchDir } from "./TouchControls";
import TunnelOverlay from "./TunnelOverlay";

const DIRS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: 1 },
  1: { dx: 0, dy: -1 },
  2: { dx: -1, dy: 0 },
  3: { dx: 1, dy: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { 0: 1, 1: 0, 2: 3, 3: 2 };

const MOVE_KEYS: [Direction, string[]][] = [
  [1, ["arrowup", "w"]],
  [0, ["arrowdown", "s"]],
  [2, ["arrowleft", "a"]],
  [3, ["arrowright", "d"]],
];
const ACTION_KEYS = [" ", "e", "enter"];
const GAME_KEYS = new Set([...MOVE_KEYS.flatMap(([, keys]) => keys), ...ACTION_KEYS]);
const TOUCH_KEY: Record<TouchDir, string> = {
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
};

const MOVE_MS = 160;
const ENCOUNTER_CHANCE = 0.28;
const REPEL_MS = 30_000;
const FADE_MS = 200;
const FAINT_MS = 900;
const TOAST_MS = 2400;
const BUMP_COOLDOWN_MS = 1200;
const ANIM_TICK_MS = 400;
const MAX_FRAME_MS = 50; // a long pause (background tab) shouldn't jump the trains forward
const MAX_DPR = 1.5; // chunky pixel art gains nothing from more pixels, and phones slow down

// ============ NPC MOVEMENT ============

const NPC_MOVE_MS = 300;
const NPC_PAUSE_MIN_MS = 1200;
const NPC_PAUSE_MAX_MS = 3800;
const NPC_LOOK_AROUND_CHANCE = 0.3; // sometimes they only turn instead of stepping
const NPC_TALK_PAUSE_MS = 2500;

interface Mover {
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
}

interface NPCState extends Mover {
  nextMoveAt: number;
}

const createMover = (x: number, y: number, facing: Direction): Mover => ({
  tileX: x,
  tileY: y,
  fromX: x,
  fromY: y,
  toX: x,
  toY: y,
  moveStart: 0,
  moving: false,
  facing,
  walkFrame: 0,
});

const startStep = (m: Mover, x: number, y: number, now: number) => {
  m.fromX = m.tileX;
  m.fromY = m.tileY;
  m.toX = x;
  m.toY = y;
  m.tileX = x;
  m.tileY = y;
  m.moveStart = now;
  m.moving = true;
  m.walkFrame = m.walkFrame === 0 ? 1 : 0;
};

// Where a mover is drawn right now, partway between tiles while stepping.
const renderPosition = (m: Mover, now: number, durationMs: number) => {
  if (!m.moving) return { x: m.tileX, y: m.tileY };
  const t = Math.min(1, (now - m.moveStart) / durationMs);
  return { x: m.fromX + (m.toX - m.fromX) * t, y: m.fromY + (m.toY - m.fromY) * t };
};

// A stepping mover occupies both the tile it left and the tile it's entering.
const occupies = (m: Mover, x: number, y: number) =>
  (m.tileX === x && m.tileY === y) || (m.moving && m.fromX === x && m.fromY === y);

const createNPCStates = (now: number): Record<string, NPCState> =>
  Object.fromEntries(
    npcs.map((n) => [
      n.id,
      { ...createMover(n.x, n.y, n.facing ?? 0), nextMoveAt: now + 1000 + Math.random() * 3000 },
    ])
  );

// Tiles next to a door. Wanderers keep off them so they never block one.
const WARP_FRONTS = Object.fromEntries(
  Object.values(MAPS).map((m) => [
    m.id,
    new Set(
      m.warps.flatMap((w) =>
        Object.values(DIRS).map(({ dx, dy }) => `${w.x + dx},${w.y + dy}`)
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
const TRAIN_BELL_RANGE = 9; // the bell is heard within this many rows of the tracks

interface Train {
  row: number;
  dir: 1 | -1;
  x: number; // left edge, in tiles
  running: boolean;
  idleUntil: number;
}

const randomTrainIdle = () =>
  TRAIN_IDLE_MIN_MS + Math.random() * (TRAIN_IDLE_MAX_MS - TRAIN_IDLE_MIN_MS);

// The north track runs west and the south track runs east.
const createTrains = (now: number): Train[] =>
  MAPS.campus.trackRows.map((row, i) => ({
    row,
    dir: i === 0 ? -1 : 1,
    x: 0,
    running: false,
    idleUntil: now + 2000 + i * 3500,
  }));

const trainNear = (t: Train, tileX: number, margin: number) =>
  t.running && t.x < tileX + 1 + margin && t.x + TRAIN_LENGTH > tileX - margin;

// ============ DIALOGUE ============

interface DialogueState {
  npc: NPC;
  line: number;
  extraLines: string[] | null; // replaces npc.dialogue when set
  choiceShown: boolean;
  isRepeat?: boolean;
  isLegendaryReview?: boolean;
  openedAt: number;
}

const openDialogue = (
  npc: NPC,
  extra: Partial<Pick<DialogueState, "extraLines" | "isRepeat" | "isLegendaryReview">> = {}
): DialogueState => ({
  npc,
  line: 0,
  extraLines: null,
  choiceShown: false,
  openedAt: performance.now(),
  ...extra,
});

// The choice appears at the end of the first conversation, or at the end of
// the repeat conversation for NPCs that offer it again.
const choiceAvailable = (s: DialogueState) =>
  !!s.npc.choice && (!s.extraLines || (!!s.isRepeat && !!s.npc.repeatOffersChoice));

// On phones the tap that opens a dialogue can also land on the dialogue box
// and skip the first line, so advancing is ignored this soon after opening.
const OPEN_GUARD_MS = 350;

// ============ HALL OF FAME ============

interface HonouredTrainer {
  name: string;
}

const HONOURED_LOOK = { shirt: "#d4a72c", hair: "#1a1008" };

const honouredNPC = (h: HonouredTrainer): NPC => ({
  id: "honoured",
  name: h.name,
  role: "Hall of Fame",
  mapId: "csc",
  x: HALL_OF_FAME_SPOT.x,
  y: HALL_OF_FAME_SPOT.y,
  color: HONOURED_LOOK.shirt,
  hair: HONOURED_LOOK.hair,
  dialogue: [
    `I'm ${h.name}, the trainer who caught a Compileon.`,
    "My name's on the plaque now. Not bad, right?",
    "Good luck out there.",
  ],
});

// Keeps a ref in sync with the latest value, so the game loop and event
// handlers can read current state without re-subscribing every render.
const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

interface BattleState {
  team: Pokemon[];
  opponent: Pokemon;
  trainer?: NPC;
}

const ExploreGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [playerName, setPlayerName] = useState<string | null>(null);
  const [team, setTeam] = useState<Pokemon[]>([]);
  const [repels, setRepels] = useState(0);
  const [repelUntil, setRepelUntil] = useState<number | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [trading, setTrading] = useState(false);
  const [askingHonourName, setAskingHonourName] = useState(false);
  const [honoured, setHonoured] = useState<HonouredTrainer | null>(null);
  const [tunnel, setTunnel] = useState<{ caption: string; warp: Warp } | null>(null);
  const [fading, setFading] = useState(false);
  const [fainted, setFainted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => sounds.isMuted());
  const [isTouch, setIsTouch] = useState(false);

  // Anything that pauses walking. Fading is tracked separately in a ref
  // because it has to take effect within the same frame.
  const overlayOpen =
    playerName === null || !!dialogue || !!battle || trading || askingHonourName || !!tunnel || fainted;

  const playerNameRef = useLatest(playerName);
  const teamRef = useLatest(team);
  const repelsRef = useLatest(repels);
  const repelUntilRef = useLatest(repelUntil);
  const dialogueRef = useLatest(dialogue);
  const honouredRef = useLatest(honoured);
  const overlayOpenRef = useLatest(overlayOpen);
  const fadingRef = useRef(false);

  const player = useRef<Mover>(createMover(SPAWN.x, SPAWN.y, SPAWN.facing));
  const mapIdRef = useRef<MapId>("campus");
  const npcStates = useRef<Record<string, NPCState>>(createNPCStates(performance.now()));
  const trains = useRef<Train[]>(createTrains(performance.now()));
  const keys = useRef<Set<string>>(new Set());
  const animFrame = useRef(0);
  const talkedTo = useRef<Set<string>>(new Set());
  const giftGiven = useRef<Set<string>>(new Set());
  const defeatedTrainers = useRef<Set<string>>(new Set());
  const legendaryReviewed = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const lastBump = useRef({ text: "", at: 0 });

  useEffect(() => {
    setIsTouch(window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window);
  }, []);

  // Phones only allow audio to start inside a real gesture. A finger's
  // pointerdown doesn't count, but pointerup, touchend and keydown do.
  useEffect(() => {
    const unlock = () => sounds.unlock();
    const events = ["pointerup", "touchend", "keydown", "click"] as const;
    events.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, unlock));
  }, []);

  // When an overlay opens, the touch controls disappear before their
  // pointer-up can fire. Clearing held keys stops the player walking on
  // by themselves once the overlay closes.
  useEffect(() => {
    if (overlayOpen) keys.current.clear();
  }, [overlayOpen]);

  // Keys released while the window is in the background never send a keyup.
  useEffect(() => {
    const clear = () => keys.current.clear();
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // Holding a direction against a wall tries the move every frame, so the
  // same message is only shown again after a cooldown.
  const bump = useCallback(
    (text: string) => {
      const now = performance.now();
      if (lastBump.current.text === text && now - lastBump.current.at < BUMP_COOLDOWN_MS) return;
      lastBump.current = { text, at: now };
      showToast(text);
    },
    [showToast]
  );

  const placePlayer = useCallback((mapId: MapId, x: number, y: number, facing: Direction) => {
    mapIdRef.current = mapId;
    player.current = createMover(x, y, facing);
  }, []);

  const respawn = useCallback(() => placePlayer("campus", SPAWN.x, SPAWN.y, SPAWN.facing), [placePlayer]);

  // ============ DOORS AND THE TUNNEL ============

  const arrive = useCallback(
    (w: Warp) => {
      placePlayer(w.to, w.toX, w.toY, w.facing);
      showToast(MAPS[w.to].name);
      // Let the new room draw one frame before fading back in.
      requestAnimationFrame(() => {
        setFading(false);
        fadingRef.current = false;
      });
    },
    [placePlayer, showToast]
  );

  const warpTo = useCallback(
    (w: Warp) => {
      if (fadingRef.current) return;
      fadingRef.current = true;
      setFading(true);
      sounds.door();
      window.setTimeout(() => {
        if (w.tunnel) {
          sounds.tunnel();
          setTunnel({ caption: w.tunnel, warp: w });
        } else {
          arrive(w);
        }
      }, FADE_MS);
    },
    [arrive]
  );

  const tunnelRef = useLatest(tunnel);
  const finishTunnel = useCallback(() => {
    const current = tunnelRef.current;
    if (!current) return;
    tunnelRef.current = null;
    setTunnel(null);
    arrive(current.warp);
  }, [arrive, tunnelRef]);

  // ============ WHO'S WHERE ============

  const npcAt = useCallback((x: number, y: number, mapId: MapId = mapIdRef.current) => {
    return npcsOnMap(mapId).find(
      (n) => !(n.hideAfterGift && giftGiven.current.has(n.id)) && occupies(npcStates.current[n.id], x, y)
    );
  }, []);

  const honouredAt = useCallback(
    (x: number, y: number): HonouredTrainer | null =>
      mapIdRef.current === "csc" && x === HALL_OF_FAME_SPOT.x && y === HALL_OF_FAME_SPOT.y
        ? honouredRef.current
        : null,
    [honouredRef]
  );

  // ============ ITEMS AND POKEMON ============

  const givePokemon = useCallback(
    (speciesId: string) => {
      const pk = makePokemon(speciesId);
      setTeam((prev) => addToTeam(prev, pk));
      sounds.give();
      showToast(`Got ${pk.species.name} (Lv ${pk.level})!`);
    },
    [showToast]
  );

  // A new spray adds 30 seconds on top of one that's still running.
  const applyRepel = useCallback(() => {
    setRepelUntil((prev) => Math.max(prev ?? 0, Date.now()) + REPEL_MS);
  }, []);

  const spendRepel = useCallback(() => {
    if (repelsRef.current <= 0) return;
    setRepels((n) => n - 1);
    applyRepel();
    sounds.select();
    showToast("Used a Repel Spray. Wild Pokemon will stay away for 30 seconds.");
  }, [applyRepel, repelsRef, showToast]);

  const tradeForRepel = useCallback(
    (traded: Pokemon) => {
      setTrading(false);
      // The trade screen already blocks these, so this only guards misuse.
      if (traded.species.isLegendary || teamRef.current.length <= 1) return;
      setTeam((prev) => prev.filter((p) => p.uid !== traded.uid));
      applyRepel();
      sounds.give();
      showToast(`Traded ${traded.species.name} for a Repel Spray!`);
    },
    [applyRepel, showToast, teamRef]
  );

  // ============ MOVEMENT ============

  const startEncounter = useCallback(() => {
    if (repelUntilRef.current !== null && Date.now() < repelUntilRef.current) return;
    // Pause right away. The game loop reads this ref before React re-renders,
    // and the player shouldn't take another step in the meantime.
    overlayOpenRef.current = true;
    if (teamRef.current.length === 0) {
      sounds.faint();
      setFainted(true);
      window.setTimeout(() => {
        respawn();
        setFainted(false);
        showToast("You fainted with no Pokemon! Talk to Vardaan outside E7 first.");
      }, FAINT_MS);
      return;
    }
    sounds.encounter();
    setBattle({ team: teamRef.current, opponent: rollWildEncounter() });
  }, [overlayOpenRef, repelUntilRef, respawn, showToast, teamRef]);

  const tryMove = useCallback(
    (direction: Direction) => {
      const p = player.current;
      p.facing = direction;
      const map = MAPS[mapIdRef.current];
      const nx = p.tileX + DIRS[direction].dx;
      const ny = p.tileY + DIRS[direction].dy;
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
      if (tile === "trackCrossing") {
        const train = trains.current.find((t) => t.row === ny);
        if (train && trainNear(train, nx, TRAIN_ENTRY_MARGIN)) {
          bump("Wait for the ION to pass!");
          return;
        }
      }
      startStep(p, nx, ny, performance.now());
      sounds.step();
    },
    [bump, npcAt, warpTo]
  );

  // ============ TALKING ============

  const advanceDialogue = useCallback(() => {
    const state = dialogueRef.current;
    if (!state || state.choiceShown) return;
    if (performance.now() - state.openedAt < OPEN_GUARD_MS) return;

    const lines = state.extraLines ?? state.npc.dialogue;
    if (state.line < lines.length - 1) {
      setDialogue({ ...state, line: state.line + 1 });
      sounds.talk();
      return;
    }
    if (choiceAvailable(state)) {
      setDialogue({ ...state, choiceShown: true });
      return;
    }

    const npc = state.npc;
    setDialogue(null);
    talkedTo.current.add(npc.id);
    if (npc.givesPokemon && !giftGiven.current.has(npc.id)) {
      giftGiven.current.add(npc.id);
      givePokemon(npc.givesPokemon);
    }
    if (state.isLegendaryReview) {
      legendaryReviewed.current = true;
      setAskingHonourName(true);
    }
  }, [dialogueRef, givePokemon]);

  const chooseOption = useCallback(
    (index: number) => {
      const state = dialogueRef.current;
      const option = state?.npc.choice?.options[index];
      if (!state || !option) return;
      sounds.select();

      const trainer = state.npc.trainer;
      if (option.startsBattle && trainer) {
        if (teamRef.current.length === 0) {
          setDialogue({
            ...state,
            extraLines: ["You don't have any Pokemon yet! Talk to Vardaan outside E7 first."],
            line: 0,
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
          opponent: makePokemon(trainer.pokemonId, trainer.level),
          trainer: state.npc,
        });
        return;
      }
      setDialogue({ ...state, extraLines: option.responseLines, line: 0, choiceShown: false, isRepeat: false });
    },
    [dialogueRef, teamRef]
  );

  const talkTo = useCallback((npc: NPC) => {
    sounds.talk();
    const s = npcStates.current[npc.id];
    s.facing = OPPOSITE[player.current.facing];
    s.nextMoveAt = performance.now() + NPC_TALK_PAUSE_MS;

    const met = talkedTo.current.has(npc.id);
    if (npc.trainer && defeatedTrainers.current.has(npc.id)) {
      setDialogue(openDialogue(npc, { extraLines: npc.trainer.defeatedLines }));
    } else if (npc.legendaryReview && met && !legendaryReviewed.current && hasLegendary(teamRef.current)) {
      setDialogue(openDialogue(npc, { extraLines: npc.legendaryReview, isLegendaryReview: true }));
    } else if (met && npc.dialogueRepeat) {
      setDialogue(openDialogue(npc, { extraLines: npc.dialogueRepeat, isRepeat: true }));
    } else {
      setDialogue(openDialogue(npc));
    }
  }, [teamRef]);

  const interact = useCallback(() => {
    if (dialogueRef.current) {
      advanceDialogue();
      return;
    }
    if (overlayOpenRef.current || fadingRef.current) return;

    const p = player.current;
    const map = MAPS[mapIdRef.current];
    const nx = p.tileX + DIRS[p.facing].dx;
    const ny = p.tileY + DIRS[p.facing].dy;

    const npc = npcAt(nx, ny);
    if (npc) {
      talkTo(npc);
      return;
    }
    const h = honouredAt(nx, ny);
    if (h) {
      sounds.talk();
      setDialogue(openDialogue(honouredNPC(h)));
      return;
    }
    if (warpAt(map, nx, ny)) return;
    const msg =
      map.tiles[ny]?.[nx] === "hallOfFame" && honouredRef.current
        ? `CSC Hall of Fame. ${honouredRef.current.name}: caught a legendary Compileon.`
        : examineMessage(map, nx, ny);
    if (msg) showToast(msg);
  }, [advanceDialogue, dialogueRef, honouredAt, honouredRef, npcAt, overlayOpenRef, showToast, talkTo]);

  // ============ KEYBOARD ============

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Let the name box receive keys normally.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const k = e.key.toLowerCase();
      if (!GAME_KEYS.has(k)) return;
      e.preventDefault();
      keys.current.add(k);
      // Holding the action key shouldn't skip through a whole conversation.
      if (ACTION_KEYS.includes(k) && !e.repeat) interact();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [interact]);

  const pressDir = useCallback((dir: TouchDir) => keys.current.add(TOUCH_KEY[dir]), []);
  const releaseDir = useCallback((dir: TouchDir) => keys.current.delete(TOUCH_KEY[dir]), []);

  // ============ WORLD UPDATES ============

  // Trains keep running while you're indoors. On campus they stop rather
  // than run through the player.
  const updateTrains = useCallback((now: number, dt: number) => {
    const width = MAPS.campus.width;
    const p = player.current;
    const onCampus = mapIdRef.current === "campus";
    for (const t of trains.current) {
      if (!t.running) {
        if (now >= t.idleUntil) {
          t.running = true;
          t.x = t.dir === 1 ? -TRAIN_LENGTH - 1 : width + 1;
          if (onCampus && Math.abs(p.tileY - t.row) <= TRAIN_BELL_RANGE) sounds.trainBell();
        }
        continue;
      }
      // Columns the player covers on this track, including the tile they're stepping off.
      const playerColumns: number[] = [];
      if (onCampus) {
        if (p.tileY === t.row) playerColumns.push(p.tileX);
        if (p.moving && p.fromY === t.row) playerColumns.push(p.fromX);
      }
      const nx = t.x + (t.dir * TRAIN_SPEED * dt) / 1000;
      if (!playerColumns.some((col) => nx < col + 1 && nx + TRAIN_LENGTH > col)) t.x = nx;
      if (t.dir === 1 ? t.x > width + 1 : t.x + TRAIN_LENGTH < -1) {
        t.running = false;
        t.idleUntil = now + randomTrainIdle();
      }
    }
  }, []);

  // Wanderers stroll inside their area. A step in progress always finishes,
  // but new steps only start while the game isn't paused.
  const updateNPCs = useCallback(
    (now: number, allowNewMoves: boolean) => {
      const mapId = mapIdRef.current;
      const map = MAPS[mapId];
      for (const n of npcsOnMap(mapId)) {
        const area = n.wander;
        if (!area) continue;
        const s = npcStates.current[n.id];
        if (s.moving) {
          if (now - s.moveStart >= NPC_MOVE_MS) s.moving = false;
          continue;
        }
        if (!allowNewMoves || now < s.nextMoveAt) continue;
        s.nextMoveAt = now + NPC_PAUSE_MIN_MS + Math.random() * (NPC_PAUSE_MAX_MS - NPC_PAUSE_MIN_MS);
        const dir = Math.floor(Math.random() * 4) as Direction;
        s.facing = dir;
        if (Math.random() < NPC_LOOK_AROUND_CHANCE) continue;

        const nx = s.tileX + DIRS[dir].dx;
        const ny = s.tileY + DIRS[dir].dy;
        const tile = map.tiles[ny]?.[nx];
        const allowed =
          nx >= area.x &&
          nx < area.x + area.w &&
          ny >= area.y &&
          ny < area.y + area.h &&
          tile !== undefined &&
          !isSolid(tile) &&
          !isTallGrass(tile) &&
          tile !== "trackCrossing" &&
          !WARP_FRONTS[mapId].has(`${nx},${ny}`) &&
          !(mapId === "campus" && nx === SPAWN.x && ny === SPAWN.y) &&
          !occupies(player.current, nx, ny) &&
          !npcAt(nx, ny, mapId);
        if (allowed) startStep(s, nx, ny, now);
      }
    },
    [npcAt]
  );

  // ============ CANVAS ============

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
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

  // ============ GAME LOOP ============

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastAnimTick = 0;
    let lastFrame = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(now - lastFrame, MAX_FRAME_MS);
      lastFrame = now;
      const p = player.current;
      const map = MAPS[mapIdRef.current];
      const onCampus = map.id === "campus";

      if (now - lastAnimTick > ANIM_TICK_MS) {
        animFrame.current = (animFrame.current + 1) % 2;
        lastAnimTick = now;
      }

      if (p.moving && now - p.moveStart >= MOVE_MS) {
        p.moving = false;
        if (isTallGrass(map.tiles[p.tileY][p.tileX]) && Math.random() < ENCOUNTER_CHANCE) startEncounter();
      }
      if (!p.moving && !overlayOpenRef.current && !fadingRef.current) {
        const held = MOVE_KEYS.find(([, ks]) => ks.some((k) => keys.current.has(k)));
        if (held) tryMove(held[0]);
      }
      const paused = overlayOpenRef.current || fadingRef.current;

      updateTrains(now, dt);
      updateNPCs(now, !paused);

      // Camera follows the player, stops at the map edges, and centres maps
      // smaller than the screen. Rounding keeps the tiles pixel-aligned.
      const pos = renderPosition(p, now, MOVE_MS);
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      const tilesW = viewW / TILE_SIZE;
      const tilesH = viewH / TILE_SIZE;
      const camX =
        map.width < tilesW
          ? (map.width - tilesW) / 2
          : Math.max(0, Math.min(map.width - tilesW, pos.x - tilesW / 2 + 0.5));
      const camY =
        map.height < tilesH
          ? (map.height - tilesH) / 2
          : Math.max(0, Math.min(map.height - tilesH, pos.y - tilesH / 2 + 0.5));
      const camPxX = Math.round(camX * TILE_SIZE);
      const camPxY = Math.round(camY * TILE_SIZE);
      const sx = (tx: number) => tx * TILE_SIZE - camPxX;
      const sy = (ty: number) => ty * TILE_SIZE - camPxY;

      ctx.fillStyle = map.background;
      ctx.fillRect(0, 0, viewW, viewH);

      const startTx = Math.max(0, Math.floor(camX) - 1);
      const endTx = Math.min(map.width, Math.ceil(camX + tilesW) + 1);
      const startTy = Math.max(0, Math.floor(camY) - 1);
      const endTy = Math.min(map.height, Math.ceil(camY + tilesH) + 1);
      const visible = (x: number, y: number) => x >= startTx - 1 && x <= endTx && y >= startTy - 1 && y <= endTy;

      for (let ty = startTy; ty < endTy; ty++) {
        for (let tx = startTx; tx < endTx; tx++) {
          const tile = map.tiles[ty][tx];
          const building = tile.startsWith("building") ? buildingAt(map, tx, ty) : undefined;
          drawTileCached(ctx, tile, sx(tx), sy(ty), animFrame.current, building);
        }
      }
      for (const b of map.buildings) drawBuildingLabel(ctx, b, camPxX, camPxY);
      for (const l of map.labels) drawMapLabel(ctx, l.x, l.y, l.text, l.accent, camPxX, camPxY);

      const leftLampLit = Math.floor(now / ANIM_TICK_MS) % 2 === 0;
      for (const cb of map.crossbucks) {
        if (visible(cb.x, cb.y) && trains.current.some((t) => trainNear(t, cb.crossingX, TRAIN_LIGHTS_MARGIN))) {
          drawCrossingLights(ctx, sx(cb.x), sy(cb.y), leftLampLit);
        }
      }

      // Trains and characters are drawn by row, so whatever is further south
      // appears in front.
      const sprites: { y: number; draw: () => void }[] = [];
      const facedByPlayer = (x: number, y: number) =>
        !paused && x === p.tileX + DIRS[p.facing].dx && y === p.tileY + DIRS[p.facing].dy;

      if (onCampus) {
        for (const t of trains.current) {
          if (t.running) {
            sprites.push({ y: t.row + 0.5, draw: () => drawTrain(ctx, sx(t.x), sy(t.row), TRAIN_LENGTH, t.dir) });
          }
        }
      }

      for (const npc of npcsOnMap(map.id)) {
        if (npc.hideAfterGift && giftGiven.current.has(npc.id)) continue;
        const s = npcStates.current[npc.id];
        const at = renderPosition(s, now, NPC_MOVE_MS);
        if (!visible(at.x, at.y)) continue;
        sprites.push({
          y: at.y,
          draw: () => {
            const x = sx(at.x);
            const y = sy(at.y);
            if (npc.speciesId) {
              drawPokemon(ctx, x, y + Math.sin(now / 350) * 1.5, TILE_SIZE, SPECIES[npc.speciesId]);
            } else {
              drawCharacter(ctx, x, y, npc.color, npc.hair, s.facing, s.moving ? s.walkFrame : 0, npc.outfit);
            }
            if (facedByPlayer(s.tileX, s.tileY)) drawHint(ctx, x + TILE_SIZE / 2, y - 6, now);
            else if (npc.trainer && !defeatedTrainers.current.has(npc.id)) {
              drawTrainerBadge(ctx, x + TILE_SIZE / 2, y - 6, now);
            }
          },
        });
      }

      const h = honouredRef.current;
      if (h && map.id === "csc") {
        const { x: hx, y: hy } = HALL_OF_FAME_SPOT;
        sprites.push({
          y: hy,
          draw: () => {
            const x = sx(hx);
            const y = sy(hy) - 6; // standing up on the pedestal
            drawSparkles(ctx, x + TILE_SIZE / 2, y + TILE_SIZE / 2, now);
            drawCharacter(ctx, x, y, HONOURED_LOOK.shirt, HONOURED_LOOK.hair, 0, 0, "trainer");
            drawNameLabel(ctx, x + TILE_SIZE / 2, y - 4, h.name, "#facc15");
            if (facedByPlayer(hx, hy)) drawHint(ctx, x + TILE_SIZE / 2, y - 20, now);
          },
        });
      }

      sprites.push({
        y: pos.y,
        draw: () => {
          const x = sx(pos.x);
          const y = sy(pos.y);
          drawCharacter(ctx, x, y, "#0891b2", "#0f172a", p.facing, p.moving ? p.walkFrame : 0, "trainer");
          const name = playerNameRef.current;
          if (name) drawNameLabel(ctx, x + TILE_SIZE / 2, y - 4, name, "#ffffff");
        },
      });

      sprites.sort((a, b) => a.y - b.y);
      for (const s of sprites) s.draw();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [honouredRef, overlayOpenRef, playerNameRef, startEncounter, tryMove, updateNPCs, updateTrains]);

  // ============ BATTLE RESULTS ============

  const handleBattleEnd = useCallback(
    (result: "win" | "lose", leveledUpUids: string[]) => {
      if (!battle) return;
      const leveled = new Set(leveledUpUids);
      const levelAfter = (p: Pokemon) => (leveled.has(p.uid) ? Math.min(MAX_LEVEL, p.level + 1) : p.level);
      if (leveled.size > 0) {
        setTeam((prev) => prev.map((p) => (leveled.has(p.uid) ? { ...p, level: levelAfter(p) } : p)));
      }
      setBattle(null);

      // Trainers give a Repel Spray when beaten. Losing to one just means a
      // rematch later, so the player stays where they are.
      const { trainer, opponent } = battle;
      if (trainer?.trainer) {
        if (result === "win") {
          defeatedTrainers.current.add(trainer.id);
          setRepels((n) => n + 1);
          sounds.give();
          showToast("Got a Repel Spray!");
        }
        const lines = result === "win" ? trainer.trainer.winLines : trainer.trainer.loseLines;
        setDialogue(openDialogue(trainer, { extraLines: lines }));
        return;
      }

      if (result === "lose") {
        showToast("You lost the battle. Returning to spawn.");
        respawn();
        return;
      }
      const name = opponent.species.name;
      const existing = teamRef.current.find((p) => p.species.id === opponent.species.id);
      setTeam((prev) => addToTeam(prev, opponent));
      const legendaryNote = !opponent.species.isLegendary
        ? ""
        : legendaryReviewed.current
          ? " It's a legendary!"
          : " It's a legendary! Show it to Vardaan outside E7.";
      showToast(
        existing
          ? `Caught another ${name}! Your ${name} is now Lv ${Math.min(MAX_LEVEL, levelAfter(existing) + opponent.level)}.${legendaryNote}`
          : `Caught ${name} (Lv ${opponent.level})!${legendaryNote}`
      );
    },
    [battle, respawn, showToast, teamRef]
  );

  const honourTrainer = useCallback(
    (name: string) => {
      setHonoured({ name });
      setAskingHonourName(false);
      sounds.honour();
      showToast(`${name} is in the CSC Hall of Fame! Visit the CSC office in MC.`);
    },
    [showToast]
  );

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      <div
        className="absolute inset-0 z-[15] bg-black pointer-events-none transition-opacity duration-200"
        style={{ opacity: fading ? 1 : 0 }}
      />

      <button
        onClick={() => setMuted(sounds.toggle())}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-white text-sm rounded-lg border border-slate-700 backdrop-blur-sm transition-colors"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <PokemonHUD
        team={team}
        repelUntil={repelUntil}
        repels={repels}
        onUseRepel={spendRepel}
        onOpenTrade={() => setTrading(true)}
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

      {fainted && <div className="absolute inset-0 z-20 bg-red-600/40 pointer-events-none animate-pulse" />}

      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] text-center bg-slate-900/95 border-2 border-yellow-400 rounded-lg px-4 py-2 text-yellow-200 text-sm font-mono shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
          {toast}
        </div>
      )}

      {dialogue && (
        <DialogueBox state={dialogue} playerName={playerName} onAdvance={advanceDialogue} onChoose={chooseOption} />
      )}

      {battle && (
        <BattleScreen
          team={battle.team}
          opponent={battle.opponent}
          trainerName={battle.trainer?.name}
          onEnd={handleBattleEnd}
        />
      )}

      {trading && <TradeModal team={team} onCancel={() => setTrading(false)} onConfirm={tradeForRepel} />}

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

      {askingHonourName && (
        <NamePromptModal
          eyebrow="Vardaan asks"
          title="What name goes in the Hall of Fame?"
          footer="You'll be honoured in the CSC office inside MC."
          buttonLabel="Honour me"
          initialValue={playerName ?? ""}
          onSubmit={honourTrainer}
        />
      )}

      {tunnel && <TunnelOverlay caption={tunnel.caption} onDone={finishTunnel} />}

      {isTouch && !overlayOpen && <TouchControls onPress={pressDir} onRelease={releaseDir} onAction={interact} />}
    </div>
  );
};

// ============ OVERLAY DRAWING ============

// Bobbing "!" over whoever the player is facing.
const drawHint = (ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) => {
  const y = cy + Math.sin(now / 200) * 2;
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(cx, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", cx, y + 1);
};

// Bobbing Pokeball over trainers who still want to battle.
const drawTrainerBadge = (ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) => {
  const y = cy + Math.sin(now / 300) * 1.5;
  const r = 6;
  ctx.save();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(cx, y, r, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, y, r, 0, Math.PI * 2);
  ctx.moveTo(cx - r, y);
  ctx.lineTo(cx + r, y);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

// Dark pill with a name in it, centred on cx with its bottom at baseY.
const drawNameLabel = (ctx: CanvasRenderingContext2D, cx: number, baseY: number, text: string, color: string) => {
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(cx - w / 2 - 4, baseY - 12, w + 8, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, cx, baseY);
};

// Gold sparkles circling the honoured trainer.
const drawSparkles = (ctx: CanvasRenderingContext2D, cx: number, cy: number, now: number) => {
  for (let i = 0; i < 6; i++) {
    const a = now / 900 + (i * Math.PI * 2) / 6;
    const r = 18 + Math.sin(now / 400 + i) * 3;
    const size = 1.5 + ((Math.sin(now / 200 + i * 2) + 1) / 2) * 1.5;
    ctx.fillStyle = i % 2 === 0 ? "#fde68a" : "#facc15";
    ctx.fillRect(cx + Math.cos(a) * r - size / 2, cy + Math.sin(a) * r * 0.6 - size / 2, size, size);
  }
};

// ============ DIALOGUE BOX ============

interface DialogueBoxProps {
  state: DialogueState;
  playerName: string | null;
  onAdvance: () => void;
  onChoose: (index: number) => void;
}

const DialogueBox = ({ state, playerName, onAdvance, onChoose }: DialogueBoxProps) => {
  const lines = state.extraLines ?? state.npc.dialogue;
  const isLast = state.line >= lines.length - 1;
  const text = lines[state.line].split("{name}").join(playerName ?? "trainer");
  const choice = state.choiceShown ? state.npc.choice : undefined;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,760px)]">
      <div
        onClick={choice ? undefined : onAdvance}
        className={`bg-slate-950/95 border-4 border-slate-700 rounded-lg p-5 shadow-2xl backdrop-blur ${
          choice ? "" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: state.npc.color }} />
          <span className="text-white font-bold text-sm">{state.npc.name}</span>
          <span className="text-slate-500 text-xs">· {state.npc.role}</span>
        </div>
        <p className="text-slate-100 text-base leading-relaxed min-h-[3rem]">{text}</p>

        {choice ? (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <p className="text-slate-400 text-xs mb-2">{choice.question}</p>
            <div className="flex flex-wrap gap-2">
              {choice.options.map((o, i) => (
                <button
                  key={o.label}
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
              {isLast && !choiceAvailable(state) ? "▸ close" : "▸ continue"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreGame;
