import { useEffect, useRef } from "react";

/* Thin emerald hairline fixed to the top of the viewport that fills
   left → right as you scroll the document. Pure DOM transform — no
   re-renders per scroll event. */
export default function ScrollProgressBar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ref.current) {
        ref.current.style.transform = `scaleX(${p})`;
      }
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      ref={ref}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "var(--color-emerald)",
        transformOrigin: "left center",
        transform: "scaleX(0)",
        zIndex: 90,
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}
