import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const items = [
  {
    n: "01",
    label: "Square. Plumb. On layout.",
    note: "Frames built to the drawings, not to the eye.",
  },
  {
    n: "02",
    label: "Coordinated with every trade.",
    note: "On site with the GC, the MEPs, and the inspector — all week.",
  },
  {
    n: "03",
    label: "Inspection-ready finish.",
    note: "Passes the first walk. No callbacks, no rework.",
  },
  {
    n: "04",
    label: "Phased around your operations.",
    note: "After-hours, weekend, occupied-space — we work around the business.",
  },
];

const photo = "/images/projects/jobsite-05.webp";
const photo800 = "/images/projects/jobsite-05-800.webp";

export default function ApproachReveal() {
  const outerRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<HTMLOListElement>(null);
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
    const list = itemsRef.current;
    if (!outer || !list) return;

    const lis = Array.from(list.querySelectorAll<HTMLElement>("[data-app-item]"));
    if (!lis.length) return;
    const count = lis.length;

    const ctx = gsap.context(() => {
      gsap.set(lis, { opacity: 0.25 });
      gsap.set(lis[0], { opacity: 1 });

      ScrollTrigger.create({
        trigger: outer,
        start: "top top",
        end: `+=${count * 80}%`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const active = Math.min(
            count - 1,
            Math.floor(self.progress * count),
          );
          lis.forEach((li, i) => {
            const target = i === active ? 1 : i < active ? 0.18 : 0.32;
            gsap.to(li, { opacity: target, overwrite: "auto", duration: 0.35 });
            li.dataset.active = i === active ? "true" : "false";
          });
          // photo kenburns
          const img = outer.querySelector<HTMLImageElement>("[data-app-img]");
          if (img) {
            const k = 1 + self.progress * 0.06;
            img.style.transform = `scale(${k})`;
          }
        },
      });
    }, outer);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={outerRef}
      data-section="The approach"
      className="app-rev"
    >
      <div className="app-rev__bg" aria-hidden="true">
        <picture>
          <img
            data-app-img
            src={photo}
            srcSet={`${photo800} 800w, ${photo} 1600w`}
            sizes="100vw"
            alt=""
            loading="lazy"
          />
        </picture>
        <div className="app-rev__veil" />
      </div>

      <div className="app-rev__inner">
        <header className="app-rev__head">
          <p className="label app-rev__eyebrow">
            <span className="app-rev__bar"></span>The approach
          </p>
          <h2 className="text-section">
            A trade partner, <em>not a&nbsp;sales pitch.</em>
          </h2>
        </header>

        <ol ref={itemsRef} className="app-rev__list">
          {items.map((it) => (
            <li key={it.n} data-app-item className="app-item">
              <span className="label app-item__idx">{it.n}</span>
              <div>
                <p className="app-item__label">{it.label}</p>
                <p className="app-item__note">{it.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        .app-rev {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: var(--color-graphite);
        }
        .app-rev__bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .app-rev__bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.92) saturate(0.78) contrast(0.95);
          will-change: transform;
        }
        .app-rev__veil {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, color-mix(in oklab, var(--color-graphite) 92%, transparent) 0%, color-mix(in oklab, var(--color-graphite) 60%, transparent) 50%, color-mix(in oklab, var(--color-graphite) 25%, transparent) 100%),
            linear-gradient(180deg, color-mix(in oklab, var(--color-graphite) 50%, transparent) 0%, transparent 30%, transparent 70%, color-mix(in oklab, var(--color-graphite) 50%, transparent) 100%);
          pointer-events: none;
        }

        .app-rev__inner {
          position: relative;
          z-index: 1;
          height: 100vh;
          max-width: 96rem;
          margin: 0 auto;
          padding: clamp(4rem, 9vw, 7rem) clamp(1.25rem, 4vw, 3.5rem);
          display: grid;
          grid-template-rows: auto 1fr;
          gap: clamp(2rem, 5vw, 4rem);
        }
        .app-rev__head { display: grid; gap: 1.25rem; max-width: 38rem; }
        .app-rev__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          color: var(--color-flare);
        }
        .app-rev__bar {
          width: 1.5rem;
          height: 1px;
          background: var(--color-flare);
        }
        .app-rev__head h2 em {
          color: var(--color-flare);
          font-style: normal;
        }
        .app-rev__list {
          align-self: end;
          max-width: 44rem;
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: clamp(1rem, 2vw, 1.75rem);
        }
        .app-item {
          display: grid;
          grid-template-columns: 3rem 1fr;
          align-items: baseline;
          gap: 1.25rem;
          padding: clamp(0.5rem, 1vw, 0.85rem) 0;
          border-top: 1px solid color-mix(in oklab, var(--color-bone) 12%, transparent);
          transition: opacity 0.35s var(--ease-out-expo);
        }
        .app-item__idx { color: var(--color-emerald); }
        .app-item__label {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: clamp(1.35rem, 2.6vw, 2.4rem);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: var(--color-bone);
        }
        .app-item__note {
          margin-top: 0.5rem;
          color: var(--color-ash);
          font-size: 0.95rem;
          line-height: 1.55;
          max-width: 32rem;
        }
        .app-item[data-active="true"] .app-item__label {
          color: var(--color-flare);
        }

        @media (prefers-reduced-motion: reduce) {
          .app-rev { min-height: auto; }
          .app-rev__inner { height: auto; }
          .app-item { opacity: 1 !important; }
          .app-item[data-active] .app-item__label { color: var(--color-bone); }
        }
      `}</style>
    </section>
  );
}
