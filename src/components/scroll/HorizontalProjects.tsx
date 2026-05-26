import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Category =
  | "Retail"
  | "Hospitality"
  | "Medical"
  | "Education"
  | "Community"
  | "Commercial";

interface Project {
  index: string;
  slug: string;
  name: string;
  location: string;
  category: Category;
  descriptor: string;
  photo: string | null;
}

interface Props {
  projects: Project[];
}

const categoryTint: Record<Category, string> = {
  Retail: "color-mix(in oklab, var(--color-flare) 6%, var(--color-ink))",
  Hospitality: "color-mix(in oklab, #c98a3a 5%, var(--color-ink))",
  Medical: "color-mix(in oklab, #7a92a8 8%, var(--color-ink))",
  Education: "color-mix(in oklab, #8a915b 6%, var(--color-ink))",
  Community: "color-mix(in oklab, var(--color-emerald) 5%, var(--color-ink))",
  Commercial: "color-mix(in oklab, #8b9088 6%, var(--color-ink))",
};

export default function HorizontalProjects({ projects }: Props) {
  const outerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
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
    const track = trackRef.current;
    if (!outer || !track) return;

    const ctx = gsap.context(() => {
      const getDistance = () =>
        Math.max(0, track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: outer,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          end: () => "+=" + getDistance(),
        },
      });

      // Per-card scale + opacity + tint update as each crosses viewport center
      const cards = Array.from(
        track.querySelectorAll<HTMLElement>("[data-h-card]"),
      );
      cards.forEach((card) => {
        const tint = card.dataset.tint || "var(--color-ink)";
        gsap.fromTo(
          card,
          { scale: 0.88, opacity: 0.55 },
          {
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "left 80%",
              end: "left 30%",
              scrub: true,
              containerAnimation: tween,
            },
          },
        );
        gsap.to(card, {
          scale: 0.88,
          opacity: 0.55,
          ease: "power2.in",
          scrollTrigger: {
            trigger: card,
            start: "right 70%",
            end: "right 20%",
            scrub: true,
            containerAnimation: tween,
          },
        });
        ScrollTrigger.create({
          trigger: card,
          start: "left 60%",
          end: "right 40%",
          containerAnimation: tween,
          onEnter: () => outer.style.setProperty("--proj-tint", tint),
          onEnterBack: () => outer.style.setProperty("--proj-tint", tint),
        });
      });

      // initial tint
      if (cards[0]) {
        outer.style.setProperty(
          "--proj-tint",
          cards[0].dataset.tint || "var(--color-ink)",
        );
      }
    }, outer);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={outerRef}
      data-section="Selected projects"
      className="h-projects"
      style={{
        background: "var(--proj-tint, var(--color-ink))",
        transition: "background 0.6s var(--ease-out-expo)",
      }}
    >
      <div className="h-projects__inner">
        <header className="h-projects__head">
          <p className="label h-projects__eyebrow">
            <span className="h-projects__bar"></span>Selected projects
          </p>
          <h2 className="text-section">
            We <em>frame</em> what other people walk into.
          </h2>
          <p className="h-projects__hint">
            <span>Scroll</span>
            <span className="h-projects__arrow" aria-hidden="true">→</span>
          </p>
        </header>

        <div ref={trackRef} className="h-projects__track">
          {projects.map((p) => (
            <article
              key={p.slug}
              data-h-card
              data-tint={categoryTint[p.category]}
              className={`h-card ${p.photo ? "h-card--photo" : "h-card--type"}`}
            >
              <a
                href={`/projects/`}
                data-cursor="View project"
                className="h-card__link"
              >
                <div className="h-card__visual">
                  {p.photo ? (
                    <picture>
                      <img
                        src={`/images/projects/${p.photo}.webp`}
                        srcSet={`/images/projects/${p.photo}-800.webp 800w, /images/projects/${p.photo}.webp 1600w`}
                        sizes="70vw"
                        alt={`${p.name} — ${p.location}`}
                        loading="lazy"
                      />
                    </picture>
                  ) : (
                    <div className="h-card__type bg-blueprint">
                      <div className="h-card__type-inner">
                        <span className="label">{p.category}</span>
                        <h3>{p.name}</h3>
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-card__meta">
                  <span className="label h-card__idx">
                    <em>{p.index}</em>
                    <span className="h-card__cat">{p.category}</span>
                  </span>
                  <h3 className="h-card__name">{p.name}</h3>
                  <p className="h-card__loc label">{p.location}</p>
                  <p className="h-card__desc">{p.descriptor}</p>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .h-projects {
          position: relative;
          overflow: hidden;
        }
        .h-projects__inner {
          height: 100vh;
          display: grid;
          grid-template-rows: auto 1fr;
          padding-top: clamp(3rem, 7vw, 6rem);
        }
        .h-projects__head {
          padding: 0 clamp(1.25rem, 4vw, 3.5rem);
          max-width: 96rem;
          width: 100%;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.85rem;
          align-items: end;
        }
        .h-projects__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          color: var(--color-flare);
        }
        .h-projects__bar {
          width: 1.5rem;
          height: 1px;
          background: var(--color-flare);
        }
        .h-projects__head h2 em {
          color: var(--color-flare);
          font-style: normal;
        }
        .h-projects__hint {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-ash);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .h-projects__arrow {
          display: inline-block;
          animation: harrow 2.2s ease-in-out infinite;
        }
        @keyframes harrow {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(6px); opacity: 0.55; }
        }
        @media (min-width: 980px) {
          .h-projects__head {
            grid-template-columns: 1.4fr 1fr auto;
            gap: 1.5rem;
          }
        }

        .h-projects__track {
          display: flex;
          align-items: center;
          gap: clamp(1.25rem, 3vw, 2.5rem);
          padding: 0 clamp(1.25rem, 6vw, 5rem);
          will-change: transform;
        }
        .h-card {
          flex: 0 0 auto;
          width: 90vw;
          max-width: 1100px;
          transform-origin: center center;
        }
        @media (min-width: 700px) { .h-card { width: 70vw; } }
        @media (min-width: 1280px) { .h-card { width: 56vw; } }
        @media (min-width: 1800px) { .h-card { width: 46vw; } }

        .h-card__link {
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 1.25rem;
          height: 76vh;
          max-height: 760px;
          color: inherit;
        }
        .h-card__visual {
          position: relative;
          overflow: hidden;
          background: var(--color-graphite);
          aspect-ratio: 3 / 2;
          height: 100%;
        }
        .h-card__visual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 1.4s var(--ease-out-expo);
        }
        .h-card__link:hover .h-card__visual img { transform: scale(1.04); }
        .h-card__type {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          padding: 2rem;
        }
        .h-card__type-inner { text-align: center; }
        .h-card__type-inner h3 {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(2rem, 4vw, 3.5rem);
          letter-spacing: -0.02em;
          margin-top: 0.6rem;
          color: var(--color-bone);
        }
        .h-card__type-inner .label { color: var(--color-flare); }

        .h-card__meta {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 1.5rem;
          row-gap: 0.4rem;
        }
        .h-card__idx {
          color: var(--color-emerald);
          display: inline-flex;
          align-items: baseline;
          gap: 0.6rem;
          grid-row: 1;
        }
        .h-card__idx em {
          font-style: normal;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.15rem;
          letter-spacing: 0;
        }
        .h-card__cat { color: var(--color-concrete); }
        .h-card__name {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(1.35rem, 2.4vw, 2rem);
          letter-spacing: -0.02em;
          color: var(--color-bone);
          grid-column: 2;
          grid-row: 1;
          align-self: baseline;
        }
        .h-card__loc {
          color: var(--color-ash);
          grid-column: 2;
          grid-row: 2;
        }
        .h-card__desc {
          color: var(--color-ash);
          font-size: 0.95rem;
          line-height: 1.55;
          margin-top: 0.4rem;
          max-width: 36rem;
          grid-column: 2;
          grid-row: 3;
        }

        /* Reduced-motion / no-JS fallback — flat horizontal-scroll rail */
        @media (prefers-reduced-motion: reduce) {
          .h-projects__inner { height: auto; padding-bottom: 3rem; }
          .h-projects__track {
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 1rem;
          }
          .h-card { scroll-snap-align: center; }
          .h-card__link { height: 60vh; }
        }
      `}</style>
    </section>
  );
}
