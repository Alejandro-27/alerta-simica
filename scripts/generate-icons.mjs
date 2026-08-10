/**
 * Genera los iconos PNG de la PWA (192, 512, 512 maskable, 180 apple)
 * usando solo Node (zlib). No requiere librerías externas.
 * Uso: node scripts/generate-icons.mjs
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../frontend/public/icons');
fs.mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Dibujo ---
const BG = [11, 18, 32, 255];        // #0b1220
const BG_MASKABLE = [7, 13, 26, 255]; // fondo extendido para safe zone
const RING1 = [44, 74, 122, 255];    // #2c4a7a
const RING2 = [26, 42, 69, 255];     // #1a2a45
const DOT = [245, 158, 11, 255];     // #f59e0b
const LINE = [245, 158, 11, 255];

function drawIcon(size, maskable = false) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const rDot = size * 0.11;
  const rRing1 = size * 0.24;
  const rRing2 = size * 0.38;
  const corner = size * (maskable ? 0.02 : 0.16);

  const inRect = (x, y) => {
    if (maskable) return true; // círculo completo (safe zone centrada)
    if (x < corner || y < corner || x >= size - corner || y >= size - corner) {
      const cx = x < corner ? corner : x >= size - corner ? size - corner - 1 : x;
      const cy = y < corner ? corner : y >= size - corner ? size - corner - 1 : y;
      const dx = x - cx;
      const dy = y - cy;
      return dx * dx + dy * dy <= corner * corner;
    }
    return true;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dist = Math.hypot(x - c + 0.5, y - c + 0.5);
      if (!inRect(x, y)) {
        px[i] = BG_MASKABLE[0]; px[i + 1] = BG_MASKABLE[1]; px[i + 2] = BG_MASKABLE[2]; px[i + 3] = 0;
        continue;
      }
      px[i] = BG[0]; px[i + 1] = BG[1]; px[i + 2] = BG[2]; px[i + 3] = BG[3];
      // anillos de onda sísmica
      if (Math.abs(dist - rRing2) < 2.2) { px[i] = RING2[0]; px[i + 1] = RING2[1]; px[i + 2] = RING2[2]; }
      if (Math.abs(dist - rRing1) < 2.4) { px[i] = RING1[0]; px[i + 1] = RING1[1]; px[i + 2] = RING1[2]; }
      // punto central
      if (dist <= rDot) { px[i] = DOT[0]; px[i + 1] = DOT[1]; px[i + 2] = DOT[2]; }
    }
  }

  // línea base (suelo)
  const yBase = Math.floor(size * 0.8);
  for (let x = Math.floor(size * 0.28); x < Math.floor(size * 0.72); x++) {
    for (let dy = 0; dy < 3; dy++) {
      const y = yBase + dy;
      if (y < 0 || y >= size || x < 0 || x >= size) continue;
      const i = (y * size + x) * 4;
      px[i] = LINE[0]; px[i + 1] = LINE[1]; px[i + 2] = LINE[2]; px[i + 3] = 255;
    }
  }

  return encodePNG(size, size, px);
}

const files = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];

for (const [name, size, maskable] of files) {
  fs.writeFileSync(path.join(outDir, name), drawIcon(size, maskable));
  console.log(`Generado ${name} (${size}x${size})`);
}
