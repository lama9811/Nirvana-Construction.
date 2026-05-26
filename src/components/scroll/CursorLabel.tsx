import { useEffect, useRef, useState } from "react";

/* Custom cursor: a small dot that follows the mouse, swelling into a
   labelled pill when hovering elements with [data-cursor="LABEL"].
   Disabled on touch / coarse-pointer devices and under reduced-motion. */
export default function CursorLabel() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduced) return;
    setEnabled(true);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };
    const update = () => {
      tx += (x - tx) * 0.18;
      ty += (y - ty) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.(
        "[data-cursor]",
      ) as HTMLElement | null;
      if (t) setLabel(t.dataset.cursor || "");
    };
    const onOut = (e: MouseEvent) => {
      const next = (e.relatedTarget as HTMLElement | null)?.closest?.(
        "[data-cursor]",
      );
      if (!next) setLabel("");
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: label ? "0.55rem 0.95rem" : 0,
        width: label ? "auto" : "10px",
        height: label ? "auto" : "10px",
        minWidth: label ? "auto" : "10px",
        background: label ? "var(--color-flare)" : "var(--color-bone)",
        color: label ? "var(--color-ink)" : "transparent",
        borderRadius: 999,
        fontFamily: "var(--font-mono)",
        fontSize: "0.7rem",
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        mixBlendMode: label ? "normal" : "difference",
        transition:
          "padding 0.28s var(--ease-out-expo), background-color 0.28s var(--ease-out-expo), color 0.18s ease, width 0.28s var(--ease-out-expo)",
        willChange: "transform",
      }}
    >
      {label}
    </div>
  );
}
