"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export type WorkflowStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const ADVANCE_MS = 4200;

export function WorkflowRail({ steps }: { steps: WorkflowStep[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.25 });
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);

  const scrollToIndex = useCallback((index: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const width = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollTo({ left: index * width, behavior: "smooth" });
  }, []);

  const go = useCallback(
    (index: number) => {
      const next = (index + steps.length) % steps.length;
      setActive(next);
      scrollToIndex(next);
    },
    [scrollToIndex, steps.length],
  );

  const running = playing && inView && !hovering && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % steps.length;
        scrollToIndex(next);
        return next;
      });
    }, ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [running, scrollToIndex, steps.length]);

  function onScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const w = card ? card.offsetWidth + 20 : 1;
    setActive(Math.round(el.scrollLeft / w));
  }

  return (
    <div
      ref={sectionRef}
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <motion.span
            animate={running ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
            transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
            className="flex size-6 items-center justify-center rounded-md border border-primary/40 bg-primary/10"
          >
            <Zap className="size-3 text-primary" aria-hidden="true" />
          </motion.span>
          <span>
            Step{" "}
            <span className="font-mono text-foreground">
              {String(active + 1).padStart(2, "0")}
            </span>{" "}
            of {String(steps.length).padStart(2, "0")} — the flow advances itself
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause the flow" : "Play the flow"}
          >
            {playing ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => go(active - 1)}
            aria-label="Previous step"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => go(active + 1)}
            aria-label="Next step"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="relative">
        {/* animated flow line with a travelling packet */}
        <div className="pointer-events-none absolute inset-x-0 top-[78px] h-px overflow-hidden">
          <div className="h-px w-full bg-border" />
          <motion.div
            className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={running ? { x: ["-30%", "420%"] } : { x: "-30%" }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        </div>

        <div
          ref={viewportRef}
          onScroll={onScroll}
          className="hide-scrollbar cursor-grab overflow-x-auto overscroll-x-contain active:cursor-grabbing"
        >
          <motion.ol
            drag="x"
            dragConstraints={viewportRef}
            dragElastic={0.04}
            dragMomentum={false}
            className="flex list-none gap-5 pb-6"
          >
            {steps.map((step, index) => {
              const isActive = index === active;
              const isDone = index < active;
              return (
                <motion.li
                  key={step.title}
                  data-card
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                  className="w-[280px] shrink-0 sm:w-[320px]"
                >
                  <motion.div
                    animate={
                      reduceMotion
                        ? {}
                        : { scale: isActive ? 1 : 0.97, opacity: isActive ? 1 : 0.72 }
                    }
                    whileHover={{ y: -6, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                    className={`group relative h-full overflow-hidden rounded-xl border bg-surface p-5 shadow-panel transition-colors ${
                      isActive ? "border-primary" : "border-border hover:border-primary/60"
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="workflow-active-glow"
                        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-transparent"
                        transition={{ type: "spring", stiffness: 220, damping: 26 }}
                      />
                    ) : null}

                    <div className="relative flex items-center justify-between">
                      <motion.div
                        className={`rounded-md border p-2 ${
                          isActive
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                        animate={
                          isActive && running
                            ? { rotate: [0, -6, 0], scale: [1, 1.08, 1] }
                            : { rotate: 0, scale: 1 }
                        }
                        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
                      >
                        <step.icon className="size-4" aria-hidden="true" />
                      </motion.div>
                      <span
                        className={`font-mono text-xs ${
                          isDone ? "text-success" : "text-muted-foreground"
                        }`}
                      >
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="relative mt-4 text-base font-semibold">{step.title}</h3>
                    <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>

                    <AnimatePresence>
                      {isActive ? (
                        <motion.span
                          key="bar"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: running ? 1 : 0.06 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: running ? ADVANCE_MS / 1000 : 0.3,
                            ease: "linear",
                          }}
                          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-primary"
                        />
                      ) : (
                        <span className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <button
            key={step.title}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to step ${i + 1}`}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? "w-8 bg-primary" : "w-3 bg-border hover:bg-primary/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
