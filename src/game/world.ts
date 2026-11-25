// Tile maps: the UW campus overworld and the building interiors.

export const TILE_SIZE = 40;

export type Direction = 0 | 1 | 2 | 3; // down, up, left, right

export type TileType =
  // Outdoors
  | "grass"
  | "grassTuft"
  | "path"
  | "water"
  | "tree"
  | "flower"
  | "sign"
  | "tallGrass"
  | "buildingRoofTop"
  | "buildingRoofBase"
  | "buildingWall"
  | "buildingWindow"
  | "buildingDoor"
  | "track"
  | "trackCrossing"
  | "crossbuck"
  // Indoors
  | "void"
  | "wallTop"
  | "wall"
  | "wallWindow"
  | "whiteboard"
  | "noticeBoard"
  | "doorLocked"
  | "doorCSC"
  | "stairs"
  | "floor"
  | "rug"
  | "exitMat"
  | "plant"
  | "desk"
  | "couch"
  | "bookshelf"
  | "bench"
  | "doorTunnel"
  | "hallOfFame"
  | "pedestal"
  // PAC (royal gym hall)
  | "royalTop"
  | "royalWall"
  | "royalBanner"
  | "royalSconce"
  | "royalCrest"
  | "pillar"
  | "throne"
  | "dais"
  | "daisFace"
  | "balustrade"
  | "banister"
  | "stairsGrand"
  | "stairsGrandRunner"
  | "marble"
  | "carpetL"
  | "carpetC"
  | "carpetR"
  | "topiary"
  | "doorRoyal"
  | "doorGrand";

export type MapId = "campus" | "mc" | "csc" | "pac";

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  roofColor: string;
  roofShadow: string;
  wallColor: string;
  wallShadow: string;
}

// Walking into (x, y) moves the player to another map.
export interface Warp {
  x: number;
  y: number;
  to: MapId;
  toX: number;
  toY: number;
  facing: Direction;
  tunnel?: string; // play the tunnel animation with this caption
}

// A small name plate drawn above tile (x, y), e.g. the sign over the CSC door.
export interface MapLabel {
  x: number;
  y: number;
  text: string;
  accent: string;
}

// A railway crossing sign whose lights flash when an ION train is near crossingX.
export interface Crossbuck {
  x: number;
  y: number;
  crossingX: number;
}

export interface GameMap {
  id: MapId;
  name: string; // shown when you enter the map
  width: number;
  height: number;
  tiles: TileType[][];
  buildings: Building[];
  labels: MapLabel[];
  warps: Warp[];
  trackRows: number[]; // rows the ION trains run along (campus only)
  crossbucks: Crossbuck[];
  background: string; // fill colour around the map when it's smaller than the screen
}

// ============ CAMPUS ============

const CAMPUS_W = 40;
const CAMPUS_H = 30;
const MAIN_PATH_Y = 13;
// Two tracks, one per direction. Trains run on the right, like in Canada:
// westbound on the north track, eastbound on the south track.
const TRACK_ROWS = [10, 11];

// North row: DC, MC, SLC. E7 sits just above the tall grass.
const campusBuildings: Building[] = [
  {
    x: 4,
    y: 3,
    w: 5,
    h: 4,
    label: "DC",
    roofColor: "#c86868",
    roofShadow: "#803838",
    wallColor: "#e8dcc4",
    wallShadow: "#907864",
  },
  {
    x: 17,
    y: 3,
    w: 6,
    h: 4,
    label: "MC",
    roofColor: "#9a9aa6",
    roofShadow: "#5c5c6a",
    wallColor: "#dcd8cc",
    wallShadow: "#8c887c",
  },
  {
    x: 31,
    y: 3,
    w: 5,
    h: 4,
    label: "SLC",
    roofColor: "#e8a860",
    roofShadow: "#a06830",
    wallColor: "#f0d8a8",
    wallShadow: "#a88060",
  },
  {
    x: 17,
    y: 16,
    w: 6,
    h: 4,
    label: "E7",
    roofColor: "#4f8fc0",
    roofShadow: "#2c5a85",
    wallColor: "#e4ebf0",
    wallShadow: "#8898a8",
  },
];

const buildingNamed = (label: string): Building => {
  const b = campusBuildings.find((x) => x.label === label);
  if (!b) throw new Error(`Missing building ${label}`);
  return b;
};
const doorOf = (b: Building) => ({ x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 });

const E7 = buildingNamed("E7");
const E7_DOOR = doorOf(E7);
const MC_DOOR = doorOf(buildingNamed("MC"));

// Vardaan stands just right of E7's front door. The player starts beside him,
// facing him, so the first thing they see is the talk prompt.
export const GUIDE_SPOT = { x: E7_DOOR.x + 1, y: E7_DOOR.y + 1 };
export const SPAWN = { x: GUIDE_SPOT.x + 1, y: GUIDE_SPOT.y, facing: 2 as Direction };

function generateCampus(): { tiles: TileType[][]; crossbucks: Crossbuck[] } {
  const W = CAMPUS_W;
  const H = CAMPUS_H;
  const map: TileType[][] = [];
  for (let y = 0; y < H; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < W; x++) {
      row.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? "tree" : "grass");
    }
    map.push(row);
  }

  const fillRect = (x: number, y: number, w: number, h: number, tile: TileType) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (ty > 0 && ty < H - 1 && tx > 0 && tx < W - 1) map[ty][tx] = tile;
      }
    }
  };
  const setOnGrass = (x: number, y: number, tile: TileType) => {
    if (map[y]?.[x] === "grass") map[y][x] = tile;
  };

  // Main east-west path
  fillRect(1, MAIN_PATH_Y, W - 2, 2, "path");

  // Paths from the north buildings' doors down to the main path. Where they
  // cross the ION tracks they become level crossings.
  const crossingXs: number[] = [];
  for (const b of campusBuildings) {
    if (b.y >= MAIN_PATH_Y) continue;
    const door = doorOf(b);
    fillRect(door.x, door.y + 1, 1, MAIN_PATH_Y - (door.y + 1), "path");
    crossingXs.push(door.x);
  }

  // A path loops around E7 to its front door (doors face south).
  const left = E7.x - 1;
  const right = E7.x + E7.w;
  const frontY = E7.y + E7.h;
  fillRect(left, MAIN_PATH_Y + 2, 1, frontY - (MAIN_PATH_Y + 2) + 1, "path");
  fillRect(right, MAIN_PATH_Y + 2, 1, frontY - (MAIN_PATH_Y + 2) + 1, "path");
  fillRect(left, frontY, right - left + 1, 1, "path");

  // Pond west of E7
  fillRect(8, 16, 4, 3, "water");

  // Tall grass encounter zones
  fillRect(3, 21, 10, 6, "tallGrass");
  fillRect(27, 21, 10, 6, "tallGrass");
  fillRect(15, 21, 8, 3, "tallGrass");

  const flowers: [number, number][] = [
    [2, 8], [3, 8], [2, 9],
    [10, 8], [11, 8],
    [14, 8], [15, 8],
    [26, 8], [27, 8],
    [36, 8], [37, 8], [36, 9],
    [2, 17], [3, 17], [2, 18],
    [13, 17], [13, 18],
    [25, 17], [26, 17],
    [36, 18], [37, 18],
    [5, 28], [6, 28],
    [34, 28], [35, 28],
  ];
  const tufts: [number, number][] = [
    [10, 5], [26, 5], [14, 12], [27, 12], [4, 19], [33, 19],
  ];
  for (const [x, y] of flowers) setOnGrass(x, y, "flower");
  for (const [x, y] of tufts) setOnGrass(x, y, "grassTuft");

  setOnGrass(10, 15, "sign");
  setOnGrass(30, 15, "sign");

  // Buildings
  for (const b of campusBuildings) {
    for (let dy = 0; dy < b.h; dy++) {
      for (let dx = 0; dx < b.w; dx++) {
        const x = b.x + dx;
        const y = b.y + dy;
        if (dy === 0) map[y][x] = "buildingRoofTop";
        else if (dy === 1) map[y][x] = "buildingRoofBase";
        else if (dy === b.h - 1 && dx === Math.floor(b.w / 2)) map[y][x] = "buildingDoor";
        else if (dy === b.h - 2 && (dx === 1 || dx === b.w - 2)) map[y][x] = "buildingWindow";
        else map[y][x] = "buildingWall";
      }
    }
  }

  // ION tracks run the full width of the map, through the tree border, so
  // trains appear to come from off campus.
  for (const row of TRACK_ROWS) {
    for (let x = 0; x < W; x++) {
      map[row][x] = crossingXs.includes(x) ? "trackCrossing" : "track";
    }
  }

  // A crossing sign on each side of every crossing.
  const crossbucks: Crossbuck[] = [];
  for (const cx of crossingXs) {
    const spots: [number, number][] = [
      [cx - 1, TRACK_ROWS[0] - 1],
      [cx + 1, TRACK_ROWS[TRACK_ROWS.length - 1] + 1],
    ];
    for (const [x, y] of spots) {
      map[y][x] = "crossbuck";
      crossbucks.push({ x, y, crossingX: cx });
    }
  }

  return { tiles: map, crossbucks };
}

// ============ INTERIORS ============
// Written as text, one character per tile, so layouts are easy to edit.

const LEGEND: Record<string, TileType> = {
  "#": "void",
  "^": "wallTop",
  "=": "wall",
  W: "wallWindow",
  B: "whiteboard",
  N: "noticeBoard",
  L: "doorLocked",
  C: "doorCSC",
  S: "stairs",
  ".": "floor",
  r: "rug",
  E: "exitMat",
  p: "plant",
  d: "desk",
  c: "couch",
  k: "bookshelf",
  b: "bench",
  U: "doorTunnel",
  H: "hallOfFame",
  P: "pedestal",
  // PAC
  A: "royalTop",
  Q: "royalWall",
  F: "royalBanner",
  O: "royalSconce",
  K: "royalCrest",
  I: "pillar",
  J: "throne",
  Z: "dais",
  Y: "daisFace",
  V: "balustrade",
  X: "banister",
  G: "stairsGrand",
  g: "stairsGrandRunner",
  m: "marble",
  "[": "carpetL",
  _: "carpetC",
  "]": "carpetR",
  t: "topiary",
  R: "doorRoyal",
  D: "doorGrand",
};

const parseRows = (id: string, rows: string[]): TileType[][] => {
  const width = rows[0].length;
  return rows.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Map ${id}: row ${y} is ${row.length} wide, expected ${width}`);
    }
    return Array.from(row).map((ch, x) => {
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`Map ${id}: unknown tile "${ch}" at ${x},${y}`);
      return tile;
    });
  });
};

// MC hallway: stairs in the corner, a row of office doors, and a rug that
// leads from the entrance to the CSC office door (C). U is the tunnel to PAC.
const MC_ROWS = [
  "#^^^^^^^^^^^^^^^^^^#",
  "#SS==L=N=L===C==U==#",
  "#SS..........r...p.#",
  "#.........rrrr.....#",
  "#.........r........#",
  "#.........r........#",
  "#.........r........#",
  "#.........r........#",
  "#.........r........#",
  "#.........r........#",
  "#pbb......r....bbp.#",
  "##########E#########",
];
const MC_CSC_DOOR = { x: 13, y: 1 };
const MC_TUNNEL_DOOR = { x: 16, y: 1 };
const MC_EXIT = { x: 10, y: 11 };

// CSC office: computers along the back wall, a couch, and Codey on the rug.
// H is the Hall of Fame plaque; P is the pedestal an honoured trainer stands on.
const CSC_ROWS = [
  "#^^^^^^^^^^^#",
  "#=W=N=B===H=#",
  "#kddd...dddp#",
  "#k..........#",
  "#....rrr..P.#",
  "#....rrr....#",
  "#.......ccc.#",
  "#p..........#",
  "######E######",
];
const CSC_EXIT = { x: 6, y: 8 };
export const HALL_OF_FAME_SPOT = { x: 10, y: 4 };

// PAC gym hall: a red carpet runs from the entrance up a wide staircase to the
// Gym Leader's throne on a raised platform. Three doors along the bottom wall.
const PAC_ROWS = [
  "#AAAAAAAAAAAAAAAAAAA#",
  "#QFQOQFQOQKQOQFQOQFQ#",
  "#IZZZZZZZZJZZZZZZZZI#",
  "#IZZZZZZZZZZZZZZZZZI#",
  "#IVVVVVVVZZZVVVVVVVI#",
  "#YYYYYYYXGgGXYYYYYYY#",
  "#YYYYYYYXGgGXYYYYYYY#",
  "#YYYYYYYXGgGXYYYYYYY#",
  "#tmmImmmm[_]mmmmImmt#",
  "#mmmmmmmm[_]mmmmmmmm#",
  "#tmmImmmm[_]mmmmImmt#",
  "#mmmmmmmm[_]mmmmmmmm#",
  "#tmmImmmm[_]mmmmImmt#",
  "#mmmmmmmm[_]mmmmmmmm#",
  "#mmmmmmmm[_]mmmmmmmm#",
  "#QQQRQQQQQDQQQQQRQQQ#",
];
const PAC_ENTRANCE = { x: 10, y: 15 };

const makeInterior = (
  id: MapId,
  name: string,
  rows: string[],
  labels: MapLabel[],
  warps: Warp[]
): GameMap => {
  const tiles = parseRows(id, rows);
  return {
    id,
    name,
    width: tiles[0].length,
    height: tiles.length,
    tiles,
    buildings: [],
    labels,
    warps,
    trackRows: [],
    crossbucks: [],
    background: "#1c1724",
  };
};

const campus = generateCampus();

export const MAPS: Record<MapId, GameMap> = {
  campus: {
    id: "campus",
    name: "University of Waterloo",
    width: CAMPUS_W,
    height: CAMPUS_H,
    tiles: campus.tiles,
    buildings: campusBuildings,
    labels: [],
    warps: [{ x: MC_DOOR.x, y: MC_DOOR.y, to: "mc", toX: MC_EXIT.x, toY: MC_EXIT.y - 1, facing: 1 }],
    trackRows: TRACK_ROWS,
    crossbucks: campus.crossbucks,
    background: "#0f172a",
  },
  mc: makeInterior(
    "mc",
    "MC: Mathematics & Computer Building",
    MC_ROWS,
    [
      { x: MC_CSC_DOOR.x, y: MC_CSC_DOOR.y, text: "CSC", accent: "#3b82f6" },
      { x: MC_TUNNEL_DOOR.x, y: MC_TUNNEL_DOOR.y, text: "PAC", accent: "#eab308" },
    ],
    [
      { x: MC_EXIT.x, y: MC_EXIT.y, to: "campus", toX: MC_DOOR.x, toY: MC_DOOR.y + 1, facing: 0 },
      { x: MC_CSC_DOOR.x, y: MC_CSC_DOOR.y, to: "csc", toX: CSC_EXIT.x, toY: CSC_EXIT.y - 1, facing: 1 },
      {
        x: MC_TUNNEL_DOOR.x,
        y: MC_TUNNEL_DOOR.y,
        to: "pac",
        toX: PAC_ENTRANCE.x,
        toY: PAC_ENTRANCE.y - 1,
        facing: 1,
        tunnel: "Walking through the tunnel to PAC...",
      },
    ]
  ),
  csc: makeInterior(
    "csc",
    "CSC Office",
    CSC_ROWS,
    [],
    [{ x: CSC_EXIT.x, y: CSC_EXIT.y, to: "mc", toX: MC_CSC_DOOR.x, toY: MC_CSC_DOOR.y + 1, facing: 0 }]
  ),
  pac: {
    ...makeInterior(
      "pac",
      "PAC: Physical Activities Complex",
      PAC_ROWS,
      [],
      [
        {
          x: PAC_ENTRANCE.x,
          y: PAC_ENTRANCE.y,
          to: "mc",
          toX: MC_TUNNEL_DOOR.x,
          toY: MC_TUNNEL_DOOR.y + 1,
          facing: 0,
          tunnel: "Walking back through the tunnel to MC...",
        },
      ]
    ),
    background: "#140a0e",
  },
};

// ============ RULES ============

const WALKABLE = new Set<TileType>([
  "grass",
  "grassTuft",
  "path",
  "flower",
  "tallGrass",
  "trackCrossing",
  "floor",
  "rug",
  "dais",
  "stairsGrand",
  "stairsGrandRunner",
  "marble",
  "carpetL",
  "carpetC",
  "carpetR",
]);

export const isSolid = (tile: TileType): boolean => !WALKABLE.has(tile);

export const isTallGrass = (tile: TileType): boolean => tile === "tallGrass";

export const buildingAt = (map: GameMap, x: number, y: number): Building | undefined =>
  map.buildings.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);

export const warpAt = (map: GameMap, x: number, y: number): Warp | undefined =>
  map.warps.find((w) => w.x === x && w.y === y);

// Shown when the player walks into something they can't pass.
export const bumpMessage = (map: GameMap, x: number, y: number): string | null => {
  switch (map.tiles[y]?.[x]) {
    case "buildingDoor": {
      const b = buildingAt(map, x, y);
      return b ? `${b.label} is locked right now.` : "It's locked.";
    }
    case "doorLocked":
      return "This door is locked.";
    case "doorRoyal":
      return "This door is locked for now.";
    case "daisFace":
    case "balustrade":
    case "banister":
      return "The platform is too high. Take the stairs.";
    case "stairs":
      return "The upper floors are closed off for now.";
    case "track":
      return "Stay off the tracks! Cross at a crossing.";
    default:
      return null;
  }
};

const EXAMINE_TEXT: Partial<Record<TileType, string>> = {
  desk: "A computer is halfway through a very long compile.",
  bookshelf: "Shelves of old textbooks and printed assignments.",
  whiteboard: "Someone left half a proof on the whiteboard.",
  noticeBoard: "Posters for club events, hackathons and free food.",
  couch: "A well-loved couch. It has seen a lot of all-nighters.",
  bench: "A bench. Students nap here between lectures.",
  plant: "A potted plant. Someone waters it, probably.",
  wallWindow: "You can see campus through the window.",
  crossbuck: "ION crossing. Look both ways.",
  sign: "A campus sign. You are here.",
  water: "A pond. The geese love it here.",
  hallOfFame: "CSC Hall of Fame. Trainers who catch a legendary are honoured here.",
  pedestal: "An empty pedestal. The plaque reads: reserved for a trainer who catches a legendary.",
  throne: "The Gym Leader's throne. Nobody's here yet.",
  royalCrest: "A gold crest. This is where the Waterloo Gym Leaders battle.",
  royalBanner: "A black and gold banner.",
  royalSconce: "A torch flickers on the wall.",
  pillar: "A marble pillar with a gold capital.",
  topiary: "A neatly trimmed topiary in a gold pot.",
};

// Shown when the player faces something and presses the action button.
export const examineMessage = (map: GameMap, x: number, y: number): string | null => {
  const tile = map.tiles[y]?.[x];
  if (!tile) return null;
  return bumpMessage(map, x, y) ?? EXAMINE_TEXT[tile] ?? null;
};

// Fail fast on layout mistakes, such as a warp that lands inside a wall.
const validateMaps = () => {
  const walkable = (id: MapId, x: number, y: number) => {
    const tile = MAPS[id].tiles[y]?.[x];
    return tile !== undefined && WALKABLE.has(tile);
  };
  for (const map of Object.values(MAPS)) {
    for (const w of map.warps) {
      if (!walkable(w.to, w.toX, w.toY)) {
        throw new Error(`Warp from ${map.id} ${w.x},${w.y} lands on a solid tile in ${w.to}`);
      }
    }
  }
  if (!walkable("campus", SPAWN.x, SPAWN.y)) throw new Error("Spawn is on a solid tile");
  if (!walkable("campus", GUIDE_SPOT.x, GUIDE_SPOT.y)) throw new Error("Guide spot is on a solid tile");
  if (MAPS.csc.tiles[HALL_OF_FAME_SPOT.y][HALL_OF_FAME_SPOT.x] !== "pedestal") {
    throw new Error("Hall of Fame spot is not on the pedestal");
  }
};
validateMaps();
