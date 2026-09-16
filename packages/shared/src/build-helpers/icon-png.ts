// Rasterize the extension icon (same design as assets/icons/icon.svg) to a
// 128×128 PNG for Chrome, which doesn't accept SVG manifest icons. Pure
// Node, no dependencies: signed-distance fields for the shapes and a
// minimal PNG encoder. The Chrome build calls it, so no binary is committed.
import { deflateSync } from "node:zlib";

const SIZE = 128;

const GRAD_A = [74, 90, 200]; // #4a5ac8
const GRAD_B = [124, 77, 255]; // #7c4dff
const PAPER = [255, 255, 255];

const PIN_ROTATION_DEG = 32;
const PIN_PIVOT: readonly [number, number] = [64, 64];
const NEEDLE: readonly (readonly [number, number])[] = [
  [59.5, 66],
  [68.5, 66],
  [64, 108],
];
const NEEDLE_STROKE = 1.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const coverage = (distance: number) => clamp01(0.5 - distance);
const blend = (rgb: number[], over: number[], t: number) =>
  rgb.map((c, i) => mix(c, over[i] ?? c, t));

function roundedRectSDF(
  x: number,
  y: number,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  radius: number
): number {
  const dx = Math.abs(x - cx) - (halfWidth - radius);
  const dy = Math.abs(y - cy) - (halfHeight - radius);
  return (
    Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius
  );
}

function circleSDF(x: number, y: number, cx: number, cy: number, r: number): number {
  return Math.hypot(x - cx, y - cy) - r;
}

function polygonSDF(px: number, py: number, vertices: typeof NEEDLE): number {
  const first = vertices[0];
  if (!first) return Infinity;
  let d = (px - first[0]) ** 2 + (py - first[1]) ** 2;
  let sign = 1;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i];
    const b = vertices[j];
    if (!a || !b) continue;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const wx = px - a[0];
    const wy = py - a[1];
    const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey));
    const qx = wx - ex * t;
    const qy = wy - ey * t;
    d = Math.min(d, qx * qx + qy * qy);
    const c1 = py >= a[1];
    const c2 = py < b[1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sign = -sign;
  }
  return sign * Math.sqrt(d);
}

// The SVG draws the pin upright and rotates the group; here the sample point
// is rotated the other way instead.
function unrotate(x: number, y: number): [number, number] {
  const angle = (-PIN_ROTATION_DEG * Math.PI) / 180;
  const [cx, cy] = PIN_PIVOT;
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * Math.cos(angle) - dy * Math.sin(angle), cy + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

function paintPin(rgb: number[], x: number, y: number): number[] {
  const [px, py] = unrotate(x, y);
  const needle = polygonSDF(px, py, NEEDLE);
  const pin = Math.min(needle - NEEDLE_STROKE, circleSDF(px, py, 64, 46, 22));
  return blend(rgb, PAPER, coverage(pin));
}

function pixel(x: number, y: number): number[] {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const shape = coverage(roundedRectSDF(cx, cy, SIZE / 2, SIZE / 2, SIZE / 2, SIZE / 2, 28));
  if (shape === 0) return [0, 0, 0, 0];

  const t = (x + y) / (2 * (SIZE - 1));
  let rgb = GRAD_A.map((a, i) => mix(a, GRAD_B[i] ?? a, t));
  rgb = paintPin(rgb, cx, cy);

  return [...rgb.map(Math.round), Math.round(shape * 255)];
}

// --- Minimal PNG encoder (RGBA, 8-bit, no interlace) ---
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of buf) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function renderIconPng(): Buffer {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < SIZE; x++) {
      raw.set(pixel(x, y), row + 1 + x * 4);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
