"use client";

import { motion, useInView } from "motion/react";
import { ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export type WorkflowStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export function WorkflowRail({ steps }: { steps: WorkflowStep[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });
  const [active, setActive] = useState(0);

  function scrollByCard(dir: 1 | -1) {
    const el = viewportRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const amount = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  function onScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const w = card ? card.offsetWidth + 20 : 1;
    setActive(Math.round(el.scrollLeft / w));
  }

  return (
    <div ref={sectionRef} className="relative">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <GripHorizontal className="size-3.5 text-primary" aria-hidden="true" />
          Drag or scroll the rail to walk through the workflow
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous step"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => scrollByCard(1)}
            aria-label="Next step"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="relative">
        {/* animated connector line behind the cards */}
        <div className="pointer-events-none absolute inset-x-0 top-[74px] h-px overflow-hidden">
          <div className="h-px w-full bg-border" />
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ["-40%", "340%"] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
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
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                data-card
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.5, delay: index * 0.09, ease: "easeOut" }}
                whileHover={{ y: -6 }}
                className="w-[280px] shrink-0 sm:w-[320px]"
              >
                <div className="group relative h-full rounded-xl border border-border bg-surface p-5 shadow-panel transition-colors hover:border-primary">
                  <div className="flex items-center justify-between">
                    <motion.div
                      className="rounded-md border border-border bg-background p-2 text-primary"
                      whileHover={{ rotate: -8, scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    >
                      <step.icon className="size-4" aria-hidden="true" />
                    </motion.div>
                    <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  <span className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <span
            key={step.title}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === active ? "w-8 bg-primary" : "w-3 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
