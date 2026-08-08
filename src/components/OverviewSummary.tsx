import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Gavel, Server, ShieldCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { humanLabel, riskClass, sar, verdictClass } from "@/lib/portal-format";
import {
  getLatestFullCycleReports,
  getLatestResourceGuardReports,
} from "@/lib/portal.functions";

function SummaryCard({
  icon: Icon,
  label,
  value,
  badgeClass,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  badgeClass?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card className="h-full border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-border bg-background p-1.5">
            <Icon className="size-4 text-primary" aria-hidden="true" />
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        {badgeClass ? (
          <Badge variant="outline" className={`mt-4 ${badgeClass}`}>
            {value}
          </Badge>
        ) : (
          <p className="mt-4 font-display text-xl font-semibold tabular-nums">{value}</p>
        )}
      </Card>
    </motion.div>
  );
}

export function OverviewSummary() {
  const fetchCycles = useServerFn(getLatestFullCycleReports);
  const fetchGuards = useServerFn(getLatestResourceGuardReports);

  const cycles = useQuery({
    queryKey: ["portal-full-cycles"],
    queryFn: () => fetchCycles(),
    refetchInterval: 30_000,
  });
  const guards = useQuery({
    queryKey: ["portal-resource-guards"],
    queryFn: () => fetchGuards(),
    refetchInterval: 30_000,
  });

  const notConfigured =
    cycles.data?.state === "not-configured" || guards.data?.state === "not-configured";
  const latest = cycles.data?.data?.[0] ?? null;
  const latestGuard = guards.data?.data?.[0] ?? null;

  if (cycles.isPending || guards.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (notConfigured) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        {cycles.data?.message ?? guards.data?.message}
      </p>
    );
  }

  const yearlyAcrossFive = (cycles.data?.data ?? []).reduce(
    (total, report) => total + report.executableYearlySavingsSar,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          index={0}
          icon={Server}
          label="Latest Full Cycle service"
          value={latest?.service ?? "No runs yet"}
        />
        <SummaryCard
          index={1}
          icon={Gavel}
          label="Latest AI Council verdict"
          value={latest ? humanLabel(latest.aiCouncilVerdict) : "—"}
          badgeClass={latest ? verdictClass(latest.aiCouncilVerdict) : "border-border bg-muted"}
        />
        <SummaryCard
          index={2}
          icon={Wallet}
          label="Latest executable yearly savings"
          value={latest ? sar(latest.executableYearlySavingsSar) : "—"}
        />
        <SummaryCard
          index={3}
          icon={ShieldCheck}
          label="Latest Resource Guard risk"
          value={latestGuard ? humanLabel(latestGuard.riskLevel) : "No reviews yet"}
          badgeClass={latestGuard ? riskClass(latestGuard.riskLevel) : "border-border bg-muted"}
        />
      </div>
      {yearlyAcrossFive > 0 ? (
        <p className="text-xs text-muted-foreground">
          Across the latest 5 reports: {sar(yearlyAcrossFive)} executable yearly savings identified.
        </p>
      ) : null}
    </div>
  );
}
