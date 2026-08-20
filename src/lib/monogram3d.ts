// ---------------------------------------------------------------------------
// monogram3d — loads the quantized "AD" monogram mesh (public/ad-monogram.bin,
// produced by scripts/build-monogram.mjs) and renders it with a hand-written
// software 3D pipeline: rotate → orthographic project → backface cull →
// painter's sort → Lambert shade with the OBJ's real MTL colors.
// No three.js, no WebGL — one shared offscreen render feeds every logo
// instance on the page. Shading math mirrors the favicon script.
// ---------------------------------------------------------------------------

export interface MonogramMesh {
  vertCount: number;
  faceCount: number;
  pos: Float32Array; // xyz per vertex, unit-ish scale (dequantized)
  faces: Uint16Array; // 3 indices per face
  faceMat: Uint8Array;
  mats: Uint8Array; // rgb per material
}

let meshPromise: Promise<MonogramMesh | null> | null = null;

export function loadMonogram(): Promise<MonogramMesh | null> {
  meshPromise ??= (async () => {
    try {
      const res = await fetch('/ad-monogram.bin');
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const dv = new DataView(buf);
      if (dv.getUint32(0, false) !== 0x41444d31) return null; // 'ADM1'
      const vertCount = dv.getUint16(4, true);
      const faceCount = dv.getUint16(6, true);
      const matCount = dv.getUint8(8);
      let o = 9;
      const mats = new Uint8Array(buf, o, matCount * 3);
      o += matCount * 3;
      const q = new Int16Array(buf.slice(o, o + vertCount * 6));
      o += vertCount * 6;
      const faces = new Uint16Array(buf.slice(o, o + faceCount * 6));
      o += faceCount * 6;
      const faceMat = new Uint8Array(buf.slice(o, o + faceCount));
      const pos = new Float32Array(vertCount * 3);
      for (let i = 0; i < pos.length; i++) pos[i] = q[i] / 32000;
      return { vertCount, faceCount, pos, faces, faceMat, mats: new Uint8Array(mats) };
    } catch {
      return null;
    }
  })();
  return meshPromise;
}

const L = [-0.45, 0.62, 0.64]; // light direction (same as favicon script)

export class MonogramRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mesh: MonogramMesh;
  private X: Float32Array;
  private Y: Float32Array;
  private Z: Float32Array;
  private order: { i: number; z: number }[];

  constructor(mesh: MonogramMesh, sizePx = 192) {
    this.mesh = mesh;
    this.canvas = document.createElement('canvas');
    this.canvas.width = sizePx;
    this.canvas.height = sizePx;
    this.ctx = this.canvas.getContext('2d')!;
    this.X = new Float32Array(mesh.vertCount);
    this.Y = new Float32Array(mesh.vertCount);
    this.Z = new Float32Array(mesh.vertCount);
    this.order = Array.from({ length: mesh.faceCount }, (_, i) => ({ i, z: 0 }));
  }

  render(yaw: number, pitch: number) {
    const { mesh, ctx, X, Y, Z } = this;
    const size = this.canvas.width;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const s = size * 0.46;
    for (let i = 0; i < mesh.vertCount; i++) {
      const x0 = mesh.pos[i * 3], y0 = mesh.pos[i * 3 + 1], z0 = mesh.pos[i * 3 + 2];
      const x1 = x0 * cy + z0 * sy;
      const z1 = -x0 * sy + z0 * cy;
      const y2 = y0 * cx - z1 * sx;
      const z2 = y0 * sx + z1 * cx;
      X[i] = size / 2 + x1 * s;
      Y[i] = size / 2 - y2 * s;
      Z[i] = z2;
    }
    for (let f = 0; f < mesh.faceCount; f++) {
      const o = this.order[f];
      o.i = f;
      o.z = Z[mesh.faces[f * 3]] + Z[mesh.faces[f * 3 + 1]] + Z[mesh.faces[f * 3 + 2]];
    }
    this.order.sort((a, b) => a.z - b.z);

    ctx.clearRect(0, 0, size, size);
    for (const { i } of this.order) {
      const a = mesh.faces[i * 3], b = mesh.faces[i * 3 + 1], c = mesh.faces[i * 3 + 2];
      const ux = X[b] - X[a], uy = Y[b] - Y[a], uz = Z[b] - Z[a];
      const vx = X[c] - X[a], vy = Y[c] - Y[a], vz = Z[c] - Z[a];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      if (nz >= 0) continue; // backface (screen space, Y flipped)
      const len = Math.hypot(nx, ny, nz) || 1;
      nx = -nx / len;
      ny = -ny / len;
      nz = -nz / len;
      const ndl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const inten = 0.32 + 0.72 * ndl;
      const spec = Math.pow(ndl, 14) * 55;
      const lift = 26 * inten; // keeps the near-black plinth readable on dark bg
      const m = mesh.faceMat[i] * 3;
      const r = Math.min(255, mesh.mats[m] * inten + lift + spec) | 0;
      const g = Math.min(255, mesh.mats[m + 1] * inten + lift + spec) | 0;
      const bl = Math.min(255, mesh.mats[m + 2] * inten + lift + spec) | 0;
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.beginPath();
      ctx.moveTo(X[a], Y[a]);
      ctx.lineTo(X[b], Y[b]);
      ctx.lineTo(X[c], Y[c]);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// --- shared engine: one render loop feeds every subscribed logo canvas ------
const STATIC_POSE = { yaw: -0.5, pitch: -0.32 };
const FPS = 20;
const TURN_SECONDS = 14;

interface Engine {
  renderer: MonogramRenderer;
  subs: Set<HTMLCanvasElement>;
  running: boolean;
}

let engine: Engine | null = null;
let raf = 0;
let stallTimer = 0;
let lastFrame = 0;
let yaw = STATIC_POSE.yaw;

function blitAll(e: Engine) {
  for (const sub of e.subs) {
    const c = sub.getContext('2d');
    if (!c) continue;
    c.clearRect(0, 0, sub.width, sub.height);
    c.drawImage(e.renderer.canvas, 0, 0, sub.width, sub.height);
  }
}

function tick() {
  if (!engine || !engine.running) return;
  window.clearTimeout(stallTimer);
  if (document.hidden) return; // resumed by visibilitychange below
  const now = performance.now();
  if (now - lastFrame >= 1000 / FPS) {
    lastFrame = now;
    yaw += (Math.PI * 2) / (TURN_SECONDS * FPS);
    engine.renderer.render(yaw, STATIC_POSE.pitch);
    blitAll(engine);
  }
  schedule();
}

function schedule() {
  cancelAnimationFrame(raf);
  window.clearTimeout(stallTimer);
  raf = requestAnimationFrame(tick);
  stallTimer = window.setTimeout(() => {
    cancelAnimationFrame(raf);
    tick();
  }, 250);
}

function onVisibility() {
  if (!document.hidden && engine?.running) schedule();
}

/** Subscribe a canvas to the shared spinning render (or a static pose). */
export async function subscribeLogo(sub: HTMLCanvasElement, animated: boolean): Promise<() => void> {
  const mesh = await loadMonogram();
  if (!mesh) return () => {};
  if (!engine) {
    engine = { renderer: new MonogramRenderer(mesh), subs: new Set(), running: false };
    document.addEventListener('visibilitychange', onVisibility);
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animated || reduced) {
    // one static frame, no loop membership
    engine.renderer.render(STATIC_POSE.yaw, STATIC_POSE.pitch);
    const c = sub.getContext('2d');
    if (c) {
      c.clearRect(0, 0, sub.width, sub.height);
      c.drawImage(engine.renderer.canvas, 0, 0, sub.width, sub.height);
    }
    return () => {};
  }
  engine.subs.add(sub);
  // immediate first paint so the logo never flashes empty
  engine.renderer.render(yaw, STATIC_POSE.pitch);
  blitAll(engine);
  if (!engine.running) {
    engine.running = true;
    schedule();
  }
  return () => {
    engine?.subs.delete(sub);
    if (engine && engine.subs.size === 0) {
      engine.running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(stallTimer);
    }
  };
}
