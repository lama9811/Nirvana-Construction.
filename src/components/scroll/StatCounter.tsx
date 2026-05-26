import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Figure {
  value: string;
  label: string;
}

interface Props {
  figures: readonly Figure[] | Figure[];
}

/* Pinned stats band: numbers scrub from "000" → final as the band crosses
   the viewport. Non-numeric values (DBE, MD) typewriter-reveal one char at
   a time instead. */
export default function StatCounter({ figures }: Props) {
  const outerRef = useRef<HTMLElement>(null);
  const cellsRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const outer = outerRef.current;
    const wrap = cellsRef.current;
    if (!outer || !wrap) return;

    const ctx = gsap.context(() => {
      const cells = Array.from(
        wrap.querySelectorAll<HTMLElement>("[data-stat]"),
      );

      cells.forEach((cell, i) => {
        const final = cell.dataset.stat || "";
        const numEl = cell.querySelector<HTMLElement>("[data-stat-num]");
        if (!numEl) return;

        const isNumeric = /^\d+$/.test(final);
        if (isNumeric) {
          const target = parseInt(final, 10);
          const pad = final.length;
          const proxy = { v: 0 };
          gsap.to(proxy, {
            v: target,
            ease: "power2.out",
            scrollTrigger: {
              trigger: outer,
              start: "top 80%",
              end: "bottom 40%",
              scrub: 1,
            },
            onUpdate: () => {
              numEl.textContent = String(Math.round(proxy.v)).padStart(pad, "0");
            },
          });
        } else {
          // typewriter for mixed strings (DBE, MD, 22-204)
          const chars = final.length;
          const proxy = { c: 0 };
          gsap.to(proxy, {
            c: chars,
            ease: "none",
            scrollTrigger: {
              trigger: outer,
              start: "top 80%",
              end: "bottom 40%",
              scrub: 1,
            },
            onUpdate: () => {
              const n = Math.round(proxy.c);
              numEl.textContent = final.slice(0, n);
            },
          });
        }

        // staggered cell reveal
        gsap.fromTo(
          cell,
          { opacity: 0.15, y: 24 },
          {
            opacity: 1,
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: cell,
              start: "top 85%",
              end: "top 60%",
              scrub: 1,
            },
            delay: i * 0.05,
          },
        );
      });
    }, outer);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={outerRef} className="stat-counter">
      <div ref={cellsRef} className="stat-counter__inner">
        {figures.map((f, i) => (
          <div
            key={f.label}
            data-stat={f.value}
            className="stat-counter__cell"
          >
            <span data-stat-num className="stat-counter__num">
              {reduced ? f.value : f.value.replace(/./g, "0")}
            </span>
            <span className="label stat-counter__lbl">{f.label}</span>
            {i === 0 && (
              <span className="stat-counter__plus" aria-hidden="true">+</span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .stat-counter {
          border-top: 1px solid color-mix(in oklab, var(--color-bone) 9%, transparent);
          border-bottom: 1px solid color-mix(in oklab, var(--color-bone) 9%, transparent);
          padding: clamp(2.5rem, 5vw, 4rem) clamp(1.25rem, 4vw, 3.5rem);
          background: var(--color-ink);
        }
        .stat-counter__inner {
          max-width: 96rem;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2.25rem;
        }
        .stat-counter__cell {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          will-change: opacity, transform;
        }
        .stat-counter__num {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(2.75rem, 6vw, 5rem);
          line-height: 0.9;
          letter-spacing: -0.04em;
          color: var(--color-bone);
          font-variant-numeric: tabular-nums;
        }
        .stat-counter__lbl { color: var(--color-ash); }
        .stat-counter__plus {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(calc(100% + 0.2rem), 0.15rem);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(1.5rem, 3vw, 2.4rem);
          color: var(--color-flare);
        }
        @media (min-width: 760px) {
          .stat-counter__inner { grid-template-columns: repeat(4, 1fr); }
        }
        @media (prefers-reduced-motion: reduce) {
          .stat-counter__cell { opacity: 1 !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
