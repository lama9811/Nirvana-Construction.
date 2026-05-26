/* ============================================================
   motion.ts — declarative motion backbone for the Stitch design.

   Lenis smooth-scroll synced with GSAP ScrollTrigger, plus six
   data-attribute hooks pages can opt into:

     [data-reveal]                  fade + rise on scroll-into-view
     [data-parallax="0.3"]          translate Y proportional to scroll
     [data-count="10" data-suffix="+"]  number scrubs up on enter
     [data-tilt]                    3D mouse-tilt with perspective
     [data-magnetic]                button tugs toward cursor
     [data-words]                   wraps each word in a <span> and
                                    staggers them on first paint

   All effects degrade fully under prefers-reduced-motion.
   Re-initialised on every Astro page navigation.
   ============================================================ */

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let revealObserver: IntersectionObserver | null = null;
const cleanups: Array<() => void> = [];

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function getLenis(): Lenis | null {
  return lenis;
}

function tick(time: number) {
  lenis?.raf(time * 1000);
}

/* ---------- [data-reveal] — single-fire fade-up ----------- */
function setupReveals() {
  revealObserver?.disconnect();
  const els = document.querySelectorAll<HTMLElement>("[data-reveal], .reveal");

  if (prefersReducedMotion()) {
    els.forEach((el) => el.classList.add("is-in", "active"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in", "active");
          revealObserver?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -7% 0px" },
  );
  els.forEach((el) => revealObserver!.observe(el));
}

/* ---------- [data-parallax="0.3"] — scroll-Y translate ---- */
function setupParallax() {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const speed = parseFloat(el.dataset.parallax || "0.2");
    const tween = gsap.fromTo(
      el,
      { yPercent: -speed * 50 },
      {
        yPercent: speed * 50,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement || el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
    cleanups.push(() => {
      tween.scrollTrigger?.kill();
      tween.kill();
    });
  });
}

/* ---------- [data-count="10" data-suffix="+"] — scrub up - */
function setupCounters() {
  if (prefersReducedMotion()) {
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const target = el.dataset.count || "";
      const suffix = el.dataset.suffix || "";
      el.textContent = target + suffix;
    });
    return;
  }
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const final = el.dataset.count || "0";
    const suffix = el.dataset.suffix || "";
    const isNumeric = /^\d+$/.test(final);
    if (!isNumeric) {
      // typewriter for things like "DBE", "22-204"
      const proxy = { c: 0 };
      const tween = gsap.to(proxy, {
        c: final.length,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          end: "top 40%",
          scrub: 0.8,
        },
        onUpdate: () => {
          el.textContent = final.slice(0, Math.round(proxy.c)) + suffix;
        },
      });
      cleanups.push(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
      return;
    }
    const target = parseInt(final, 10);
    const pad = final.length;
    const proxy = { v: 0 };
    el.textContent = "0".padStart(pad, "0") + suffix;
    const tween = gsap.to(proxy, {
      v: target,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        end: "top 45%",
        scrub: 1,
      },
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.v)).padStart(pad, "0") + suffix;
      },
    });
    cleanups.push(() => {
      tween.scrollTrigger?.kill();
      tween.kill();
    });
  });
}

/* ---------- [data-tilt] — 3D perspective tilt on hover --- */
function setupTilt() {
  if (prefersReducedMotion()) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const max = 9; // max rotation degrees
  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
    el.style.transformStyle = "preserve-3d";
    el.style.willChange = "transform";
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, {
        rotationY: x * max * 2,
        rotationX: -y * max * 2,
        transformPerspective: 900,
        ease: "power2.out",
        duration: 0.5,
        overwrite: "auto",
      });
    };
    const onLeave = () => {
      gsap.to(el, {
        rotationY: 0,
        rotationX: 0,
        ease: "power3.out",
        duration: 0.8,
        overwrite: "auto",
      });
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    cleanups.push(() => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    });
  });
}

/* ---------- [data-magnetic] — cursor-tug pull ------------- */
function setupMagnetic() {
  if (prefersReducedMotion()) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const padding = 120;
    const strength = 4;
    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const ccx = r.left + r.width / 2;
      const ccy = r.top + r.height / 2;
      const dx = e.clientX - ccx;
      const dy = e.clientY - ccy;
      const inside =
        Math.abs(dx) < r.width / 2 + padding &&
        Math.abs(dy) < r.height / 2 + padding;
      tx = inside ? dx / strength : 0;
      ty = inside ? dy / strength : 0;
    };
    const update = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener("mousemove", onMove);
    cleanups.push(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      el.style.transform = "";
    });
  });
}

/* ---------- [data-words] — word-by-word stagger -----------
   Splits the element's text content into safe per-word spans (no
   innerHTML — pure DOM construction with textContent). */
function setupWordStagger() {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
    if (!el.dataset.wrapped) {
      const text = el.textContent || "";
      const words = text.split(/\s+/).filter(Boolean);
      // clear existing nodes safely
      while (el.firstChild) el.removeChild(el.firstChild);
      words.forEach((w, i) => {
        const outer = document.createElement("span");
        outer.className = "word";
        outer.style.display = "inline-block";
        outer.style.overflow = "hidden";
        outer.style.verticalAlign = "bottom";
        const inner = document.createElement("span");
        inner.className = "word-inner";
        inner.style.display = "inline-block";
        inner.textContent = w;
        outer.appendChild(inner);
        el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
      el.dataset.wrapped = "true";
    }
    const inners = el.querySelectorAll<HTMLElement>(".word-inner");
    gsap.from(inners, {
      yPercent: 110,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      stagger: 0.045,
      delay: parseFloat(el.dataset.delay || "0"),
    });
  });
}

/* ---------- Lifecycle ------------------------------------- */
export function destroyMotion() {
  while (cleanups.length) {
    try {
      cleanups.pop()?.();
    } catch {
      /* ignore */
    }
  }
  ScrollTrigger.getAll().forEach((t) => t.kill());
  revealObserver?.disconnect();
  revealObserver = null;
  if (lenis) {
    gsap.ticker.remove(tick);
    lenis.destroy();
    lenis = null;
    (window as Window & { __lenis?: Lenis | null }).__lenis = null;
  }
}

export function initMotion() {
  destroyMotion();

  setupReveals();

  if (prefersReducedMotion()) {
    setupCounters();
    ScrollTrigger.refresh();
    return;
  }

  lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.7,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  (window as Window & { __lenis?: Lenis | null }).__lenis = lenis;

  setupParallax();
  setupCounters();
  setupTilt();
  setupMagnetic();
  setupWordStagger();

  ScrollTrigger.refresh();
}

export function scrollProgress(): number {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? window.scrollY / max : 0;
}

export function refreshScroll() {
  ScrollTrigger.refresh();
}
