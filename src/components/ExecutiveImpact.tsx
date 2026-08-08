import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cpu, MemoryStick, ServerCog, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { aggregateImpact } from "@/lib/impact";
import { sar } from "@/lib/portal-format";
import { getLatestFullCycleReports } from "@/lib/portal.functions";

function KpiCard({
  icon: Icon,
  label,
  index,
  value,
  suffix,
  format,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  index: number;
  value: number | null;
  suffix?: string;
  format?: (value: number) => string;
  caption: string;
}) {
  const live = value !== null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="relative h-full overflow-hidden border-border bg-surface p-5 transition-shadow duration-300 hover:shadow-panel">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="rounded-lg border border-border bg-background p-2">
            <Icon className="size-4 text-primary" aria-hidden="true" />
          </div>
          <Badge
            variant="outline"
            className={
              live
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {live ? "Live" : "Awaiting run"}
          </Badge>
        </div>
        <p className="relative mt-4 text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {live ? (
          <p className="relative mt-1.5 font-display text-3xl font-semibold tabular-nums text-foreground">
            <AnimatedCounter value={value} format={format} />
            {suffix ? <span className="text-primary">{suffix}</span> : null}
          </p>
        ) : (
          <p className="relative mt-2 text-sm text-muted-foreground">Coming from live analysis</p>
        )}
        <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{caption}</p>
      </Card>
    </motion.div>
  );
}

export function ExecutiveImpact() {
  const fetchCycles = useServerFn(getLatestFullCycleReports);
  const cycles = useQuery({
    queryKey: ["portal-full-cycles"],
    queryFn: () => fetchCycles(),
    refetchInterval: 30_000,
  });

  const reports = cycles.data?.data ?? [];
  const impact = aggregateImpact(reports);

  if (cycles.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-primary">Executive impact</p>
        <h2 className="mt-3 font-display text-3xl font-semibold">Analyze → Right-size → Save</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          AI-powered optimization across your OpenShift environment. Every figure below is read from
          the agent&apos;s own completed runs — nothing is estimated by the portal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          index={0}
          icon={Wallet}
          label="Potential savings / year"
          value={impact.executableYearlySar > 0 ? impact.executableYearlySar : null}
          format={(value) => sar(value)}
          caption="Executable yearly savings across the latest optimization runs."
        />
        <KpiCard
          index={1}
          icon={Cpu}
          label="CPU optimized"
          value={impact.cpuOptimizedPercent}
          suffix="%"
          caption="Average CPU request reduction recommended by the agent."
        />
        <KpiCard
          index={2}
          icon={MemoryStick}
          label="RAM optimized"
          value={impact.ramOptimizedPercent}
          suffix="%"
          caption="Average memory request reduction recommended by the agent."
        />
        <KpiCard
          index={3}
          icon={ServerCog}
          label="Services analyzed"
          value={impact.servicesAnalyzed > 0 ? impact.servicesAnalyzed : null}
          caption="Distinct OpenShift services with a completed Full Cycle assessment."
        />
      </div>

      {impact.rawYearlySar > 0 ? (
        <p className="text-xs text-muted-foreground">
          Raw opportunity identified: {sar(impact.rawYearlySar)} per year ·{" "}
          {impact.approvedDeployments} approved and {impact.blockedDeployments} safety-blocked
          deployments reviewed.
        </p>
      ) : null}
    </div>
  );
}
