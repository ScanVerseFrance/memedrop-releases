'use strict';

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// SVG design: dark bg + orange accent + white geometric M
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e05a28"/>
      <stop offset="100%" stop-color="#9b2c0d"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="48" fill="url(#bg)"/>
  <!-- Geometric M: two outer bars + two diagonal arms meeting at center -->
  <!-- Left outer bar -->
  <rect x="34" y="48" width="38" height="162" rx="5" fill="white"/>
  <!-- Right outer bar -->
  <rect x="184" y="48" width="38" height="162" rx="5" fill="white"/>
  <!-- Left arm (diagonal down-right to center, then inner bar down) -->
  <polygon points="72,48 116,48 128,132 116,132" fill="white"/>
  <!-- Right arm (mirror) -->
  <polygon points="184,48 140,48 128,132 140,132" fill="white"/>
  <!-- Center connector + inner bars -->
  <rect x="110" y="116" width="36" height="94" rx="5" fill="white"/>
</svg>`;

async function buildIco(pngBuffers) {
  const count  = pngBuffers.length;
  const dirSz  = 6 + 16 * count;
  let dataSz   = 0;
  const offsets = pngBuffers.map(b => { const o = dirSz + dataSz; dataSz += b.length; return o; });
  const out     = Buffer.alloc(dirSz + dataSz);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  pngBuffers.forEach((b, i) => {
    const e = 6 + i * 16;
    out.writeUInt8(0, e);           // width  (0 = 256)
    out.writeUInt8(0, e + 1);       // height (0 = 256)
    out.writeUInt8(0, e + 2);       // color count
    out.writeUInt8(0, e + 3);       // reserved
    out.writeUInt16LE(1, e + 4);    // planes
    out.writeUInt16LE(32, e + 6);   // bit count
    out.writeUInt32LE(b.length, e + 8);
    out.writeUInt32LE(offsets[i], e + 12);
    b.copy(out, offsets[i]);
  });
  return out;
}

async function main() {
  const buildDir = path.join(__dirname, '../build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const src = Buffer.from(SVG);
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngs  = await Promise.all(sizes.map(s =>
    sharp(src, { density: 300 }).resize(s, s).png().toBuffer()
  ));

  // Write main 256x256 PNG (for display in README etc.)
  fs.writeFileSync(path.join(buildDir, 'icon.png'), pngs[0]);
  console.log('icon.png written');

  // Build ICO from all sizes (largest first so Explorer picks 256)
  const ico = await buildIco(pngs);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
  console.log('icon.ico written (%d bytes, %d sizes)', ico.length, sizes.length);
}

main().catch(err => { console.error(err); process.exit(1); });
