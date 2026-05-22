/* ============================================================
   motion.ts — the motion backbone.
   Lenis smooth-scroll synced with GSAP ScrollTrigger, plus the
   scroll-reveal observer. Re-initialised on every Astro page
   navigation; degrades fully under prefers-reduced-motion.
   ============================================================ */

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let revealObserver: IntersectionObserver | null = null;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function getLenis(): Lenis | null {
  return lenis;
}

/* GSAP ticker drives Lenis — named fn so it can be removed */
function tick(time: number) {
  lenis?.raf(time * 1000);
}

function setupReveals() {
  revealObserver?.disconnect();
  const els = document.querySelectorAll<HTMLElement>("[data-reveal]");

  if (prefersReducedMotion()) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -7% 0px" },
  );
  els.forEach((el) => revealObserver!.observe(el));
}

export function destroyMotion() {
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

  if (prefersReducedMotion()) {
    setupReveals();
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

  setupReveals();
  ScrollTrigger.refresh();
}

/* normalised 0→1 scroll progress of the whole document */
export function scrollProgress(): number {
  if (typeof window === "undefined") return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? window.scrollY / max : 0;
}
