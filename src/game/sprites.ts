// Procedurally-drawn sprites in a bright GBA-era overworld style.
// All art is drawn from scratch in code — no external assets.

import { TILE_SIZE, TileType, Building } from "./world";
import { PokemonSpecies } from "./pokemon";

const PIX = TILE_SIZE / 10;

const P = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  gx: number,
  gy: number,
  w: number,
  h: number,
  color: string
) => {
  ctx.fillStyle = color;
  ctx.fillRect(x + gx * PIX, y + gy * PIX, w * PIX, h * PIX);
};

// ============ GRASS FAMILY ============

const drawGrass = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  // Bright saturated GBA-style green base
  ctx.fillStyle = "#78c850";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Dotted texture pattern (like the reference screenshot)
  const darker = "#5ea838";
  P(ctx, x, y, 1, 2, 1, 1, darker);
  P(ctx, x, y, 4, 1, 1, 1, darker);
  P(ctx, x, y, 7, 3, 1, 1, darker);
  P(ctx, x, y, 2, 5, 1, 1, darker);
  P(ctx, x, y, 5, 6, 1, 1, darker);
  P(ctx, x, y, 8, 7, 1, 1, darker);
  P(ctx, x, y, 0, 8, 1, 1, darker);
  // Occasional brighter highlight for depth
  P(ctx, x, y, 3, 3, 1, 1, "#98d868");
  P(ctx, x, y, 6, 8, 1, 1, "#98d868");
};

const drawGrassTuft = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawGrass(ctx, x, y);
  // A small clump of taller blades
  P(ctx, x, y, 3, 4, 1, 3, "#387028");
  P(ctx, x, y, 4, 3, 1, 4, "#387028");
  P(ctx, x, y, 5, 4, 1, 3, "#387028");
  P(ctx, x, y, 4, 3, 1, 1, "#58a840");
};

const drawTallGrass = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  // Darker, denser grass field (encounter zone)
  ctx.fillStyle = "#487830";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Vertical blade shapes suggesting height
  const blade = "#68a848";
  const bladeDark = "#305818";
  for (let i = 0; i < 5; i++) {
    P(ctx, x, y, i * 2, 2, 1, 6, blade);
    P(ctx, x, y, i * 2, 7, 1, 1, bladeDark);
  }
  for (let i = 0; i < 4; i++) {
    P(ctx, x, y, 1 + i * 2, 3, 1, 5, bladeDark);
    P(ctx, x, y, 1 + i * 2, 3, 1, 1, blade);
  }
  // Top edge highlight
  P(ctx, x, y, 0, 0, 10, 1, "#5a9038");
  P(ctx, x, y, 1, 0, 1, 1, "#78b850");
  P(ctx, x, y, 5, 0, 1, 1, "#78b850");
};

// ============ PATH / WATER ============

const drawPath = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#e8c878";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  P(ctx, x, y, 2, 3, 1, 1, "#c8a858");
  P(ctx, x, y, 6, 6, 1, 1, "#c8a858");
  P(ctx, x, y, 5, 2, 1, 1, "#f0d888");
  P(ctx, x, y, 8, 5, 1, 1, "#f0d888");
};

const drawDoorStep = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawGrass(ctx, x, y);
  // Warm-glow doorstep like in the reference
  P(ctx, x, y, 3, 3, 4, 4, "#f8e0a0");
  P(ctx, x, y, 3, 3, 4, 1, "#f0c878");
  P(ctx, x, y, 3, 6, 4, 1, "#d0a860");
};

const drawWater = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  animFrame: number
) => {
  ctx.fillStyle = "#3878c8";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  const off = animFrame === 0 ? 0 : 1;
  P(ctx, x, y, 1 + off, 2, 3, 1, "#5090d8");
  P(ctx, x, y, 5 + off, 6, 3, 1, "#5090d8");
  P(ctx, x, y, 2 + off, 2, 1, 1, "#a0c8f0");
  P(ctx, x, y, 6 + off, 6, 1, 1, "#a0c8f0");
};

// ============ TREES ============

const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawGrass(ctx, x, y);
  // Round bushy canopy — top-down view like the reference
  const dark = "#204818";
  const mid = "#386828";
  const light = "#588838";
  const highlight = "#78a848";

  // Outline
  P(ctx, x, y, 1, 1, 8, 8, dark);
  // Main body
  P(ctx, x, y, 2, 1, 6, 8, mid);
  P(ctx, x, y, 1, 2, 8, 6, mid);
  // Lighter fill
  P(ctx, x, y, 2, 2, 6, 6, light);
  // Top-left highlight cluster
  P(ctx, x, y, 3, 2, 3, 2, highlight);
  P(ctx, x, y, 2, 3, 2, 2, highlight);
  // Small dark speckles suggesting leaf gaps
  P(ctx, x, y, 5, 5, 1, 1, mid);
  P(ctx, x, y, 6, 3, 1, 1, mid);
  P(ctx, x, y, 3, 6, 1, 1, mid);
  P(ctx, x, y, 7, 6, 1, 1, dark);
};

// ============ FLOWERS ============

const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawGrass(ctx, x, y);
  // Red flower cluster like the reference screenshot
  const petal = "#e04848";
  const petalDark = "#a02020";
  const center = "#f8d038";
  // Small cross of red petals
  P(ctx, x, y, 4, 3, 2, 1, petal);
  P(ctx, x, y, 3, 4, 4, 2, petal);
  P(ctx, x, y, 4, 6, 2, 1, petal);
  // Dark accents
  P(ctx, x, y, 3, 4, 1, 1, petalDark);
  P(ctx, x, y, 6, 5, 1, 1, petalDark);
  // Yellow center
  P(ctx, x, y, 4, 4, 2, 2, center);
  P(ctx, x, y, 4, 4, 1, 1, "#ffe870");
  // Stem hint
  P(ctx, x, y, 4, 7, 2, 1, "#387028");
};

// ============ MAILBOX SIGN ============

const drawSign = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawGrass(ctx, x, y);
  // Post
  P(ctx, x, y, 4, 6, 2, 3, "#584038");
  // Sign box — cool blue-grey like the mailboxes in the reference
  P(ctx, x, y, 2, 2, 6, 5, "#9098b8");
  P(ctx, x, y, 2, 2, 6, 1, "#585878");
  P(ctx, x, y, 2, 6, 6, 1, "#585878");
  P(ctx, x, y, 2, 2, 1, 5, "#585878");
  P(ctx, x, y, 7, 2, 1, 5, "#585878");
  // Envelope icon on the front
  P(ctx, x, y, 3, 3, 4, 3, "#f0f0f8");
  P(ctx, x, y, 3, 3, 4, 1, "#c8c8d0");
  P(ctx, x, y, 3, 3, 2, 2, "#c8c8d0");
  P(ctx, x, y, 5, 3, 2, 2, "#c8c8d0");
  P(ctx, x, y, 4, 4, 2, 1, "#585878");
};

// ============ BUILDINGS ============

const drawBuildingRoofTop = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  roof: string,
  shadow: string
) => {
  ctx.fillStyle = roof;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Dark outline on top
  P(ctx, x, y, 0, 0, 10, 1, shadow);
  // Ridge tiles across the top (Pokemon-house style horizontal cap)
  P(ctx, x, y, 0, 1, 10, 2, shadow);
  P(ctx, x, y, 1, 2, 8, 1, roof);
  // Small highlight along the top
  P(ctx, x, y, 2, 1, 2, 1, "#f8b878");
  P(ctx, x, y, 6, 1, 2, 1, "#f8b878");
  // Tile texture below the ridge
  P(ctx, x, y, 0, 6, 10, 1, shadow);
  for (let i = 0; i < 5; i++) {
    P(ctx, x, y, i * 2, 5, 1, 1, shadow);
  }
  for (let i = 0; i < 4; i++) {
    P(ctx, x, y, 1 + i * 2, 8, 1, 1, shadow);
  }
};

const drawBuildingRoofBase = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  roof: string,
  shadow: string
) => {
  ctx.fillStyle = roof;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Shingle rows
  const rowShade = shadow;
  P(ctx, x, y, 0, 1, 10, 1, rowShade);
  for (let i = 0; i < 5; i++) {
    P(ctx, x, y, i * 2, 0, 1, 1, rowShade);
  }
  P(ctx, x, y, 0, 4, 10, 1, rowShade);
  for (let i = 0; i < 4; i++) {
    P(ctx, x, y, 1 + i * 2, 3, 1, 1, rowShade);
  }
  P(ctx, x, y, 0, 7, 10, 1, rowShade);
  for (let i = 0; i < 5; i++) {
    P(ctx, x, y, i * 2, 6, 1, 1, rowShade);
  }
  // Bottom edge overhang
  P(ctx, x, y, 0, 9, 10, 1, "#4a2818");
  P(ctx, x, y, 0, 8, 10, 1, rowShade);
};

const drawBuildingWall = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wall: string,
  shadow: string
) => {
  ctx.fillStyle = wall;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Top strip (cornice under the roof)
  P(ctx, x, y, 0, 0, 10, 1, shadow);
  // Foundation stones at the bottom
  P(ctx, x, y, 0, 8, 10, 2, "#787868");
  P(ctx, x, y, 0, 8, 10, 1, "#a8a898");
  // Stone segments
  for (let i = 0; i < 5; i++) {
    P(ctx, x, y, i * 2, 9, 1, 1, "#585848");
  }
};

const drawBuildingWindow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wall: string,
  shadow: string
) => {
  drawBuildingWall(ctx, x, y, wall, shadow);
  // Window frame
  P(ctx, x, y, 1, 2, 8, 5, "#403830");
  P(ctx, x, y, 2, 3, 6, 3, "#68a0d8");
  // Glass highlights
  P(ctx, x, y, 2, 3, 3, 1, "#a8c8f0");
  P(ctx, x, y, 2, 3, 1, 2, "#a8c8f0");
  // Muntin cross
  P(ctx, x, y, 4, 3, 1, 3, "#403830");
  P(ctx, x, y, 2, 4, 6, 1, "#403830");
  // Sill
  P(ctx, x, y, 1, 6, 8, 1, "#585048");
};

const drawBuildingDoor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wall: string,
  shadow: string
) => {
  drawBuildingWall(ctx, x, y, wall, shadow);
  // Door frame (darker wood)
  P(ctx, x, y, 2, 1, 6, 7, "#3a2010");
  // Door panel (lighter wood)
  P(ctx, x, y, 3, 2, 4, 6, "#8a5828");
  P(ctx, x, y, 3, 2, 4, 1, "#a87038");
  // Wood grain lines
  P(ctx, x, y, 3, 4, 4, 1, "#6a4018");
  P(ctx, x, y, 3, 6, 4, 1, "#6a4018");
  // Doorknob
  P(ctx, x, y, 6, 5, 1, 1, "#f0d060");
  // Doorstep on top of foundation
  P(ctx, x, y, 2, 8, 6, 1, "#a89078");
};

// ============ ION TRACKS ============

const RAIL = "#c9ced6";
const RAIL_SHADOW = "#6e737c";

const drawRails = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  P(ctx, x, y, 0, 2.5, 10, 1, RAIL);
  P(ctx, x, y, 0, 3.5, 10, 0.5, RAIL_SHADOW);
  P(ctx, x, y, 0, 6.5, 10, 1, RAIL);
  P(ctx, x, y, 0, 7.5, 10, 0.5, RAIL_SHADOW);
};

const drawTrack = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  // Gravel ballast
  ctx.fillStyle = "#8f877a";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  P(ctx, x, y, 1, 0.5, 1, 1, "#7a7266");
  P(ctx, x, y, 6, 0, 1, 1, "#a59d90");
  P(ctx, x, y, 3, 9, 1, 1, "#7a7266");
  P(ctx, x, y, 8, 8.8, 1, 1, "#a59d90");
  // Wooden ties, evenly spaced so the pattern tiles seamlessly
  for (const tx of [0.5, 3, 5.5, 8]) {
    P(ctx, x, y, tx, 1.5, 1.5, 7, "#6b4a2e");
    P(ctx, x, y, tx, 1.5, 1.5, 0.5, "#86603c");
  }
  drawRails(ctx, x, y);
};

const drawTrackCrossing = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  // Concrete crossing panels with the rails set flush into them
  ctx.fillStyle = "#d8cfb8";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  P(ctx, x, y, 0, 0, 0.25, 10, "#b8ae96");
  P(ctx, x, y, 5, 0, 0.25, 10, "#b8ae96");
  P(ctx, x, y, 2, 5, 1, 1, "#c8bfa6");
  P(ctx, x, y, 7, 1, 1, 1, "#e6dfcc");
  drawRails(ctx, x, y);
};

// Lamp positions on the crossing sign, shared with the flashing-light overlay.
const LAMP_LEFT = { gx: 3, gy: 5.3 };
const LAMP_RIGHT = { gx: 6, gy: 5.3 };

const drawCrossbuck = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawGrass(ctx, x, y);
  // Post
  P(ctx, x, y, 4.5, 3, 1, 6.5, "#6b6f78");
  P(ctx, x, y, 4.5, 3, 0.3, 6.5, "#8c919b");
  // Lamp housing (lamps light up when a train is coming)
  P(ctx, x, y, 2.5, 5, 5, 1.6, "#1f2328");
  P(ctx, x, y, LAMP_LEFT.gx, LAMP_LEFT.gy, 1, 1, "#4a1d1d");
  P(ctx, x, y, LAMP_RIGHT.gx, LAMP_RIGHT.gy, 1, 1, "#4a1d1d");
  // The white X with a red border
  const cx = x + 5 * PIX;
  const cy = y + 2.4 * PIX;
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(-3.3 * PIX, -0.7 * PIX, 6.6 * PIX, 1.4 * PIX);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3 * PIX, -0.42 * PIX, 6 * PIX, 0.84 * PIX);
    ctx.restore();
  }
};

// Drawn every frame on top of a crossbuck tile while a train is near.
export const drawCrossingLights = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  leftLit: boolean
) => {
  const lamp = leftLit ? LAMP_LEFT : LAMP_RIGHT;
  const lx = x + (lamp.gx + 0.5) * PIX;
  const ly = y + (lamp.gy + 0.5) * PIX;
  ctx.fillStyle = "rgba(255, 70, 50, 0.35)";
  ctx.beginPath();
  ctx.arc(lx, ly, 2.2 * PIX, 0, Math.PI * 2);
  ctx.fill();
  P(ctx, x, y, lamp.gx, lamp.gy, 1, 1, "#ff3b30");
};

// ============ INDOORS ============

const drawVoid = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#1c1724";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
};

const drawWallTop = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#3a3346";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  P(ctx, x, y, 0, 8.5, 10, 1.5, "#5a5068");
  P(ctx, x, y, 0, 8.5, 10, 0.4, "#6e6480");
};

const drawWall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#e9e0cf";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Picture rail near the top and a baseboard at the bottom
  P(ctx, x, y, 0, 1, 10, 0.6, "#cfc3ad");
  P(ctx, x, y, 0, 8.4, 10, 1.6, "#8a7660");
  P(ctx, x, y, 0, 8.4, 10, 0.4, "#a8937a");
};

const drawWallWindow = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawWall(ctx, x, y);
  P(ctx, x, y, 1.5, 2, 7, 5.5, "#5b6170");
  P(ctx, x, y, 2, 2.5, 6, 4.5, "#9fd0ee");
  P(ctx, x, y, 2, 2.5, 6, 1, "#d8eef9");
  P(ctx, x, y, 4.75, 2.5, 0.5, 4.5, "#5b6170");
  P(ctx, x, y, 1.2, 7.4, 7.6, 0.6, "#c9bea9");
};

const drawWhiteboard = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawWall(ctx, x, y);
  P(ctx, x, y, 0.8, 2, 8.4, 5.5, "#8d939c");
  P(ctx, x, y, 1.2, 2.4, 7.6, 4.7, "#f7f8fa");
  // Scribbles
  P(ctx, x, y, 2, 3.2, 3, 0.4, "#2563eb");
  P(ctx, x, y, 2, 4.2, 4.5, 0.4, "#2563eb");
  P(ctx, x, y, 2, 5.2, 2, 0.4, "#dc2626");
  P(ctx, x, y, 5.5, 5.2, 2, 0.4, "#2563eb");
  // Marker tray
  P(ctx, x, y, 1, 7.4, 8, 0.5, "#6b717a");
};

const drawNoticeBoard = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawWall(ctx, x, y);
  P(ctx, x, y, 1, 2, 8, 5.5, "#7a5432");
  P(ctx, x, y, 1.4, 2.4, 7.2, 4.7, "#c9955a");
  // Posters with pins
  P(ctx, x, y, 2, 2.9, 2.2, 2.6, "#ffffff");
  P(ctx, x, y, 4.8, 3.2, 2.4, 1.8, "#fde68a");
  P(ctx, x, y, 2.6, 5.6, 2.2, 1.2, "#bfdbfe");
  P(ctx, x, y, 5.4, 5.3, 2.2, 1.5, "#fbcfe8");
  P(ctx, x, y, 3, 2.8, 0.4, 0.4, "#dc2626");
  P(ctx, x, y, 5.9, 3.1, 0.4, 0.4, "#2563eb");
};

const drawInteriorDoor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  door: string,
  doorDark: string,
  windowColor: string
) => {
  drawWall(ctx, x, y);
  P(ctx, x, y, 2, 1, 6, 9, "#5a4632");
  P(ctx, x, y, 2.5, 1.5, 5, 8.5, door);
  P(ctx, x, y, 2.5, 1.5, 5, 0.5, shade(door, 20));
  // Small window in the door
  P(ctx, x, y, 3.5, 2.5, 3, 2, doorDark);
  P(ctx, x, y, 3.8, 2.8, 2.4, 1.4, windowColor);
  // Handle
  P(ctx, x, y, 6.3, 5.8, 0.6, 0.6, "#e5c158");
};

const drawStairs = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#8f836e";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Four steps: light tread, dark riser
  for (let i = 0; i < 4; i++) {
    const gy = i * 2.5;
    P(ctx, x, y, 0, gy, 10, 1.7, "#c2b6a0");
    P(ctx, x, y, 0, gy + 1.7, 10, 0.8, "#6f6553");
  }
  // Handrail
  P(ctx, x, y, 0, 0, 0.8, 10, "#4a3a2a");
};

const drawFloor = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#d6d0c2";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  P(ctx, x, y, 0, 0, 10, 0.25, "#bfb8a8");
  P(ctx, x, y, 0, 0, 0.25, 10, "#bfb8a8");
  P(ctx, x, y, 3, 6, 1, 0.5, "#c9c2b2");
  P(ctx, x, y, 7, 2, 0.5, 0.5, "#e2ddd1");
};

const drawRug = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "#9e3b3b";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  P(ctx, x, y, 1, 2, 1, 1, "#8a3131");
  P(ctx, x, y, 6, 1, 1, 1, "#b04848");
  P(ctx, x, y, 4, 6, 1, 1, "#8a3131");
  P(ctx, x, y, 8, 8, 1, 1, "#b04848");
};

const drawExitMat = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawFloor(ctx, x, y);
  P(ctx, x, y, 1, 1.5, 8, 7, "#7a6650");
  P(ctx, x, y, 1.6, 2.1, 6.8, 5.8, "#5b4a3a");
  // Light spilling in from outside
  P(ctx, x, y, 2.5, 8.6, 5, 1.4, "#f3e7c4");
};

const drawPlant = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawFloor(ctx, x, y);
  P(ctx, x, y, 3, 6, 4, 3, "#b5643c");
  P(ctx, x, y, 2.6, 6, 4.8, 0.8, "#cf7b50");
  P(ctx, x, y, 2, 1.5, 6, 4.8, "#3f8f3f");
  P(ctx, x, y, 3, 1, 4, 1, "#3f8f3f");
  P(ctx, x, y, 3, 2, 2, 2, "#5fb05f");
  P(ctx, x, y, 6, 3.5, 1.5, 1.5, "#5fb05f");
};

const drawDesk = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawFloor(ctx, x, y);
  // Desk
  P(ctx, x, y, 0, 5, 10, 2, "#9a6b45");
  P(ctx, x, y, 0, 7, 10, 3, "#7d5436");
  P(ctx, x, y, 0, 5, 10, 0.4, "#b8845a");
  // Monitor with code on it
  P(ctx, x, y, 2, 0.5, 6, 4, "#23262e");
  P(ctx, x, y, 2.5, 1, 5, 3, "#1e3a5f");
  P(ctx, x, y, 3, 1.5, 2.5, 0.4, "#5ee39a");
  P(ctx, x, y, 3.5, 2.2, 3, 0.4, "#93c5fd");
  P(ctx, x, y, 3, 2.9, 2, 0.4, "#5ee39a");
  P(ctx, x, y, 4.5, 4.5, 1, 0.6, "#3a3d45");
  // Keyboard
  P(ctx, x, y, 2.5, 5.6, 5, 1, "#d4d7dd");
};

const drawCouch = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawFloor(ctx, x, y);
  P(ctx, x, y, 0, 1.5, 10, 4, "#41548a"); // back
  P(ctx, x, y, 0, 1.5, 10, 0.6, "#5568a0");
  P(ctx, x, y, 0, 5.5, 10, 3, "#5568a0"); // seat cushion
  P(ctx, x, y, 0, 5.5, 10, 0.5, "#6a7db5");
  P(ctx, x, y, 0, 8.5, 10, 1, "#2f3d66");
  P(ctx, x, y, 9.7, 1.5, 0.3, 7, "#2f3d66"); // seam between cushions
};

const drawBookshelf = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawFloor(ctx, x, y);
  P(ctx, x, y, 0.5, 0, 9, 10, "#6b4a2e");
  const books = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2"];
  for (let shelf = 0; shelf < 3; shelf++) {
    const gy = 0.6 + shelf * 3.1;
    P(ctx, x, y, 1, gy, 8, 2.6, "#4a321e");
    for (let i = 0; i < 5; i++) {
      const h = 2 + ((i + shelf) % 3) * 0.2;
      P(ctx, x, y, 1.3 + i * 1.5, gy + 2.6 - h, 1.2, h, books[(i + shelf * 2) % books.length]);
    }
    P(ctx, x, y, 0.5, gy + 2.6, 9, 0.5, "#8a6440");
  }
};

const drawBench = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  drawFloor(ctx, x, y);
  P(ctx, x, y, 0, 3, 10, 1.2, "#a0703f");
  P(ctx, x, y, 0, 4.6, 10, 1.2, "#a0703f");
  P(ctx, x, y, 0, 3, 10, 0.3, "#bd8a54");
  P(ctx, x, y, 1, 5.8, 1, 3, "#4a3a2a");
  P(ctx, x, y, 8, 5.8, 1, 3, "#4a3a2a");
};

// ============ DISPATCH ============

export const drawTile = (
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  x: number,
  y: number,
  animFrame: number,
  buildingLookup?: (px: number, py: number) => Building | undefined,
  tx?: number,
  ty?: number
) => {
  switch (tile) {
    case "grass":
      return drawGrass(ctx, x, y);
    case "grassTuft":
      return drawGrassTuft(ctx, x, y);
    case "path":
      return drawPath(ctx, x, y);
    case "water":
      return drawWater(ctx, x, y, animFrame);
    case "tree":
      return drawTree(ctx, x, y);
    case "flower":
      return drawFlower(ctx, x, y);
    case "sign":
      return drawSign(ctx, x, y);
    case "tallGrass":
      return drawTallGrass(ctx, x, y);
    case "doorStep":
      return drawDoorStep(ctx, x, y);
    case "sand":
      return drawPath(ctx, x, y);
    case "track":
      return drawTrack(ctx, x, y);
    case "trackCrossing":
      return drawTrackCrossing(ctx, x, y);
    case "crossbuck":
      return drawCrossbuck(ctx, x, y);
    case "void":
      return drawVoid(ctx, x, y);
    case "wallTop":
      return drawWallTop(ctx, x, y);
    case "wall":
      return drawWall(ctx, x, y);
    case "wallWindow":
      return drawWallWindow(ctx, x, y);
    case "whiteboard":
      return drawWhiteboard(ctx, x, y);
    case "noticeBoard":
      return drawNoticeBoard(ctx, x, y);
    case "doorLocked":
      return drawInteriorDoor(ctx, x, y, "#8a6a4a", "#3a2c1e", "#4b5563");
    case "doorCSC":
      // Lit window: this is the one door that's open
      return drawInteriorDoor(ctx, x, y, "#3f6fb0", "#1e3a66", "#ffe9a8");
    case "stairs":
      return drawStairs(ctx, x, y);
    case "floor":
      return drawFloor(ctx, x, y);
    case "rug":
      return drawRug(ctx, x, y);
    case "exitMat":
      return drawExitMat(ctx, x, y);
    case "plant":
      return drawPlant(ctx, x, y);
    case "desk":
      return drawDesk(ctx, x, y);
    case "couch":
      return drawCouch(ctx, x, y);
    case "bookshelf":
      return drawBookshelf(ctx, x, y);
    case "bench":
      return drawBench(ctx, x, y);
    case "buildingRoofTop":
    case "buildingRoofBase":
    case "buildingWall":
    case "buildingWindow":
    case "buildingDoor": {
      const b =
        buildingLookup && tx !== undefined && ty !== undefined
          ? buildingLookup(tx, ty)
          : undefined;
      const wall = b?.wallColor ?? "#f0dcb4";
      const wallShadow = b?.wallShadow ?? "#a88860";
      const roof = b?.roofColor ?? "#e88a4a";
      const roofShadow = b?.roofShadow ?? "#a85220";
      if (tile === "buildingRoofTop")
        return drawBuildingRoofTop(ctx, x, y, roof, roofShadow);
      if (tile === "buildingRoofBase")
        return drawBuildingRoofBase(ctx, x, y, roof, roofShadow);
      if (tile === "buildingWall")
        return drawBuildingWall(ctx, x, y, wall, wallShadow);
      if (tile === "buildingWindow")
        return drawBuildingWindow(ctx, x, y, wall, wallShadow);
      return drawBuildingDoor(ctx, x, y, wall, wallShadow);
    }
  }
};

// ============ TILE CACHE ============
// Rendering each tile with dozens of fillRect calls every frame is expensive
// (thousands of calls per frame on mobile → choppy). Instead we render each
// unique tile once into a small offscreen canvas and blit it with drawImage,
// which is dramatically faster.
const tileCache = new Map<string, HTMLCanvasElement>();

const getTileCanvas = (
  tile: TileType,
  animFrame: number,
  building?: Building
): HTMLCanvasElement => {
  const isBuilding = tile.startsWith("building");
  const key = isBuilding
    ? `${tile}|${building?.roofColor ?? ""}|${building?.wallColor ?? ""}`
    : `${tile}|${tile === "water" ? animFrame : 0}`;

  let c = tileCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const g = c.getContext("2d");
    if (g) {
      g.imageSmoothingEnabled = false;
      // Reuse the existing draw dispatch; building tiles get a constant lookup.
      drawTile(g, tile, 0, 0, animFrame, building ? () => building : undefined, 0, 0);
    }
    tileCache.set(key, c);
  }
  return c;
};

// Fast path used by the game loop: blit a cached tile image.
export const drawTileCached = (
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  x: number,
  y: number,
  animFrame: number,
  building?: Building
) => {
  const c = getTileCanvas(tile, animFrame, building);
  ctx.drawImage(c, x, y);
};

// ============ CHARACTER ============
// Detailed RSE-style character drawn on a 20x20 sub-pixel grid (half-PIX cells)
// with saturated palette, multi-tone shading, and centered single-color eyes.

export type OutfitStyle = "casual" | "trainer" | "labCoat" | "officeCoat";

export const drawCharacter = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shirtColor: string,
  hairColor: string,
  direction: number,
  walkFrame: number,
  accessory?: "resume" | null,
  outfit: OutfitStyle = "casual"
) => {
  const bob = walkFrame === 1 ? PIX / 2 : 0;
  const cy = y + bob;
  const p = PIX / 2; // 2px sub-cell (20x20 grid)

  // Derived palette
  const skin = "#f8d0a8";
  const skinShadow = "#c48868";
  const skinLight = "#ffe4c0";
  const outline = "#1a1008";
  const hair = hairColor;
  const hairDark = shade(hairColor, -32);
  const shirt = shirtColor;
  const shirtDark = shade(shirtColor, -32);
  const shirtLight = shade(shirtColor, 18);
  const pants = "#385878";
  const pantsDark = "#1e3450";
  const shoe = "#1a1008";

  const Q = (gx: number, gy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + gx * p, cy + gy * p, w * p, h * p);
  };

  // Ground shadow (unbobbed)
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + 10 * p, y + 19 * p, 6 * p, 1.2 * p, 0, 0, Math.PI * 2);
  ctx.fill();

  const palette: CharPalette = {
    skin,
    skinShadow,
    skinLight,
    outline,
    hair,
    hairDark,
    shirt,
    shirtDark,
    shirtLight,
    pants,
    pantsDark,
    shoe,
    walkFrame,
    outfit,
  };

  if (direction === 0) drawCharFront(Q, palette);
  else if (direction === 1) drawCharBack(Q, palette);
  else drawCharSide(Q, direction === 3, palette);

  if (accessory === "resume") {
    const bobOffset = Math.sin(Date.now() / 300) * 1;
    ctx.fillStyle = "#fefefe";
    ctx.fillRect(x + 4 * PIX, y - 2 * PIX + bobOffset, 3 * PIX, 4 * PIX);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 4.5 * PIX, y - PIX + bobOffset, 2 * PIX, PIX / 2);
    ctx.fillRect(x + 4.5 * PIX, y + bobOffset, 2 * PIX, PIX / 2);
    ctx.fillRect(x + 4.5 * PIX, y + PIX + bobOffset, PIX, PIX / 2);
  }
};

type CharPalette = {
  skin: string;
  skinShadow: string;
  skinLight?: string;
  outline: string;
  hair: string;
  hairDark: string;
  shirt: string;
  shirtDark: string;
  shirtLight: string;
  pants: string;
  pantsDark: string;
  shoe: string;
  walkFrame: number;
  outfit: OutfitStyle;
};

// ==== outfit overlays ====

type Q = (gx: number, gy: number, w: number, h: number, c: string) => void;

// Trainer cap covering the top of the head (rows 4-6).
// Uses the character's shirt color as the cap fabric.
function drawTrainerCapFront(q: Q, P: CharPalette) {
  const cap = P.shirt;
  const capDark = P.shirtDark;
  const capLight = P.shirtLight;
  // Cap fabric (rows 4-6)
  q(5, 4, 10, 1, cap);
  q(5, 5, 10, 2, cap);
  // Highlight on top
  q(7, 4, 3, 1, capLight);
  // Cap logo — small white square
  q(9, 5, 2, 1, "#ffffff");
  // Cap outlines
  q(5, 4, 1, 3, P.outline);
  q(14, 4, 1, 3, P.outline);
  q(5, 3, 10, 1, P.outline);
  // Brim shadow strip
  q(5, 7, 10, 1, capDark);
  // Brim outline at row 7
  q(5, 7, 10, 1, capDark);
  q(4, 7, 12, 1, P.outline);
  q(4, 7, 1, 1, capDark);
  q(15, 7, 1, 1, capDark);
}

function drawTrainerCapBack(q: Q, P: CharPalette) {
  const cap = P.shirt;
  const capDark = P.shirtDark;
  const capLight = P.shirtLight;
  q(5, 4, 10, 1, cap);
  q(5, 5, 10, 2, cap);
  q(7, 5, 3, 1, capLight);
  // Snapback band at back
  q(6, 6, 8, 1, capDark);
  q(9, 6, 2, 1, "#ffffff");
  q(5, 4, 1, 3, P.outline);
  q(14, 4, 1, 3, P.outline);
  q(5, 3, 10, 1, P.outline);
  q(5, 7, 10, 1, P.outline);
}

function drawTrainerCapSide(q: Q, facingRight: boolean, P: CharPalette) {
  const cap = P.shirt;
  const capLight = P.shirtLight;
  const capDark = P.shirtDark;
  q(5, 4, 10, 1, cap);
  q(5, 5, 10, 2, cap);
  q(facingRight ? 6 : 10, 4, 3, 1, capLight);
  q(9, 5, 2, 1, "#ffffff");
  q(5, 3, 10, 1, P.outline);
  q(5, 4, 1, 3, P.outline);
  q(14, 4, 1, 3, P.outline);
  // Brim projects out in the facing direction
  if (facingRight) {
    q(14, 6, 3, 1, capDark);
    q(14, 7, 3, 1, P.outline);
  } else {
    q(3, 6, 3, 1, capDark);
    q(3, 7, 3, 1, P.outline);
  }
  q(5, 7, 10, 1, capDark);
}

// Lab coat: off-white overlay with a V-neck opening showing the inner shirt,
// coat sleeves covering the arms, a chest pocket with a pen, and buttons.
function drawLabCoatFront(q: Q, P: CharPalette) {
  const coat = "#f6f6ee";
  const coatShade = "#d0d0c4";
  const coatDark = "#4a4a3e";
  const buttonColor = "#6a6a5c";
  const penBody = "#c83030";
  const penCap = "#ffe28a";

  // Sleeves covering the arms
  q(5, 12, 1.5, 3, coat);
  q(13.5, 12, 1.5, 3, coat);
  q(5, 12, 0.5, 3, P.outline);
  q(14.5, 12, 0.5, 3, P.outline);
  q(5.5, 14, 1, 0.5, coatShade);
  q(13.5, 14, 1, 0.5, coatShade);
  // Sleeve cuffs
  q(5, 14.5, 1.5, 0.5, coatDark);
  q(13.5, 14.5, 1.5, 0.5, coatDark);

  // Coat body outline + fill
  q(6, 11, 8, 1, P.outline);
  q(6, 12, 1, 3, P.outline);
  q(13, 12, 1, 3, P.outline);
  q(7, 11, 6, 4, coat);
  // Right-side subtle shading
  q(12, 12, 1, 3, coatShade);
  q(7, 14, 6, 1, coatShade);

  // V-neck opening — inner shirt visible, narrowing downward
  q(8, 11, 4, 0.5, P.shirtDark);
  q(8, 11.5, 4, 0.5, P.shirt);
  q(8.5, 12, 3, 0.5, P.shirt);
  q(9, 12.5, 2, 0.5, P.shirt);
  q(9.5, 13, 1, 0.5, P.shirt);

  // Lapel dark edges lining the V
  q(7.5, 11.5, 0.5, 1, coatDark);
  q(11.5, 11.5, 0.5, 1, coatDark);
  q(8, 12.5, 0.5, 0.5, coatDark);
  q(11, 12.5, 0.5, 0.5, coatDark);
  q(8.5, 13, 0.5, 0.5, coatDark);
  q(10.5, 13, 0.5, 0.5, coatDark);

  // Chest pocket on the left
  q(7, 13.5, 2, 1, coat);
  q(7, 13.5, 2, 0.5, coatDark); // top flap
  q(7, 13.5, 0.5, 1, coatDark); // left edge
  q(8.5, 13.5, 0.5, 1, coatDark); // right edge

  // Pen sticking out of the pocket
  q(7.5, 13, 0.5, 1, penBody);
  q(7.5, 13, 0.5, 0.5, penCap);

  // Two buttons on the right side
  q(11.5, 13.5, 0.5, 0.5, buttonColor);
  q(11.5, 14.5, 0.5, 0.5, buttonColor);
}

// Professor glasses — solid dark round-ish frames sitting over the eye row.
function drawGlassesFront(q: Q, P: CharPalette) {
  const frame = P.outline;
  const lens = "#5aa0d8";
  const shine = "#ffffff";

  // Left lens
  q(7.5, 7.5, 1.5, 1.5, frame);
  q(8, 8, 0.5, 0.5, lens);
  q(8, 7.5, 0.5, 0.5, shine);
  // Right lens
  q(10.5, 7.5, 1.5, 1.5, frame);
  q(11, 8, 0.5, 0.5, lens);
  q(11, 7.5, 0.5, 0.5, shine);
  // Bridge over the nose
  q(9, 8, 1.5, 0.5, frame);
  // Small temple arms extending outward
  q(7, 8, 0.5, 0.5, frame);
  q(12.5, 8, 0.5, 0.5, frame);
}

// Office blazer over shirt: dark jacket sides, inner white shirt, colored tie.
function drawOfficeCoatFront(q: Q, P: CharPalette) {
  const jacket = "#2a2a3a";
  const jacketShade = "#404055";
  const inner = "#f0f0f0";
  const tie = P.shirt;
  const tieDark = P.shirtDark;
  // Collar row
  q(6, 11, 8, 1, P.outline);
  q(7, 11, 6, 1, jacket);
  // Body
  q(6, 12, 1, 3, P.outline);
  q(13, 12, 1, 3, P.outline);
  q(7, 12, 6, 3, jacket);
  // Right side highlight (subtle)
  q(7, 12, 1, 3, jacketShade);
  // Inner shirt (white strip in center)
  q(9, 11, 2, 1, P.outline);
  q(9, 12, 2, 3, inner);
  // Lapels
  q(8, 11, 1, 1, jacketShade);
  q(11, 11, 1, 1, jacketShade);
  q(8.5, 12, 0.5, 1, jacketShade);
  q(11, 12, 0.5, 1, jacketShade);
  // Tie down the middle
  q(9.5, 12, 1, 2, tie);
  q(9.5, 14, 1, 1, tieDark);
  // Tie knot
  q(9.5, 12, 1, 1, tieDark);
}

// FRONT-FACING VIEW
function drawCharFront(
  Q: (gx: number, gy: number, w: number, h: number, c: string) => void,
  P: CharPalette
) {
  // Head hair block (rows 3-7, cols 6-13)
  Q(6, 3, 8, 1, P.outline);
  Q(5, 4, 10, 1, P.hairDark);
  Q(5, 5, 10, 1, P.hair);
  Q(5, 6, 10, 1, P.hair);
  // Hair highlight strip
  Q(7, 4, 2, 1, P.hair);
  Q(11, 4, 2, 1, P.hair);
  // Hair outline sides
  Q(5, 4, 1, 3, P.outline);
  Q(14, 4, 1, 3, P.outline);

  // Face skin (rows 7-10)
  Q(6, 7, 8, 1, P.outline); // hair fringe bottom outline
  Q(6, 7, 1, 3, P.outline);
  Q(13, 7, 1, 3, P.outline);
  // Skin fill
  Q(7, 7, 6, 1, P.hair); // last row of fringe over forehead
  Q(7, 8, 6, 2, P.skin);
  // Skin shadow on sides
  Q(7, 8, 1, 2, P.skinShadow);
  Q(12, 8, 1, 2, P.skinShadow);
  // Face bottom outline
  Q(7, 10, 6, 1, P.outline);

  // Eyes — single dark color, centered
  Q(8, 8, 1, 1, P.outline);
  Q(11, 8, 1, 1, P.outline);
  // Small mouth hint (chin dimple)
  Q(9, 9, 2, 1, P.skinShadow);

  // Neck
  Q(9, 10, 2, 1, P.skinShadow);

  // Shirt (rows 11-14)
  // Collar row
  Q(6, 11, 8, 1, P.outline);
  Q(7, 11, 6, 1, P.shirtDark);
  // Main shirt body
  Q(6, 12, 1, 3, P.outline);
  Q(13, 12, 1, 3, P.outline);
  Q(7, 12, 6, 3, P.shirt);
  Q(7, 12, 6, 1, P.shirtLight);
  Q(7, 14, 6, 1, P.shirtDark);
  // Arms (skin) on outside
  Q(5, 12, 1, 3, P.outline);
  Q(6, 12, 0.5, 3, P.skinShadow);
  Q(14, 12, 1, 3, P.outline);
  Q(13.5, 12, 0.5, 3, P.skinShadow);

  // Pants / legs (rows 15-17)
  Q(6, 15, 8, 1, P.outline);
  Q(7, 15, 6, 2, P.pants);
  Q(7, 15, 6, 1, P.pantsDark); // waistband
  // Leg separation
  Q(9, 15, 2, 2, P.pantsDark);

  // Walking animation — leg positions shift
  if (P.walkFrame === 0) {
    Q(7, 17, 2, 1, P.pants);
    Q(11, 17, 2, 1, P.pants);
    // Shoes
    Q(6, 18, 3, 1, P.shoe);
    Q(11, 18, 3, 1, P.shoe);
  } else {
    Q(7, 17, 2, 1, P.pants);
    Q(11, 17, 2, 1, P.pants);
    // Shoes shifted
    Q(6, 18, 3, 1, P.shoe);
    Q(11, 18, 3, 1, P.shoe);
    // One shoe raised slightly (bob effect handled via cy)
  }

  // Full body outline touch-ups
  Q(6, 17, 1, 2, P.outline);
  Q(13, 17, 1, 2, P.outline);

  // Outfit overlays
  if (P.outfit === "trainer") drawTrainerCapFront(Q, P);
  else if (P.outfit === "labCoat") {
    drawLabCoatFront(Q, P);
    drawGlassesFront(Q, P);
  } else if (P.outfit === "officeCoat") drawOfficeCoatFront(Q, P);
}

// BACK VIEW
function drawCharBack(
  Q: (gx: number, gy: number, w: number, h: number, c: string) => void,
  P: CharPalette
) {
  // Full hair back
  Q(6, 3, 8, 1, P.outline);
  Q(5, 4, 10, 6, P.hair);
  Q(5, 4, 10, 1, P.hairDark);
  // Hair highlights
  Q(7, 5, 2, 1, shade(P.hair, 15));
  Q(11, 5, 2, 1, shade(P.hair, 15));
  Q(5, 4, 1, 6, P.outline);
  Q(14, 4, 1, 6, P.outline);
  Q(5, 9, 10, 1, P.hairDark);

  // Neck strip
  Q(9, 10, 2, 1, P.skinShadow);

  // Shirt back
  Q(6, 11, 8, 1, P.outline);
  Q(7, 11, 6, 1, P.shirtDark);
  Q(6, 12, 1, 3, P.outline);
  Q(13, 12, 1, 3, P.outline);
  Q(7, 12, 6, 3, P.shirt);
  Q(7, 12, 6, 1, P.shirtLight);
  Q(7, 14, 6, 1, P.shirtDark);

  // Arms
  Q(5, 12, 1, 3, P.outline);
  Q(14, 12, 1, 3, P.outline);
  Q(6, 12, 0.5, 3, P.shirtDark);
  Q(13.5, 12, 0.5, 3, P.shirtDark);

  // Pants + shoes (same as front)
  Q(6, 15, 8, 1, P.outline);
  Q(7, 15, 6, 2, P.pants);
  Q(7, 15, 6, 1, P.pantsDark);
  Q(9, 15, 2, 2, P.pantsDark);
  Q(7, 17, 2, 1, P.pants);
  Q(11, 17, 2, 1, P.pants);
  Q(6, 18, 3, 1, P.shoe);
  Q(11, 18, 3, 1, P.shoe);
  Q(6, 17, 1, 2, P.outline);
  Q(13, 17, 1, 2, P.outline);

  if (P.outfit === "trainer") drawTrainerCapBack(Q, P);
}

// SIDE VIEW (left = false means facing left, true = facing right; drawn as left then mirrored)
function drawCharSide(
  Q: (gx: number, gy: number, w: number, h: number, c: string) => void,
  facingRight: boolean,
  P: CharPalette
) {
  // We draw a leftward-facing profile using cols 6-13 and let the caller flip via facingRight
  // by swapping x offsets. Simpler: draw the same profile but "eye" position + hair sweep
  // reflect based on facingRight.
  const eyeCol = facingRight ? 11 : 8;
  const fringeSide = facingRight ? 6 : 13;
  const backSide = facingRight ? 13 : 6;

  // Hair block
  Q(6, 3, 8, 1, P.outline);
  Q(5, 4, 10, 1, P.hairDark);
  Q(5, 5, 10, 2, P.hair);
  Q(5, 4, 1, 3, P.outline);
  Q(14, 4, 1, 3, P.outline);
  // Highlight
  Q(facingRight ? 9 : 7, 4, 2, 1, shade(P.hair, 15));

  // Head skin
  Q(6, 7, 8, 1, P.outline);
  Q(6, 7, 1, 3, P.outline);
  Q(13, 7, 1, 3, P.outline);
  Q(7, 7, 6, 1, P.hair);
  Q(7, 8, 6, 2, P.skin);
  // Nose hint on facing side
  Q(facingRight ? 13 : 6, 8, 1, 1, P.skinShadow);
  // Fringe sweep on back side
  Q(backSide, 6, 1, 2, P.hair);
  // Ear on non-facing side
  Q(fringeSide, 8, 1, 1, P.hair);
  // Eye
  Q(eyeCol, 8, 1, 1, P.outline);
  // Chin
  Q(7, 10, 6, 1, P.outline);
  Q(8, 9, 4, 1, P.skinShadow);

  // Neck
  Q(9, 10, 2, 1, P.skinShadow);

  // Shirt
  Q(6, 11, 8, 1, P.outline);
  Q(7, 11, 6, 1, P.shirtDark);
  Q(6, 12, 1, 3, P.outline);
  Q(13, 12, 1, 3, P.outline);
  Q(7, 12, 6, 3, P.shirt);
  Q(7, 12, 6, 1, P.shirtLight);
  Q(7, 14, 6, 1, P.shirtDark);

  // Walking arm swing
  const armFrontCol = facingRight ? 13 : 6;
  const armBackCol = facingRight ? 6 : 13;
  const armSwing = P.walkFrame === 1 ? 1 : 0;
  Q(armFrontCol, 12 + armSwing, 1, 2, P.shirt);
  Q(armBackCol, 12 - armSwing, 1, 2, P.shirtDark);

  // Pants + shoes with walking split
  Q(6, 15, 8, 1, P.outline);
  Q(7, 15, 6, 2, P.pants);
  Q(7, 15, 6, 1, P.pantsDark);
  if (P.walkFrame === 0) {
    Q(8, 17, 1, 1, P.pants);
    Q(11, 17, 1, 1, P.pants);
    Q(7, 18, 3, 1, P.shoe);
    Q(10, 18, 3, 1, P.shoe);
  } else {
    // Slight step shift
    Q(7, 17, 2, 1, P.pants);
    Q(10, 17, 2, 1, P.pants);
    Q(6, 18, 3, 1, P.shoe);
    Q(11, 18, 3, 1, P.shoe);
  }
  Q(6, 17, 1, 2, P.outline);
  Q(13, 17, 1, 2, P.outline);

  if (P.outfit === "trainer") drawTrainerCapSide(Q, facingRight, P);
}

// ============ POKEMON ============

export const drawPokemon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  species: PokemonSpecies
) => {
  const p = size / 10;
  const Q = (gx: number, gy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + gx * p, y + gy * p, w * p, h * p);
  };
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size - p, size / 3, p / 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const { primary, secondary, shape } = species;

  switch (shape) {
    case "blob":
      Q(2, 3, 6, 6, primary);
      Q(2, 3, 6, 2, secondary);
      Q(3, 5, 1, 1, "#fff");
      Q(6, 5, 1, 1, "#fff");
      Q(3.3, 5.3, 0.5, 0.5, "#000");
      Q(6.3, 5.3, 0.5, 0.5, "#000");
      Q(4, 7, 2, 1, secondary);
      break;
    case "bug":
      Q(1, 4, 8, 4, primary);
      Q(3, 3, 4, 2, primary);
      Q(0, 3, 2, 3, secondary);
      Q(8, 3, 2, 3, secondary);
      Q(3, 4, 1, 1, "#fff");
      Q(6, 4, 1, 1, "#fff");
      Q(3.3, 4.3, 0.4, 0.4, "#000");
      Q(6.3, 4.3, 0.4, 0.4, "#000");
      Q(2, 8, 1, 1, secondary);
      Q(7, 8, 1, 1, secondary);
      break;
    case "sparky":
      Q(2, 3, 6, 5, primary);
      Q(3, 8, 1, 1, primary);
      Q(6, 8, 1, 1, primary);
      Q(4, 5, 2, 1, secondary);
      Q(3, 6, 1, 1, secondary);
      Q(6, 6, 1, 1, secondary);
      Q(3.5, 4, 0.6, 0.6, "#000");
      Q(5.9, 4, 0.6, 0.6, "#000");
      Q(8, 4, 1, 1, "#fde047");
      Q(8.5, 5, 1, 1, "#fde047");
      Q(9, 6, 1, 1, "#fde047");
      break;
    case "aqua":
      Q(2, 4, 6, 5, primary);
      Q(2, 3, 6, 2, secondary);
      Q(4, 2, 2, 2, primary);
      Q(3.5, 5, 0.6, 0.6, "#fff");
      Q(5.9, 5, 0.6, 0.6, "#fff");
      Q(3.7, 5.2, 0.4, 0.4, "#000");
      Q(6.1, 5.2, 0.4, 0.4, "#000");
      Q(4, 7, 2, 1, secondary);
      Q(1, 6, 1, 1, "#7dd3fc");
      Q(8, 6, 1, 1, "#7dd3fc");
      break;
    case "brick":
      Q(1, 3, 8, 6, primary);
      Q(1, 3, 8, 1, secondary);
      Q(1, 8, 8, 1, secondary);
      Q(1, 3, 1, 6, secondary);
      Q(8, 3, 1, 6, secondary);
      Q(1, 5, 8, 0.4, secondary);
      Q(4, 3, 0.4, 2, secondary);
      Q(6, 5.5, 0.4, 2, secondary);
      Q(2.5, 6, 1, 1, "#fff");
      Q(6.5, 6, 1, 1, "#fff");
      Q(2.9, 6.3, 0.5, 0.5, "#000");
      Q(6.9, 6.3, 0.5, 0.5, "#000");
      break;
    case "leaf":
      Q(2, 4, 6, 5, primary);
      Q(4, 1, 2, 3, secondary);
      Q(3, 2, 1, 2, secondary);
      Q(6, 2, 1, 2, secondary);
      Q(3.5, 5.5, 0.6, 0.6, "#000");
      Q(5.9, 5.5, 0.6, 0.6, "#000");
      Q(4, 7, 2, 0.6, secondary);
      Q(2, 8, 1, 1, primary);
      Q(7, 8, 1, 1, primary);
      break;
    case "goose":
      drawGoose(ctx, x, y, size, species);
      break;
    case "codey":
      drawCodey(ctx, x, y, size, species);
      break;
  }
};

// The newer mascots use a 20x20 grid so small details (glasses, chinstrap) read.
const grid20 = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const q = size / 20;
  const R = (gx: number, gy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + gx * q, y + gy * q, w * q, h * q);
  };
  return { q, R };
};

// Canada goose, the unofficial mascot of UW, facing left.
function drawGoose(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  species: PokemonSpecies
) {
  const { R } = grid20(ctx, x, y, size);
  const body = species.primary;
  const black = species.secondary;
  const wing = shade(body, -28);
  const wingLine = shade(body, -48);
  const breast = "#ddd2bf";

  // Legs and feet
  R(10, 15, 1, 2.6, "#2b2b2b");
  R(13, 15, 1, 2.6, "#2b2b2b");
  R(8.6, 17.4, 2.6, 0.8, "#2b2b2b");
  R(11.6, 17.4, 2.6, 0.8, "#2b2b2b");

  // Body
  R(8, 10, 9, 1, body);
  R(7, 11, 11, 3, body);
  R(8, 14, 9, 1, body);
  // Pale breast at the front
  R(7, 11, 3, 3, breast);
  R(8, 10, 2, 1, breast);
  R(8, 14, 2, 1, breast);
  // Folded wing with feather lines
  R(10, 10.5, 7, 2.6, wing);
  R(11, 11.4, 5, 0.4, wingLine);
  R(12, 12.4, 4.5, 0.4, wingLine);
  // White under the tail, black tail tip
  R(15, 13.4, 3, 1.4, "#f2f2f2");
  R(17, 10.6, 2, 1.6, black);

  // Long black neck and head
  R(6, 4.5, 2, 7, black);
  R(4, 1.6, 3, 0.6, black);
  R(3, 2.2, 5, 2.8, black);
  // White chinstrap
  R(4.6, 3.6, 3, 1.4, "#ffffff");
  // Beak
  R(1, 3, 2.2, 1, "#2b2b2b");
  // Eye glint
  R(4.3, 2.7, 0.6, 0.6, "#ffffff");
}

// Codey, the CSC mascot: light blue, white muzzle and chest, round navy glasses.
function drawCodey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  species: PokemonSpecies
) {
  const { q, R } = grid20(ctx, x, y, size);
  const blue = species.primary;
  const blueDark = shade(blue, -30);
  const blueLight = shade(blue, 30);
  const navy = species.secondary;
  const white = "#ffffff";

  const circle = (cx: number, cy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x + cx * q, y + cy * q, r * q, 0, Math.PI * 2);
    ctx.fill();
  };

  // Round tail behind the body
  circle(16, 14, 3.6, blue);
  circle(15.4, 13.2, 1.5, blueLight);

  // Body, with a white chest and front paws
  R(5, 12, 10, 6, blue);
  R(13, 12, 2, 6, blueDark);
  R(8, 12, 4, 5.5, white);
  R(6.4, 17.4, 2.2, 1, blueDark);
  R(11.4, 17.4, 2.2, 1, blueDark);

  // Ears (white on the inner side)
  R(5, 2, 1.5, 1, blue);
  R(4.5, 3, 2.5, 1, blue);
  R(4, 4, 3.5, 1.5, blue);
  R(5.1, 3.2, 1, 1, white);
  R(5, 4, 1.6, 1.3, white);
  R(13.5, 2, 1.5, 1, blue);
  R(13, 3, 2.5, 1, blue);
  R(12.5, 4, 3.5, 1.5, blue);
  R(13.9, 3.2, 1, 1, white);
  R(13.4, 4, 1.6, 1.3, white);

  // Head
  R(5, 5, 10, 1, blue);
  R(4, 6, 12, 5, blue);
  R(5, 11, 10, 1, blue);
  R(6, 6, 2, 0.8, blueLight);
  // White muzzle, joining the chest
  R(8, 8.8, 4, 0.6, white);
  R(7.4, 9.4, 5.2, 2.6, white);

  // Eyes, with the little white marks above them
  R(6.8, 8, 1.2, 1.4, navy);
  R(12, 8, 1.2, 1.4, navy);
  R(7, 8.2, 0.4, 0.4, white);
  R(12.2, 8.2, 0.4, 0.4, white);
  R(6.6, 6.8, 1.4, 0.5, white);
  R(11.8, 6.8, 1.4, 0.5, white);

  // Nose and smile
  R(9.4, 9.8, 1.2, 0.8, navy);
  ctx.save();
  ctx.strokeStyle = navy;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, 0.45 * q);
  ctx.beginPath();
  ctx.arc(x + 10 * q, y + 10.4 * q, 1.3 * q, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // Big round glasses
  ctx.lineWidth = Math.max(1, 0.55 * q);
  for (const cx of [7.4, 12.6]) {
    ctx.beginPath();
    ctx.arc(x + cx * q, y + 8.7 * q, 2.4 * q, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + 9.8 * q, y + 8.4 * q);
  ctx.lineTo(x + 10.2 * q, y + 8.4 * q);
  ctx.stroke();
  ctx.restore();
}

// ============ ION TRAIN ============
// A two-car light rail train in a white-and-blue livery, drawn side-on across
// `lengthTiles` tiles of a track row. (px, py) is the top-left of the first tile.

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

export const drawTrain = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  lengthTiles: number,
  dir: 1 | -1
) => {
  const T = TILE_SIZE;
  const carGap = 0.14 * T;
  const carW = (lengthTiles * T - carGap) / 2;
  const top = py - 0.35 * T;
  const bodyH = 1.1 * T;

  ctx.save();
  // Shadow on the ballast
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(px + 4, py + 0.8 * T, lengthTiles * T - 8, 0.2 * T);

  // Bellows between the two cars
  ctx.fillStyle = "#2a2e35";
  ctx.fillRect(px + carW - 2, top + 0.25 * T, carGap + 4, 0.65 * T);

  for (let car = 0; car < 2; car++) {
    const cx = px + car * (carW + carGap);
    const isFront = dir === 1 ? car === 1 : car === 0;
    const isRear = dir === 1 ? car === 0 : car === 1;

    // Undercarriage and wheels
    ctx.fillStyle = "#3a3f47";
    ctx.fillRect(cx + 0.15 * T, top + bodyH - 0.12 * T, carW - 0.3 * T, 0.22 * T);
    ctx.fillStyle = "#22252b";
    for (const wx of [0.45, carW / T - 0.45]) {
      ctx.beginPath();
      ctx.arc(cx + wx * T, top + bodyH + 0.08 * T, 0.13 * T, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    roundedRectPath(ctx, cx, top, carW, bodyH, 0.22 * T);
    ctx.fillStyle = "#f4f6f8";
    ctx.fill();
    ctx.strokeStyle = "#9aa3ad";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Roof line
    ctx.fillStyle = "#cfd5dc";
    ctx.fillRect(cx + 0.18 * T, top + 0.02 * T, carW - 0.36 * T, 0.12 * T);

    // Window band
    const winTop = top + 0.22 * T;
    const winH = 0.32 * T;
    ctx.fillStyle = "#1f2a3a";
    ctx.fillRect(cx + 0.12 * T, winTop, carW - 0.24 * T, winH);
    ctx.fillStyle = "#3b4c66";
    ctx.fillRect(cx + 0.12 * T, winTop, carW - 0.24 * T, winH * 0.35);
    // Window pillars
    ctx.fillStyle = "#f4f6f8";
    for (let wx = cx + 0.7 * T; wx < cx + carW - 0.5 * T; wx += 0.62 * T) {
      ctx.fillRect(wx, winTop, 0.07 * T, winH);
    }

    // Blue livery stripe
    ctx.fillStyle = "#0b4f9c";
    ctx.fillRect(cx + 0.05 * T, top + 0.62 * T, carW - 0.1 * T, 0.12 * T);
    ctx.fillStyle = "#5fb3e8";
    ctx.fillRect(cx + 0.05 * T, top + 0.74 * T, carW - 0.1 * T, 0.05 * T);

    // Doors
    ctx.strokeStyle = "#aeb6c0";
    ctx.lineWidth = 1;
    for (const dx of [carW * 0.3, carW * 0.65]) {
      ctx.strokeRect(cx + dx, top + 0.18 * T, 0.42 * T, 0.82 * T);
      ctx.beginPath();
      ctx.moveTo(cx + dx + 0.21 * T, top + 0.18 * T);
      ctx.lineTo(cx + dx + 0.21 * T, top + 1.0 * T);
      ctx.stroke();
    }

    // "ION" lettering
    ctx.fillStyle = "#0b4f9c";
    ctx.font = `bold ${Math.round(0.24 * T)}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("ION", cx + 0.3 * T, top + 0.98 * T);

    // Cab windshields at the outer ends (the train can drive either way)
    if (isFront || isRear) {
      const endX = isFront === (dir === 1) ? cx + carW - 0.34 * T : cx + 0.06 * T;
      ctx.fillStyle = "#14202e";
      ctx.fillRect(endX, top + 0.16 * T, 0.28 * T, 0.42 * T);
      // Headlight at the front, tail light at the back
      ctx.fillStyle = isFront ? "#ffe680" : "#ff4d4d";
      const lightX = isFront === (dir === 1) ? cx + carW - 0.16 * T : cx + 0.06 * T;
      ctx.fillRect(lightX, top + 0.84 * T, 0.1 * T, 0.08 * T);
    }
  }
  ctx.restore();
};

// ============ MAP LABEL ============
// A small plate drawn over the top edge of tile (tx, ty), e.g. above the CSC door.

export const drawMapLabel = (
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  text: string,
  accent: string,
  camPxX: number,
  camPxY: number
) => {
  const cx = (tx + 0.5) * TILE_SIZE - camPxX;
  const baseline = ty * TILE_SIZE - camPxY + 6;
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(15,23,42,0.9)";
  ctx.fillRect(cx - w / 2 - 5, baseline - 13, w + 10, 15);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2 - 5, baseline - 13, w + 10, 15);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(text, cx, baseline);
};

// ============ BUILDING LABEL ============

export const drawBuildingLabel = (
  ctx: CanvasRenderingContext2D,
  b: Building,
  camPxX: number,
  camPxY: number
) => {
  const cx = (b.x + b.w / 2) * TILE_SIZE - camPxX;
  const cy = b.y * TILE_SIZE - camPxY - 6;
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const textWidth = ctx.measureText(b.label).width;
  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.fillRect(cx - textWidth / 2 - 6, cy - 14, textWidth + 12, 16);
  ctx.strokeStyle = b.roofColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - textWidth / 2 - 6, cy - 14, textWidth + 12, 16);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(b.label, cx, cy);
};

function shade(hex: string, amt: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
