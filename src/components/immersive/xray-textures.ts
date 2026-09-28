/* ============================================================
   Procedural material textures for the X-ray wall.

   Everything is painted into 2D canvases at runtime — no image or
   model downloads. Each painter is seeded, so the wall looks the same
   on every visit (a drawing, not a slot machine).

   Scale reference: textures are painted per physical panel, so the
   pixel density is chosen per layer from how close the camera gets.
   ============================================================ */

type Ctx = CanvasRenderingContext2D;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/* per-pixel grain, +-amp around the existing colour */
function grain(ctx: Ctx, w: number, h: number, amp: number, r: () => number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amp;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/* Level 5 skim coat: near-white with the faintest trowel sweeps. */
export function finishCanvas() {
  const W = 1024, H = 1024;
  const [c, ctx] = make(W, H);
  const r = rng(11);
  ctx.fillStyle = "#f2f1ec";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    ctx.save();
    ctx.translate(r() * W, r() * H);
    ctx.rotate(r() * Math.PI);
    ctx.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(120,118,105,0.028)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 40 + r() * 140, 8 + r() * 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  grain(ctx, W, H, 5, r);
  return c;
}

/* 4x10 gypsum board: paper face, tapered long edges, screw heads on
   the stud lines at 12" o.c. */
export function boardCanvas(seed = 3) {
  const W = 400, H = 1000; // 100px per foot
  const [c, ctx] = make(W, H);
  const r = rng(seed);
  ctx.fillStyle = "#d9d6cc";
  ctx.fillRect(0, 0, W, H);
  // paper fibres
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = 2 + r() * 7;
    ctx.strokeStyle = r() > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(90,84,70,0.08)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // tapered edges read slightly darker
  const taper = (x0: number, dir: number) => {
    const g = ctx.createLinearGradient(x0, 0, x0 + dir * 22, 0);
    g.addColorStop(0, "rgba(80,74,60,0.16)");
    g.addColorStop(1, "rgba(80,74,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x0 + dir * 22), 0, 22, H);
  };
  taper(0, 1);
  taper(W, -1);
  // screws on the four stud lines of a 4ft sheet (16" o.c.)
  const cols = [5, W / 3, (2 * W) / 3, W - 5];
  for (const x of cols) {
    for (let y = 50; y < H; y += 100) {
      ctx.fillStyle = "rgba(70,66,56,0.55)";
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(x - 0.7, y - 0.7, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  grain(ctx, W, H, 7, r);
  return c;
}

/* oriented strand board */
export function osbCanvas(seed = 5) {
  const W = 400, H = 1000;
  const [c, ctx] = make(W, H);
  const r = rng(seed);
  ctx.fillStyle = "#b08552";
  ctx.fillRect(0, 0, W, H);
  const tones = ["#c9a36a", "#a9783f", "#d8b47c", "#8f6433", "#bf9258", "#e0c08a", "#9c6e3a"];
  for (let i = 0; i < 2200; i++) {
    ctx.save();
    ctx.translate(r() * W, r() * H);
    ctx.rotate((r() - 0.5) * 1.1 + (r() > 0.7 ? Math.PI / 2 : 0));
    ctx.fillStyle = tones[Math.floor(r() * tones.length)];
    ctx.globalAlpha = 0.55 + r() * 0.4;
    const w = 18 + r() * 44, h = 4 + r() * 9;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(60,38,14,0.25)";
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  grain(ctx, W, H, 12, r);
  return c;
}

/* mineral wool: khaki, fibrous, with a light lengthwise lay */
export function woolCanvas() {
  const W = 256, H = 512;
  const [c, ctx] = make(W, H);
  const r = rng(7);
  ctx.fillStyle = "#a79f86";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 5200; i++) {
    const x = r() * W, y = r() * H;
    const a = (r() - 0.5) * 1.2;
    const l = 4 + r() * 16;
    ctx.strokeStyle = r() > 0.55 ? "rgba(214,206,178,0.34)" : "rgba(78,70,50,0.22)";
    ctx.lineWidth = 0.5 + r() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  grain(ctx, W, H, 16, r);
  return c;
}

/* EPS insulation board, 2x4 boards in running bond across a 12x10 face */
export function epsCanvas() {
  const W = 960, H = 800; // 80px per foot
  const [c, ctx] = make(W, H);
  const r = rng(9);
  ctx.fillStyle = "#ebe6d8";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.22)" : "rgba(120,110,86,0.10)";
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, 0.8 + r() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(110,100,78,0.45)";
  ctx.lineWidth = 1.6;
  const rowH = 160, boardW = 320;
  for (let row = 0; row * rowH < H; row++) {
    const y = H - row * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    const off = row % 2 ? boardW / 2 : 0;
    for (let x = off; x < W; x += boardW) {
      if (x <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - rowH);
      ctx.stroke();
    }
  }
  return c;
}

/* EIFS finish coat: warm stone sand texture with one aesthetic reveal */
export function laminaCanvas() {
  const W = 960, H = 800;
  const [c, ctx] = make(W, H);
  const r = rng(13);
  ctx.fillStyle = "#c9bfac";
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 26, r);
  // aesthetic reveal at 6'-0"
  const y = H - 6 * 80;
  ctx.fillStyle = "rgba(60,52,40,0.55)";
  ctx.fillRect(0, y - 5, W, 7);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, y + 2, W, 2);
  return c;
}

/* 2x wood blocking, lengthwise grain */
export function woodCanvas() {
  const W = 512, H = 96;
  const [c, ctx] = make(W, H);
  const r = rng(17);
  ctx.fillStyle = "#c79a61";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 36; i++) {
    const y0 = r() * H, amp = 2 + r() * 5, f = 0.004 + r() * 0.01, ph = r() * 6;
    ctx.strokeStyle = r() > 0.4 ? "rgba(120,78,34,0.35)" : "rgba(240,205,150,0.3)";
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = y0 + Math.sin(x * f + ph) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  grain(ctx, W, H, 10, r);
  return c;
}

/* galvanised spangle: irregular crystalline patches of varied lustre */
export function spangleCanvas() {
  const S = 512;
  const [c, ctx] = make(S, S);
  const r = rng(19);
  ctx.fillStyle = "#c2cac9";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 520; i++) {
    const cx = r() * S, cy = r() * S, rad = 8 + r() * 26;
    const v = Math.floor(170 + r() * 70);
    ctx.fillStyle = `rgba(${v},${v + 4},${v + 3},0.35)`;
    ctx.beginPath();
    const n = 5 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.5;
      const rr = rad * (0.6 + r() * 0.5);
      k === 0 ? ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  grain(ctx, S, S, 10, r);
  return c;
}

/* 2x4 mineral-fibre acoustical tile, fissured */
export function tileCanvas() {
  const W = 256, H = 512;
  const [c, ctx] = make(W, H);
  const r = rng(23);
  ctx.fillStyle = "#efeee8";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 1100; i++) {
    const x = r() * W, y = r() * H;
    ctx.strokeStyle = `rgba(90,92,84,${0.15 + r() * 0.3})`;
    ctx.lineWidth = 0.7 + r() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x, py = y;
    const segs = 1 + Math.floor(r() * 3);
    for (let k = 0; k < segs; k++) {
      px += (r() - 0.5) * 7;
      py += (r() - 0.5) * 7;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = "rgba(110,110,100,0.22)";
    ctx.fillRect(r() * W, r() * H, 1, 1);
  }
  // bevelled edge shading
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  return c;
}
