import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Counts up to `value` once the element scrolls into view. */
export function AnimatedCounter({
  value,
  format,
  duration = 1.1,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [duration, inView, value]);

  return (
    <span ref={ref} className={className}>
      {format ? format(display) : Math.round(display).toLocaleString("en-US")}
    </span>
  );
}
