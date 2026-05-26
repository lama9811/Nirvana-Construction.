import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
}

/* Full-bleed flare-orange CTA section with a slow "BUILT TO THE LINE"
   marquee underlay (two rows, opposite directions) and a magnetic CTA
   button that subtly follows the cursor within a 150px radius. */
export default function CTAMarquee({
  phone,
  phoneHref,
  email,
  emailHref,
}: Props) {
  const outerRef = useRef<HTMLElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Marquee — auto-scroll, scroll direction also nudges speed
  useLayoutEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const r1 = row1Ref.current;
    const r2 = row2Ref.current;
    if (!r1 || !r2) return;

    const ctx = gsap.context(() => {
      const dur = 24;
      gsap.set([r1, r2], { willChange: "transform" });
      const t1 = gsap.to(r1, {
        xPercent: -50,
        duration: dur,
        ease: "none",
        repeat: -1,
      });
      const t2 = gsap.to(r2, {
        xPercent: 50,
        duration: dur,
        ease: "none",
        repeat: -1,
        modifiers: {
          xPercent: gsap.utils.unitize((x: number) => parseFloat(x) % 50 - 50),
        },
      });

      // scroll-direction-based speed nudge
      let velTimer: ReturnType<typeof setTimeout> | null = null;
      const onScroll = () => {
        const v = ScrollTrigger.getById("__cta_velocity__");
        // simpler approach — use ScrollTrigger.getVelocity
        const velocity = (ScrollTrigger as any).getVelocity?.() || 0;
        const sign = velocity > 0 ? 1 : velocity < 0 ? -1 : 0;
        const target = 1 + Math.min(2, Math.abs(velocity) / 1500);
        const factor1 = sign >= 0 ? target : 1 / target;
        const factor2 = sign >= 0 ? 1 / target : target;
        t1.timeScale(factor1);
        t2.timeScale(factor2);
        if (velTimer) clearTimeout(velTimer);
        velTimer = setTimeout(() => {
          t1.timeScale(1);
          t2.timeScale(1);
        }, 220);
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        window.removeEventListener("scroll", onScroll);
        if (velTimer) clearTimeout(velTimer);
      };
    }, outerRef);

    return () => ctx.revert();
  }, [reduced]);

  // Magnetic button — tugs toward cursor when within 150px
  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const btn = btnRef.current;
    if (!btn) return;
    const padding = 150;
    const strength = 4;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const onMove = (e: MouseEvent) => {
      const r = btn.getBoundingClientRect();
      const ccx = r.left + r.width / 2;
      const ccy = r.top + r.height / 2;
      const dx = e.clientX - ccx;
      const dy = e.clientY - ccy;
      if (
        Math.abs(dx) < r.width / 2 + padding &&
        Math.abs(dy) < r.height / 2 + padding
      ) {
        tx = dx / strength;
        ty = dy / strength;
      } else {
        tx = 0;
        ty = 0;
      }
    };
    const tick = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      btn.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [reduced]);

  const word = "BUILT TO THE LINE";
  const segment = Array.from({ length: 8 }, () => word).join(" · ");

  return (
    <section
      ref={outerRef}
      data-section="Let's frame it"
      className="cta-mq"
    >
      {/* Marquee underlay */}
      <div className="cta-mq__bg" aria-hidden="true">
        <div className="cta-mq__row cta-mq__row--top" ref={row1Ref}>
          <span>{segment}&nbsp;·&nbsp;{segment}</span>
        </div>
        <div className="cta-mq__row cta-mq__row--bot" ref={row2Ref}>
          <span>{segment}&nbsp;·&nbsp;{segment}</span>
        </div>
      </div>

      {/* Foreground content */}
      <div className="cta-mq__inner">
        <p className="label cta-mq__eyebrow">
          <span className="cta-mq__dot"></span>Next step
        </p>
        <h2 className="cta-mq__title">
          Have a project on the boards? <em>Let&apos;s frame it.</em>
        </h2>
        <div className="cta-mq__actions">
          <a
            ref={btnRef}
            href="/contact/"
            className="cta-mq__primary"
            data-cursor="Get a quote"
          >
            Request a quote
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 19L19 5M19 5H8M19 5v11" stroke="currentColor" strokeWidth="2" />
            </svg>
          </a>
          <div className="cta-mq__contacts">
            <a href={phoneHref} className="cta-mq__contact" data-cursor="Call">
              <span className="label">Call</span>
              <span>{phone}</span>
            </a>
            <a href={emailHref} className="cta-mq__contact" data-cursor="Email">
              <span className="label">Email</span>
              <span>{email}</span>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .cta-mq {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: var(--color-flare);
          color: var(--color-bone);
          padding: clamp(5rem, 12vw, 11rem) clamp(1.25rem, 4vw, 3.5rem);
        }
        .cta-mq__bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
          padding-block: 1rem;
          pointer-events: none;
          color: color-mix(in oklab, var(--color-bone) 22%, transparent);
        }
        .cta-mq__row {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(4rem, 14vw, 14rem);
          line-height: 1;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          display: inline-flex;
          width: max-content;
        }
        .cta-mq__row--bot { align-self: flex-end; }

        .cta-mq__inner {
          position: relative;
          z-index: 1;
          max-width: 96rem;
          margin: 0 auto;
          display: grid;
          gap: clamp(1.5rem, 4vw, 3rem);
        }
        .cta-mq__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          color: var(--color-bone);
        }
        .cta-mq__dot {
          width: 0.45rem;
          height: 0.45rem;
          background: var(--color-bone);
          border-radius: 999px;
        }
        .cta-mq__title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(2.5rem, 8vw, 8rem);
          line-height: 0.92;
          letter-spacing: -0.035em;
          color: var(--color-bone);
          max-width: 18ch;
          text-wrap: balance;
        }
        .cta-mq__title em {
          font-style: normal;
          color: color-mix(in oklab, var(--color-bone) 75%, var(--color-flare));
          -webkit-text-stroke: 1.5px var(--color-bone);
          color: transparent;
        }
        .cta-mq__actions {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          align-items: flex-start;
        }
        .cta-mq__primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1.1rem 1.8rem;
          background: var(--color-bone);
          color: var(--color-ink);
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 0.01em;
          overflow: hidden;
          isolation: isolate;
          will-change: transform;
        }
        .cta-mq__primary svg {
          width: 1.1rem;
          height: 1.1rem;
          transition: transform 0.45s var(--ease-out-expo);
        }
        .cta-mq__primary:hover svg { transform: translate(4px, -4px); }
        .cta-mq__primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--color-ink);
          transform: translateY(101%);
          transition: transform 0.5s var(--ease-out-expo);
          z-index: -1;
        }
        .cta-mq__primary:hover {
          color: var(--color-bone);
        }
        .cta-mq__primary:hover::before { transform: translateY(0); }

        .cta-mq__contacts {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .cta-mq__contact {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: var(--color-bone);
          font-family: var(--font-mono);
          font-size: 0.95rem;
          transition: opacity 0.25s;
        }
        .cta-mq__contact:hover { opacity: 0.7; }
        .cta-mq__contact .label { color: color-mix(in oklab, var(--color-bone) 65%, transparent); }

        @media (min-width: 880px) {
          .cta-mq__actions {
            flex-direction: row;
            align-items: end;
            justify-content: space-between;
            gap: 3rem;
          }
        }
      `}</style>
    </section>
  );
}
