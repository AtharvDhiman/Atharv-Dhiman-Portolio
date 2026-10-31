// ---------------------------------------------------------------------------
// raster.mjs — a tiny from-scratch software rasterizer + PNG encoder shared by
// the project-card generators (build-plantguard-card.mjs, build-clv-card.mjs).
// Float RGB accumulation, anti-aliased discs and lines, a vignette, box
// downsampling for supersampling, and a minimal zlib/CRC32 PNG writer.
// ---------------------------------------------------------------------------

import { deflateSync } from 'node:zlib';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Raster {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.px = new Float32Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 3] = bg[0];
      this.px[i * 3 + 1] = bg[1];
      this.px[i * 3 + 2] = bg[2];
    }
  }

  blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const o = (y * this.w + x) * 3;
    const p = this.px;
    p[o] = p[o] * (1 - a) + r * a;
    p[o + 1] = p[o + 1] * (1 - a) + g * a;
    p[o + 2] = p[o + 2] * (1 - a) + b * a;
  }

  disc(cx, cy, rad, [r, g, b], a) {
    const x0 = Math.floor(cx - rad - 1);
    const x1 = Math.ceil(cx + rad + 1);
    const y0 = Math.floor(cy - rad - 1);
    const y1 = Math.ceil(cy + rad + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cov = Math.min(1, Math.max(0, rad - Math.hypot(x - cx, y - cy) + 0.5));
        if (cov > 0) this.blend(x, y, r, g, b, a * cov);
      }
    }
  }

  line(x0, y0, x1, y1, thick, color, a) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.75));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick / 2, color, a);
    }
  }

  dashedLine(x0, y0, x1, y1, thick, color, a, dash, gap) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(d + dash, len);
      this.line(x0 + ux * d, y0 + uy * d, x0 + ux * e, y0 + uy * e, thick, color, a);
    }
  }

  vignette(strength = 0.42, power = 2.2) {
    const cx = this.w / 2;
    const cy = this.h / 2;
    const maxD = Math.hypot(cx, cy);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const f = 1 - strength * Math.pow(Math.hypot(x - cx, y - cy) / maxD, power);
        const o = (y * this.w + x) * 3;
        this.px[o] *= f;
        this.px[o + 1] *= f;
        this.px[o + 2] *= f;
      }
    }
  }

  /** box-downsample by an integer factor -> RGBA bytes */
  downsample(f) {
    const ow = Math.floor(this.w / f);
    const oh = Math.floor(this.h / f);
    const out = Buffer.alloc(ow * oh * 4);
    const n = f * f;
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        let r = 0, g = 0, b = 0;
        for (let j = 0; j < f; j++) {
          for (let i = 0; i < f; i++) {
            const o = ((y * f + j) * this.w + (x * f + i)) * 3;
            r += this.px[o];
            g += this.px[o + 1];
            b += this.px[o + 2];
          }
        }
        const q = (y * ow + x) * 4;
        out[q] = Math.round(r / n);
        out[q + 1] = Math.round(g / n);
        out[q + 2] = Math.round(b / n);
        out[q + 3] = 255;
      }
    }
    return { data: out, w: ow, h: oh };
  }
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const buf = Buffer.alloc(8 + data.length + 4);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])), 8 + data.length);
  return buf;
}

export function encodePng({ data, w, h }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
