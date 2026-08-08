import { ArrowRight, Lightbulb, TrendingDown } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { costSizing, sizingFromReport } from "@/lib/impact";
import { sar } from "@/lib/portal-format";
import type { FullCycleReport } from "@/lib/portal.functions";

function Row({
  label,
  current,
  recommended,
  reductionPercent,
  index,
}: {
  label: string;
  current: string;
  recommended: string;
  reductionPercent: number | null;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 * index }}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border bg-background p-3"
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current</p>
        <p className="truncate font-mono text-sm text-muted-foreground line-through">{current}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 text-right">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">AI recommended</p>
        <p className="truncate font-mono text-sm font-semibold text-primary">{recommended}</p>
      </div>
      <p className="col-span-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        {reductionPercent !== null ? (
          <span className="text-success">−{reductionPercent}%</span>
        ) : null}
      </p>
    </motion.div>
  );
}

/** Before → AI recommendation → after, rendered purely from the live report. */
export function OptimizationResultCard({ report }: { report: FullCycleReport }) {
  const sizing = sizingFromReport(report);
  const cost = costSizing(report);
  const monthly = report.executableMonthlySavingsSar || report.rawOpportunityMonthlySavingsSar;
  const yearly = report.executableYearlySavingsSar || report.rawOpportunityYearlySavingsSar;
  const executable = report.executableMonthlySavingsSar > 0;

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold">
          <span className="font-mono">{report.service}</span> optimization
        </p>
        {cost?.reductionPercent !== null && cost !== null ? (
          <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
            {cost.reductionPercent}% potential cost saving
          </Badge>
        ) : null}
      </div>

      {sizing.length > 0 ? (
        <div className="space-y-2">
          {sizing.map((pair, index) => (
            <Row
              key={pair.label}
              label={pair.label}
              current={pair.current}
              recommended={pair.recommended}
              reductionPercent={pair.reductionPercent}
              index={index}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Per-deployment CPU and RAM sizing is coming from live analysis — open the run report for
          the full resource breakdown.
        </p>
      )}

      {cost ? (
        <Row
          label="Monthly request cost"
          current={sar(cost.current)}
          recommended={sar(cost.target)}
          reductionPercent={cost.reductionPercent}
          index={sizing.length}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Per month</p>
          <p className="mt-1 font-display text-base font-semibold tabular-nums text-primary">
            {monthly > 0 ? sar(monthly) : "Coming from live analysis"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Per year</p>
          <p className="mt-1 font-display text-base font-semibold tabular-nums text-primary">
            {yearly > 0 ? sar(yearly) : "Coming from live analysis"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Lightbulb className="size-3 text-warning" aria-hidden="true" />
          AI recommendation
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground">
          {report.nextAction?.trim()
            ? report.nextAction
            : executable
              ? "Based on observed CPU and memory utilization the agent recommends reducing the requested resources while keeping a safety margin. The change is advisory and awaits engineering approval."
              : "The agent identified an opportunity but safety controls hold the change back. Review the blocked deployments before acting."}
        </p>
      </div>

      {!executable && report.rawOpportunityMonthlySavingsSar > 0 ? (
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <TrendingDown className="size-3.5 shrink-0" aria-hidden="true" />
          No currently executable savings — raw opportunity only.
        </p>
      ) : null}
    </div>
  );
}
