import { useEffect, useState } from "react";

const SESSION_KEY = "nirvana-preload-fired";
const DURATION_MS = 1200;

/* Full-screen cream overlay with a 000 → 100 numeric counter and the
   wordmark. Wipes away once the count finishes. Fires once per browser
   session via sessionStorage so internal navigation feels fast. */
export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "exiting" | "done">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) {
      setPhase("done");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setPhase("done");
      return;
    }

    document.documentElement.style.overflow = "hidden";

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      setProgress(Math.round(p * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem(SESSION_KEY, "1");
        setPhase("exiting");
        setTimeout(() => {
          setPhase("done");
          document.documentElement.style.overflow = "";
        }, 800);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "var(--color-ink)",
        transform: phase === "exiting" ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.8s cubic-bezier(0.83, 0, 0.17, 1)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "clamp(1.25rem, 4vw, 3rem)",
        pointerEvents: phase === "exiting" ? "none" : "auto",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--color-ash)",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--color-emerald)",
          }}
        />
        Nirvana Construction
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(5rem, 18vw, 18rem)",
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
            color: "var(--color-bone)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {String(progress).padStart(3, "0")}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--color-ash)",
            paddingBottom: "1.5rem",
            textAlign: "right",
            lineHeight: 1.6,
          }}
        >
          Built to the line
          <br />
          DBE / MBE / SBE
        </div>
      </div>
    </div>
  );
}
