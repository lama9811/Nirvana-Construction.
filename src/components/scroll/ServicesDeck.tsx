import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Service {
  index: string;
  slug: string;
  title: string;
  blurb: string;
  detail: string;
}

interface Props {
  services: Service[];
}

/* Each service gets paired with a real Nirvana jobsite/project photo,
   keyed by slug — chosen for visual fit with the sector. */
const slugToPhoto: Record<string, string> = {
  retail: "golf-galaxy",
  hospitality: "jobsite-04",
  medical: "mace-medical",
  education: "hcps-forest-hill",
  office: "flagship-carwash",
  renovation: "jcc",
};

export default function ServicesDeck({ services }: Props) {
  const outerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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
    const stage = stageRef.current;
    if (!outer || !stage) return;

    const slides = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-svc-slide]"),
    );
    const photos = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-svc-photo]"),
    );
    const count = slides.length;
    if (!count) return;

    const ctx = gsap.context(() => {
      /* Each slide gets a fade-in / fade-out window inside the pinned scroll.
         Total scroll length ≈ count × 100vh. Slide i is fully visible at
         scroll progress (i + 0.5) / count, transitioning out toward i+1. */
      gsap.set(slides, { opacity: 0, y: 60 });
      gsap.set(photos, { opacity: 0, scale: 1.08 });
      gsap.set(slides[0], { opacity: 1, y: 0 });
      gsap.set(photos[0], { opacity: 1, scale: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: outer,
          start: "top top",
          end: `+=${count * 100}%`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // each transition occupies a 1.0 unit of timeline; 1 transition per service-to-next
      slides.forEach((slide, i) => {
        if (i === 0) return; // first is the initial state
        const prev = slides[i - 1];
        const prevPhoto = photos[i - 1];
        const photo = photos[i];
        // outgoing
        tl.to(prev, { opacity: 0, y: -60, duration: 1, ease: "power2.in" }, i);
        if (prevPhoto)
          tl.to(prevPhoto, { opacity: 0, scale: 1.12, duration: 1, ease: "none" }, i);
        // incoming
        tl.to(slide, { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, i);
        if (photo)
          tl.to(photo, { opacity: 1, scale: 1, duration: 1, ease: "none" }, i);
      });

      // hold the last slide visible for one full unit before unpinning
      tl.to({}, { duration: 1 });
    }, outer);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={outerRef}
      data-section="Six commercial sectors"
      className="svc-deck"
    >
      <header className="svc-deck__head">
        <p className="label svc-deck__eyebrow">
          <span className="svc-deck__bar"></span>What we build
        </p>
        <h2 className="text-section">
          Six&nbsp;commercial sectors. <em>One&nbsp;trade discipline.</em>
        </h2>
      </header>

      <div ref={stageRef} className="svc-deck__stage">
        {/* background photo stack */}
        <div className="svc-deck__bg" aria-hidden="true">
          {services.map((s) => (
            <div key={`bg-${s.slug}`} data-svc-photo className="svc-deck__photo">
              <img
                src={`/images/projects/${slugToPhoto[s.slug] || "jobsite-08"}.webp`}
                alt=""
                loading="lazy"
              />
            </div>
          ))}
          <div className="svc-deck__veil" />
        </div>

        {/* slide stack */}
        <div className="svc-deck__slides">
          {services.map((s, i) => (
            <article
              key={s.slug}
              data-svc-slide
              className="svc-slide"
              aria-current={i === 0 ? "true" : "false"}
            >
              <p className="label svc-slide__idx">
                <span>{s.index}</span>
                <span className="svc-slide__bar" />
                <span>{String(services.length).padStart(2, "0")}</span>
              </p>
              <h3 className="svc-slide__title">{s.title}</h3>
              <p className="svc-slide__blurb">{s.blurb}</p>
            </article>
          ))}
        </div>

        {/* progress rail */}
        <div className="svc-deck__rail" aria-hidden="true">
          {services.map((s) => (
            <span key={`rail-${s.slug}`} className="svc-deck__tick" />
          ))}
        </div>
      </div>

      <style>{`
        .svc-deck {
          position: relative;
          background: var(--color-ink);
        }
        .svc-deck__head {
          padding: clamp(4.5rem, 9vw, 8rem) clamp(1.25rem, 4vw, 3.5rem) 2.5rem;
          max-width: 96rem;
          margin: 0 auto;
          display: grid;
          gap: 1.25rem;
        }
        .svc-deck__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          color: var(--color-emerald);
        }
        .svc-deck__bar {
          width: 1.5rem;
          height: 1px;
          background: var(--color-emerald);
        }
        .svc-deck__head h2 em {
          color: var(--color-flare);
          font-style: normal;
          display: block;
        }
        @media (min-width: 980px) {
          .svc-deck__head h2 em { display: inline; }
        }

        .svc-deck__stage {
          position: relative;
          height: 100vh;
          overflow: hidden;
        }
        .svc-deck__bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .svc-deck__photo {
          position: absolute;
          inset: 0;
          will-change: opacity, transform;
        }
        .svc-deck__photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(1.02) saturate(0.78) contrast(0.95);
        }
        .svc-deck__veil {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, color-mix(in oklab, var(--color-ink) 50%, transparent) 65%, var(--color-ink) 100%),
            linear-gradient(0deg, color-mix(in oklab, var(--color-ink) 70%, transparent), transparent 35%);
          pointer-events: none;
        }

        .svc-deck__slides {
          position: relative;
          z-index: 1;
          height: 100%;
          display: grid;
          place-items: center;
          padding: 0 clamp(1.5rem, 5vw, 4rem);
        }
        .svc-slide {
          grid-area: 1 / 1;
          max-width: 64rem;
          width: 100%;
          text-align: center;
          will-change: opacity, transform;
          color: var(--color-bone);
        }
        .svc-slide__idx {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--color-emerald);
          margin-bottom: 1.5rem;
        }
        .svc-slide__bar {
          width: 2rem;
          height: 1px;
          background: color-mix(in oklab, var(--color-emerald) 50%, transparent);
        }
        .svc-slide__title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(2.5rem, 9vw, 9rem);
          line-height: 0.92;
          letter-spacing: -0.035em;
          color: var(--color-bone);
          text-wrap: balance;
        }
        .svc-slide__blurb {
          margin-top: 1.5rem;
          color: var(--color-ash);
          font-size: clamp(1rem, 1.4vw, 1.2rem);
          line-height: 1.55;
          max-width: 40rem;
          margin-inline: auto;
        }

        .svc-deck__rail {
          position: absolute;
          left: 50%;
          bottom: clamp(1.5rem, 3vw, 2.5rem);
          transform: translateX(-50%);
          z-index: 2;
          display: flex;
          gap: 0.55rem;
          padding: 0.55rem 0.85rem;
          background: color-mix(in oklab, var(--color-ink) 70%, transparent);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid color-mix(in oklab, var(--color-bone) 12%, transparent);
        }
        .svc-deck__tick {
          width: 1.5rem;
          height: 2px;
          background: color-mix(in oklab, var(--color-bone) 18%, transparent);
        }

        @media (prefers-reduced-motion: reduce) {
          .svc-deck__stage { height: auto; }
          .svc-deck__slides {
            grid-template-columns: 1fr;
            grid-auto-rows: min-content;
            gap: 3rem;
            padding: 3rem clamp(1.25rem, 4vw, 3.5rem);
          }
          .svc-slide {
            grid-area: auto;
            opacity: 1 !important;
            transform: none !important;
          }
          .svc-deck__bg, .svc-deck__rail { display: none; }
        }
      `}</style>
    </section>
  );
}
