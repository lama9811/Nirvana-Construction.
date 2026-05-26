import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  items: string[];
}

/* Vertical scope list where each row scales 0.75 → 1.0 → 0.75 as it crosses
   the viewport center. The "active" row glows flare-orange. A sticky
   right-hand chip shows "04 / 11". */
export default function ScopeMagnify({ items }: Props) {
  const outerRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const [activeLabel, setActiveLabel] = useState({ idx: 1, total: items.length });
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
    const list = listRef.current;
    if (!list) return;

    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-scope-row]"));

    const ctx = gsap.context(() => {
      rows.forEach((row, i) => {
        // ramp-in: from 0.75 / dimmed → 1.0 / bright
        gsap.fromTo(
          row,
          { scale: 0.78, opacity: 0.4 },
          {
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: row,
              start: "top 80%",
              end: "center 50%",
              scrub: 1,
            },
          },
        );
        // ramp-out: from 1.0 → 0.78 / dimmed
        gsap.fromTo(
          row,
          { scale: 1, opacity: 1 },
          {
            scale: 0.78,
            opacity: 0.4,
            ease: "power2.in",
            scrollTrigger: {
              trigger: row,
              start: "center 50%",
              end: "bottom 20%",
              scrub: 1,
            },
          },
        );
        // active-state trigger (sets data-active for the orange glow + chip update)
        ScrollTrigger.create({
          trigger: row,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            rows.forEach((r) => (r.dataset.active = "false"));
            row.dataset.active = "true";
            setActiveLabel({ idx: i + 1, total: rows.length });
          },
          onEnterBack: () => {
            rows.forEach((r) => (r.dataset.active = "false"));
            row.dataset.active = "true";
            setActiveLabel({ idx: i + 1, total: rows.length });
          },
        });
      });
    }, outerRef);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={outerRef}
      data-section="Scope of work"
      className="scope-mag"
    >
      <div className="scope-mag__inner">
        <header className="scope-mag__intro">
          <p className="label scope-mag__eyebrow">
            <span className="scope-mag__bar"></span>Scope of work
          </p>
          <h2 className="text-section">
            Every wall in&nbsp;the&nbsp;building.
          </h2>
          <p className="scope-mag__lead">
            The trade scopes we deliver across every commercial sector — from
            metal-stud framing to final paint.
          </p>
        </header>

        <ol ref={listRef} className="scope-mag__list">
          {items.map((item, i) => (
            <li
              key={item}
              data-scope-row
              className="scope-mag__row"
            >
              <span className="label scope-mag__idx">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="scope-mag__name">{item}</span>
              <span className="scope-mag__dash" aria-hidden="true"></span>
            </li>
          ))}
        </ol>
      </div>

      {/* sticky right-side index chip */}
      <div className="scope-mag__chip" aria-hidden="true">
        <span>{String(activeLabel.idx).padStart(2, "0")}</span>
        <span className="scope-mag__chip-bar" />
        <span>{String(activeLabel.total).padStart(2, "0")}</span>
      </div>

      <style>{`
        .scope-mag {
          position: relative;
          padding: clamp(5rem, 10vw, 9rem) clamp(1.25rem, 4vw, 3.5rem);
          background: var(--color-ink);
        }
        .scope-mag__inner {
          max-width: 96rem;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(2.5rem, 5vw, 4rem);
        }
        .scope-mag__intro {
          display: grid;
          gap: 1.25rem;
          max-width: 36rem;
        }
        .scope-mag__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          color: var(--color-flare);
        }
        .scope-mag__bar {
          width: 1.5rem;
          height: 1px;
          background: var(--color-flare);
        }
        .scope-mag__lead {
          color: var(--color-ash);
          max-width: 32rem;
        }
        .scope-mag__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0;
        }
        .scope-mag__row {
          display: grid;
          grid-template-columns: 4ch 1fr auto;
          align-items: center;
          gap: 1.5rem;
          padding: clamp(0.8rem, 2vw, 1.4rem) 0;
          border-bottom: 1px solid color-mix(in oklab, var(--color-bone) 9%, transparent);
          transform-origin: left center;
          transition: color 0.35s var(--ease-out-expo);
          will-change: transform, opacity;
        }
        .scope-mag__idx { color: var(--color-concrete); }
        .scope-mag__name {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: clamp(1.6rem, 4vw, 3.2rem);
          line-height: 1.0;
          letter-spacing: -0.02em;
          color: var(--color-bone);
          transition: color 0.35s var(--ease-out-expo);
        }
        .scope-mag__dash {
          width: 2.5rem;
          height: 1px;
          background: color-mix(in oklab, var(--color-bone) 22%, transparent);
          transition: width 0.4s var(--ease-out-expo), background-color 0.35s;
        }
        .scope-mag__row[data-active="true"] .scope-mag__name {
          color: var(--color-flare);
        }
        .scope-mag__row[data-active="true"] .scope-mag__idx {
          color: var(--color-emerald);
        }
        .scope-mag__row[data-active="true"] .scope-mag__dash {
          width: 5rem;
          background: var(--color-flare);
        }

        .scope-mag__chip {
          position: sticky;
          bottom: 1.5rem;
          left: calc(100% - 5.5rem);
          margin-top: -3rem;
          width: 5rem;
          padding: 0.55rem 0.7rem;
          background: color-mix(in oklab, var(--color-ink) 85%, transparent);
          border: 1px solid color-mix(in oklab, var(--color-bone) 12%, transparent);
          backdrop-filter: blur(8px);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--color-ash);
          display: none;
          align-items: center;
          gap: 0.45rem;
          z-index: 5;
        }
        .scope-mag__chip-bar {
          flex: 1;
          height: 1px;
          background: color-mix(in oklab, var(--color-bone) 22%, transparent);
        }
        .scope-mag__chip span:first-child { color: var(--color-emerald); font-weight: 500; }
        @media (min-width: 980px) {
          .scope-mag__inner {
            grid-template-columns: 0.7fr 1.3fr;
            gap: 5rem;
          }
          .scope-mag__chip { display: inline-flex; }
        }

        @media (prefers-reduced-motion: reduce) {
          .scope-mag__row {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
