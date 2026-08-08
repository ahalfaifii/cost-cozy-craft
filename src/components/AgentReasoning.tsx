import { Check, CircleDashed, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import type { FullCycleReport } from "@/lib/portal.functions";

/**
 * Visual representation of the agent pipeline.
 * Step completion is driven ONLY by stages the backend actually reports.
 */
const AGENT_STEPS: { title: string; detail: string; stages: string[] }[] = [
  {
    title: "Understanding request",
    detail: "Resolving the requested service and cluster scope",
    stages: ["SCOPE_RESOLVED"],
  },
  {
    title: "Gathering resource data",
    detail: "CPU and memory utilization from the OpenShift projects",
    stages: ["ASSESSMENT_STARTED"],
  },
  {
    title: "Analyzing",
    detail: "Current allocation versus required capacity",
    stages: ["ASSESSMENT_COMPLETED"],
  },
  {
    title: "Right-sizing",
    detail: "Optimal CPU and RAM requests with a safety margin",
    stages: ["REPORT_READY", "EVIDENCE_READY"],
  },
  {
    title: "Cost intelligence",
    detail: "Cost estimate and potential savings simulated",
    stages: ["SIMULATION_COMPLETED"],
  },
  {
    title: "Governance review",
    detail: "AI Council verdict on the simulated change",
    stages: ["SIMULATION_COUNCIL_COMPLETE"],
  },
  {
    title: "Recommendation ready",
    detail: "Optimization opportunity stored and reported",
    stages: ["FINAL_STATE_STORED"],
  },
];

type StepState = "done" | "active" | "pending";

function statesFor(report: FullCycleReport | null): StepState[] {
  const done = new Set((report?.completedStages ?? []).map((s) => s.trim().toUpperCase()));
  let activeUsed = false;
  return AGENT_STEPS.map((step) => {
    if (step.stages.some((stage) => done.has(stage))) return "done" as StepState;
    if (!activeUsed) {
      activeUsed = true;
      return "active" as StepState;
    }
    return "pending" as StepState;
  });
}

export function AgentReasoning({
  report = null,
  compact = false,
}: {
  report?: FullCycleReport | null;
  compact?: boolean;
}) {
  const states = statesFor(report);
  const doneCount = states.filter((state) => state === "done").length;
  const progress = Math.round((doneCount / AGENT_STEPS.length) * 100);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3.5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex size-6 items-center justify-center rounded-md border border-primary/40 bg-primary/10"
          >
            <Sparkles className="size-3 text-primary" aria-hidden="true" />
          </motion.span>
          <p className="font-display text-xs font-semibold uppercase tracking-wide">
            Agent activity
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          {progress}% complete
        </Badge>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${Math.max(progress, 4)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <ol className={compact ? "space-y-1" : "space-y-1.5"}>
        {AGENT_STEPS.map((step, index) => {
          const state = states[index];
          return (
            <li key={step.title} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border ${
                  state === "done"
                    ? "border-success/50 bg-success/15 text-success"
                    : state === "active"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {state === "done" ? (
                  <Check className="size-2.5" aria-hidden="true" />
                ) : state === "active" ? (
                  <motion.span
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                    className="size-1.5 rounded-full bg-primary"
                  />
                ) : (
                  <CircleDashed className="size-2.5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-xs ${state === "pending" ? "text-muted-foreground" : "text-foreground"}`}
                >
                  {step.title}
                </p>
                {!compact && state !== "pending" ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{step.detail}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {!report ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Awaiting the agent&apos;s first status update — steps light up only as the backend reports
          them.
        </p>
      ) : null}
    </div>
  );
}
