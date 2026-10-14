// Rasterize the extension icon (same design as assets/icons/icon.svg) and
// the background-free toolbar glyph (assets/icons/toolbar-*.svg) to PNGs for
// Chrome, which doesn't accept SVG manifest icons. Pure Node, no
// dependencies: signed-distance fields for the shapes and a minimal PNG
// encoder. The Chrome build calls it, so no binary is committed.
import { deflateSync } from "node:zlib";

const SIZE = 128;

const BACKGROUND = [0, 0, 0];
const PAPER = [255, 255, 255];
export const TOOLBAR_DARK = [0x1f, 0x23, 0x28];
export const TOOLBAR_LIGHT = [255, 255, 255];
// The glyph's bounding square, the toolbar SVGs' viewBox.
const TOOLBAR_ORIGIN = 22;
const TOOLBAR_SPAN = 84;

const HALF_STROKE = 4;
type Point = readonly [number, number];
const PIN_TILT_DEG = 45;
const PIN_PIVOT: Point = [64, 64];
const PIN_RECENTER: Point = [-8.5, 8.5];
const PIN_STROKES: readonly (readonly Point[])[] = [
  [[40, 22], [88, 22]],
  [[51, 22], [51, 52], [35, 66], [93, 66], [77, 52], [77, 22]],
  [[64, 66], [64, 106]],
];

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

function segmentSDF(x: number, y: number, [ax, ay]: Point, [bx, by]: Point): number {
  const ex = bx - ax;
  const ey = by - ay;
  const t = clamp01(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey));
  return Math.hypot(x - ax - ex * t, y - ay - ey * t) - HALF_STROKE;
}

function polylineSDF(x: number, y: number, points: readonly Point[]): number {
  let d = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) d = Math.min(d, segmentSDF(x, y, a, b));
  }
  return d;
}

// The SVG tilts the upright pin and shifts it back to centre; here the
// sample point is taken through the inverse instead.
function untilt(x: number, y: number): Point {
  const angle = (-PIN_TILT_DEG * Math.PI) / 180;
  const [cx, cy] = PIN_PIVOT;
  const [ox, oy] = PIN_RECENTER;
  const dx = x - ox - cx;
  const dy = y - oy - cy;
  return [cx + dx * Math.cos(angle) - dy * Math.sin(angle), cy + dx * Math.sin(angle) + dy * Math.cos(angle)];
}

function pinSDF(x: number, y: number): number {
  const [px, py] = untilt(x, y);
  return Math.min(...PIN_STROKES.map((stroke) => polylineSDF(px, py, stroke)));
}

function pixel(x: number, y: number): number[] {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const shape = coverage(roundedRectSDF(cx, cy, SIZE / 2, SIZE / 2, SIZE / 2, SIZE / 2, 28));
  if (shape === 0) return [0, 0, 0, 0];

  const rgb = blend(BACKGROUND, PAPER, coverage(pinSDF(cx, cy)));

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
  return encodePng(SIZE, pixel);
}

export function renderToolbarPng(size: number, color: readonly number[]): Buffer {
  const scale = TOOLBAR_SPAN / size;
  return encodePng(size, (x, y) => {
    const distance = pinSDF(TOOLBAR_ORIGIN + (x + 0.5) * scale, TOOLBAR_ORIGIN + (y + 0.5) * scale);
    return [...color, Math.round(coverage(distance / scale) * 255)];
  });
}

function encodePng(size: number, pixelAt: (x: number, y: number) => number[]): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      raw.set(pixelAt(x, y), row + 1 + x * 4);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
