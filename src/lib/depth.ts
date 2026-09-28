/* ============================================================
   depth.ts — the shared 3D motion layer for content sections.

     data-depth-in          perspective tilt-in on first view
       data-depth-stagger   children cascade 70 ms apart
     data-flip="19+"        odometer: digits roll on 3D drums
     data-glow              cursor light + gentle tilt (mouse only)
     data-fan               (with depth-in + stagger) cards deal out of a stack
     data-stack             layered 3D group: turns on scroll, leans to cursor
     data-scrub             words light in reading order as you scroll
     data-rise[="top"]      lies back in depth below mid-screen, stands up as
                            it arrives; grid siblings lag by column (a wave)

   Start states apply only under html.js-depth, which this module
   sets — with no JS everything is simply visible. Reduced motion:
   final states, no observers. lib/motion.ts is not touched.
   ============================================================ */

import { stackTilt, scrubLit, risePose } from "./drum.ts";

export type FlipPart = { kind: "digit"; value: number } | { kind: "static"; text: string };

/* "19+" → [1][9]"+" — digits roll, everything else sits still */
export function flipParts(value: string): FlipPart[] {
  const out: FlipPart[] = [];
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") out.push({ kind: "digit", value: Number(ch) });
    else {
      const last = out[out.length - 1];
      if (last && last.kind === "static") last.text += ch;
      else out.push({ kind: "static", text: ch });
    }
  }
  return out;
}

function buildFlip(el: HTMLElement) {
  if (el.dataset.flipBuilt) return;
  el.dataset.flipBuilt = "1";
  const value = el.dataset.flip ?? el.textContent ?? "";
  el.textContent = "";
  /* screen readers get the real value once, not ten digits per drum */
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = value;
  el.append(sr);
  for (const part of flipParts(value)) {
    if (part.kind === "static") {
      const s = document.createElement("span");
      s.className = "flip-static";
      s.setAttribute("aria-hidden", "true");
      s.textContent = part.text;
      el.append(s);
      continue;
    }
    const drum = document.createElement("span");
    drum.className = "flip-drum";
    drum.style.setProperty("--i", String(el.querySelectorAll(".flip-drum").length));
    drum.setAttribute("aria-hidden", "true");
    const reel = document.createElement("span");
    reel.className = "flip-reel";
    reel.style.setProperty("--to", String(part.value));
    for (let d = 0; d <= 9; d++) {
      const f = document.createElement("span");
      f.textContent = String(d);
      reel.append(f);
    }
    drum.append(reel);
    el.append(drum);
  }
}

export function initDepth(): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.toggle("js-depth", !reduced);
  const flips = [...document.querySelectorAll<HTMLElement>("[data-flip]")];
  flips.forEach(buildFlip);
  if (reduced) {
    flips.forEach((f) => f.classList.add("is-in"));
    return () => {};
  }

  const ins = [...document.querySelectorAll<HTMLElement>("[data-depth-in]")];
  document.querySelectorAll<HTMLElement>("[data-fan]").forEach((el) => {
    const kids = [...el.children] as HTMLElement[];
    const c = (kids.length - 1) / 2;
    kids.forEach((k, i) => {
      k.style.setProperty("--fi", String(i));
      k.style.setProperty("--fc", String(c));
      k.style.setProperty("--fa", String(Math.abs(i - c)));
    });
  });
  const timers: number[] = [];
  ins.forEach((el) => {
    if (el.hasAttribute("data-depth-stagger")) {
      [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty("--d", `${i * 70}ms`));
    }
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add("is-in");
        io.unobserve(el);
        /* after the tilt-in (≤ 0.9 s + its stagger) the element goes back to
           its own hover transitions, and data-glow's tilt can take over */
        const kids = el.hasAttribute("data-depth-stagger") ? el.children.length : 1;
        timers.push(window.setTimeout(() => el.classList.add("depth-done"), 950 + kids * 70));
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  [...ins, ...flips].forEach((el) => io.observe(el));

  /* anything reached by Tab or an anchor is shown even if its tilt-in never fired */
  const onFocus = (e: FocusEvent) => {
    const host = (e.target as HTMLElement | null)?.closest?.("[data-depth-in]");
    if (host) host.classList.add("is-in", "depth-done");
  };
  document.addEventListener("focusin", onFocus);

  /* cursor light + tilt, mouse only */
  const glows = window.matchMedia("(pointer: fine)").matches
    ? [...document.querySelectorAll<HTMLElement>("[data-glow]")]
    : [];
  const handlers = glows.map((el) => {
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
        el.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
        el.classList.add("glow-on");
      });
    };
    const leave = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      el.classList.remove("glow-on");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });

  const stopScroll = initScrollLinked();
  const stopStacks = initStackPointer();

  return () => {
    stopScroll();
    stopStacks();
    timers.forEach((t) => window.clearTimeout(t));
    io.disconnect();
    document.removeEventListener("focusin", onFocus);
    handlers.forEach((h) => h());
  };
}

/* split a text-only block into word spans (once) */
function splitWords(el: HTMLElement): HTMLElement[] {
  if (!el.dataset.scrubBuilt) {
    el.dataset.scrubBuilt = "1";
    const text = el.textContent ?? "";
    el.textContent = "";
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) return el.append(part);
      const w = document.createElement("span");
      w.className = "scrub-w";
      w.textContent = part;
      el.append(w);
    });
  }
  return [...el.querySelectorAll<HTMLElement>(".scrub-w")];
}

/* data-stack (scroll turn) + data-scrub (word light-up): one scroll loop,
   painting only elements near the viewport */
function initScrollLinked(): () => void {
  const stacks = [...document.querySelectorAll<HTMLElement>("[data-stack]")];
  const scrubs = [...document.querySelectorAll<HTMLElement>("[data-scrub]")].map((el) => ({
    el,
    words: splitWords(el),
    last: -1,
  }));
  const rises = [...document.querySelectorAll<HTMLElement>("[data-rise]")];
  if (!stacks.length && !scrubs.length && !rises.length) return () => {};
  const near = new Set<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? near.add(e.target) : near.delete(e.target);
      kick();
    },
    { rootMargin: "20% 0px" },
  );
  stacks.forEach((s) => io.observe(s));
  scrubs.forEach((s) => io.observe(s.el));
  rises.forEach((r) => io.observe(r));

  let raf = 0;
  const paint = () => {
    raf = 0;
    const vh = window.innerHeight;
    for (const s of stacks) {
      if (!near.has(s)) continue;
      const r = s.getBoundingClientRect();
      const t = stackTilt((vh - r.top) / (vh + r.height));
      s.style.setProperty("--sry", `${t.ry.toFixed(2)}deg`);
      s.style.setProperty("--srx", `${t.rx.toFixed(2)}deg`);
    }
    for (const el of rises) {
      if (!near.has(el) || !el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      const parent = el.parentElement!.getBoundingClientRect();
      /* each column trails the one on its left, so a row rolls up as a wave */
      const col = Math.max(0, Math.round((r.left - parent.left) / Math.max(1, r.width)));
      const edge = el.dataset.rise === "top" ? r.top + Math.min(r.height, vh) * 0.25 : r.top + r.height / 2;
      const k = risePose((edge - vh / 2) / (vh / 2) + col * 0.14);
      el.style.setProperty("--rise-rx", `${k.rx.toFixed(2)}deg`);
      el.style.setProperty("--rise-z", `${k.z.toFixed(1)}px`);
      el.style.setProperty("--rise-y", `${k.y.toFixed(1)}px`);
      el.style.setProperty("--rise-o", k.opacity.toFixed(3));
    }
    for (const s of scrubs) {
      if (!near.has(s.el)) continue;
      const r = s.el.getBoundingClientRect();
      /* starts as the block's top passes 85% of the screen, done by the
         time its bottom reaches 45% */
      const p = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
      const q = Math.round(Math.max(0, Math.min(1, p)) * 400) / 400;
      if (q === s.last) continue;
      s.last = q;
      const n = s.words.length;
      s.words.forEach((w, i) => w.style.setProperty("--lit", (0.16 + 0.84 * scrubLit(q, i, n)).toFixed(3)));
    }
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  paint();
  return () => {
    if (raf) cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener("scroll", kick);
    window.removeEventListener("resize", kick);
  };
}

/* data-stack cursor lean, mouse only */
function initStackPointer(): () => void {
  if (!window.matchMedia("(pointer: fine)").matches) return () => {};
  const offs = [...document.querySelectorAll<HTMLElement>("[data-stack]")].map((el) => {
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--pry", `${(x * 12).toFixed(2)}deg`);
      el.style.setProperty("--prx", `${(-y * 9).toFixed(2)}deg`);
    };
    const leave = () => {
      el.style.setProperty("--pry", "0deg");
      el.style.setProperty("--prx", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });
  return () => offs.forEach((f) => f());
}
