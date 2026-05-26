import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Sticky bottom-right chip showing "03 / 06  SELECTED PROJECTS".
   Reads `data-section="Label"` from every section on the page and
   updates as the active one crosses viewport center. */
export default function SectionIndex() {
  const [state, setState] = useState<{
    idx: number;
    total: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section]"),
    );
    if (!sections.length) return;
    const total = sections.length;

    const triggers = sections.map((sec, i) => {
      const label = sec.dataset.section || "";
      return ScrollTrigger.create({
        trigger: sec,
        start: "top 55%",
        end: "bottom 45%",
        onEnter: () => setState({ idx: i + 1, total, label }),
        onEnterBack: () => setState({ idx: i + 1, total, label }),
      });
    });

    // initialise to first section
    setState({
      idx: 1,
      total,
      label: sections[0].dataset.section || "",
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  if (!state) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        right: "1.25rem",
        bottom: "1.25rem",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        gap: "0.7rem",
        padding: "0.55rem 0.8rem",
        background: "color-mix(in oklab, var(--color-ink) 85%, transparent)",
        border:
          "1px solid color-mix(in oklab, var(--color-bone) 15%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        fontFamily: "var(--font-mono)",
        fontSize: "0.7rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--color-bone)",
        pointerEvents: "none",
      }}
    >
      <span style={{ color: "var(--color-emerald)", fontWeight: 500 }}>
        {String(state.idx).padStart(2, "0")} / {String(state.total).padStart(2, "0")}
      </span>
      <span
        style={{
          width: 1,
          height: "0.9rem",
          background: "color-mix(in oklab, var(--color-bone) 20%, transparent)",
        }}
      />
      <span style={{ color: "var(--color-ash)" }}>{state.label}</span>
    </div>
  );
}
