// Generates the app icons as real PNGs using only Node's built-ins.
// Run: node tools/make-icons.mjs
//
// The mark: a warm brick-red slab with two dark rules across it — a desk with
// paper on it, readable at 40px on a home screen where detail disappears.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "icons");

/* ── PNG encoding ─────────────────────────────────────────── */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  // Raw scanlines: one filter byte (0 = none) then RGBA per pixel.
  const raw = Buffer.alloc(size * (1 + size * 4));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── the mark ─────────────────────────────────────────────── */
const BG = [0x10, 0x0f, 0x0d];
const HOT = [0xd9, 0x69, 0x4f];
const DEEP = [0xa8, 0x34, 0x1f];

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// Signed distance to a rounded rectangle, for clean anti-aliased corners.
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function makePixel(slabFraction) {
  return (x, y, size) => {
    const c = size / 2;
    const hw = (size * slabFraction) / 2;
    const r = hw * 0.26;

    const d = sdRoundRect(x + 0.5, y + 0.5, c, c, hw, hw, r);
    const inSlab = Math.min(Math.max(0.5 - d, 0), 1);          // AA edge
    if (inSlab <= 0) return [...BG, 255];

    // Diagonal gradient across the slab.
    const t = Math.min(Math.max((x + y) / (size * 2), 0), 1);
    let col = mix(HOT, DEEP, t);

    // Two dark rules — the paper on the desk.
    const barH = hw * 0.085;
    const barHalfW = hw * 0.52;
    const withinW = Math.abs(x + 0.5 - c) < barHalfW;
    for (const off of [-hw * 0.2, hw * 0.16]) {
      if (withinW && Math.abs(y + 0.5 - (c + off)) < barH / 2) col = BG;
    }

    return [...mix(BG, col, inSlab), 255];
  };
}

mkdirSync(OUT, { recursive: true });

const jobs = [
  ["icon-192.png", 192, 0.78],
  ["icon-512.png", 512, 0.78],
  // Maskable icons get cropped to a circle by some launchers, so the mark
  // has to sit inside the middle ~80%.
  ["icon-maskable-512.png", 512, 0.58],
];

for (const [name, size, frac] of jobs) {
  const buf = png(size, makePixel(frac));
  writeFileSync(join(OUT, name), buf);
  console.log(`${name}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}
