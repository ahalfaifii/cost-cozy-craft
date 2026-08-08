import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  FileSpreadsheet,
  Radio,
  ShieldAlert,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FULL_CYCLE_COMPLETED_EVENT,
  FULL_CYCLE_STARTED_EVENT,
  STAGES,
  isReportTerminal,
  humanLabel,
  sar,
  stageStates,
  statusClass,
  verdictClass,
} from "@/lib/portal-format";
import {
  getFullCycleByController,
  getLiveFullCycle,
  getPortalRequester,
  type FullCycleReport,
} from "@/lib/portal.functions";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-xs text-foreground" title={value}>
        {value || "—"}
      </p>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}
    >
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </motion.div>
  );
}

function StageTracker({ report }: { report: FullCycleReport }) {
  const states = stageStates(report);
  return (
    <ol className="relative space-y-1">
      <span className="absolute left-[13px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
      {STAGES.map((stage, index) => {
        const state = states[index];
        return (
          <li key={stage.key} className="relative flex items-center gap-3 py-1.5">
            <span
              className={`relative z-10 flex size-[27px] shrink-0 items-center justify-center rounded-full border ${
                state === "completed"
                  ? "border-success/50 bg-success/15 text-success"
                  : state === "active"
                    ? "border-primary bg-primary/15 text-primary"
                    : state === "failed"
                      ? "border-destructive/50 bg-destructive/15 text-destructive"
                      : "border-border bg-background text-muted-foreground"
              }`}
            >
              {state === "completed" ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : state === "active" ? (
                <motion.span
                  animate={{ scale: [1, 1.35, 1], opacity: [1, 0.55, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="size-2 rounded-full bg-primary"
                />
              ) : state === "failed" ? (
                <X className="size-3.5" aria-hidden="true" />
              ) : (
                <CircleDashed className="size-3.5" aria-hidden="true" />
              )}
            </span>
            <span
              className={`text-sm ${
                state === "pending" ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {stage.label}
            </span>
            {state === "active" ? (
              <span className="ml-auto text-[11px] uppercase tracking-wide text-primary">
                in progress
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ResultView({ report }: { report: FullCycleReport }) {
  const hasSavings =
    report.executableMonthlySavingsSar > 0 ||
    report.executableYearlySavingsSar > 0 ||
    report.rawOpportunityMonthlySavingsSar > 0;

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3"
      >
        <Check className="size-4 text-success" aria-hidden="true" />
        <span className="text-sm text-foreground">
          Full Cycle finished for <span className="font-mono">{report.service}</span>
        </span>
        <Badge variant="outline" className={`ml-auto ${statusClass(report.status)}`}>
          {humanLabel(report.status)}
        </Badge>
      </motion.div>

      {hasSavings ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Kpi
            label="Raw monthly opportunity"
            value={sar(report.rawOpportunityMonthlySavingsSar)}
          />
          <Kpi label="Raw yearly opportunity" value={sar(report.rawOpportunityYearlySavingsSar)} />
          <Kpi
            label="Executable monthly savings"
            value={sar(report.executableMonthlySavingsSar)}
            accent
          />
          <Kpi
            label="Executable yearly savings"
            value={sar(report.executableYearlySavingsSar)}
            accent
          />
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
          No executable savings were identified for this run — the workloads are already sized
          within policy.
        </p>
      )}

      <div className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
        <Field
          label="Current monthly request cost"
          value={sar(report.currentMonthlyRequestCostSar)}
        />
        <Field
          label="Target monthly request cost"
          value={sar(report.targetMonthlyRequestCostSar)}
        />
        <Field label="Service" value={report.service} />
        <Field label="Run ID" value={report.runId} />
        <Field label="Controller ID" value={report.controllerId} />
        <Field label="Current phase" value={humanLabel(report.currentPhase)} />
        <Field label="Completed stages" value={report.completedStages.join(", ") || "—"} />
        <Field label="Approved deployments" value={String(report.approvedDeploymentCount)} />
        <Field label="Blocked deployments" value={String(report.blockedDeploymentCount)} />
        <Field label="AI Council verdict" value={report.aiCouncilVerdict} />
        <Field label="Scope coverage" value={report.scopeCoverage} />
      </div>

      {report.blockedOpportunityMonthlySavingsSar > 0 ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          Opportunity blocked by safety controls — {sar(
            report.blockedOpportunityMonthlySavingsSar,
          )}{" "}
          per month held back.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={verdictClass(report.aiCouncilVerdict)}>
          {humanLabel(report.aiCouncilVerdict)}
        </Badge>
        {report.reportArtifact ? (
          <Button asChild variant="outline" size="sm">
            <a href={report.reportArtifact.url} target="_blank" rel="noreferrer">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Open Excel Report
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function LiveOptimizationPanel() {
  const live = useServerFn(getLiveFullCycle);
  const byController = useServerFn(getFullCycleByController);
  const requester = useServerFn(getPortalRequester);
  const queryClient = useQueryClient();

  const [controllerId, setControllerId] = useState<string | null>(null);
  const [completedDetected, setCompletedDetected] = useState(false);

  const session = useQuery({
    queryKey: ["portal-requester"],
    queryFn: () => requester(),
    staleTime: 30_000,
  });

  const authed = Boolean(session.data?.requesterEmail);

  // Latch the controller id announced by the chat as soon as a Full Cycle starts.
  useEffect(() => {
    function onStarted(event: Event) {
      const detail = (event as CustomEvent<{ controllerId?: string }>).detail;
      const next = detail?.controllerId?.trim();
      if (!next) return;
      setControllerId((previous) => {
        if (previous === next) return previous;
        setCompletedDetected(false);
        return next;
      });
    }
    window.addEventListener(FULL_CYCLE_STARTED_EVENT, onStarted);
    return () => window.removeEventListener(FULL_CYCLE_STARTED_EVENT, onStarted);
  }, []);

  // Discovery: keeps looking for the latest controller of the authenticated requester.
  const discovery = useQuery({
    queryKey: ["portal-live-full-cycle"],
    queryFn: () => live(),
    enabled: authed,
    refetchInterval: authed ? 5000 : false,
  });

  const discovered = discovery.data?.data ?? null;

  useEffect(() => {
    const found = discovered?.controllerId;
    if (!controllerId && found && found !== "—") setControllerId(found);
  }, [controllerId, discovered?.controllerId]);

  // Controller poll: authoritative once a controller id is known.
  const controllerRun = useQuery({
    queryKey: ["portal-full-cycle-controller", controllerId],
    queryFn: () => byController({ data: { controllerId: controllerId as string } }),
    enabled: authed && Boolean(controllerId),
    refetchInterval: authed && controllerId && !completedDetected ? 5000 : false,
  });

  const run = controllerId ? controllerRun : discovery;
  const report = (controllerRun.data?.data ?? null) || (controllerId ? null : discovered);
  const pollRunning = Boolean(authed && controllerId && !completedDetected);

  const announced = useRef(new Set<string>());

  useEffect(() => {
    if (!report || !isReportTerminal(report)) return;
    setCompletedDetected(true);
    const key = report.controllerId || report.runId;
    if (!key || announced.current.has(key)) return;
    announced.current.add(key);
    window.dispatchEvent(new CustomEvent(FULL_CYCLE_COMPLETED_EVENT, { detail: report }));
    // Refresh the rest of the portal without a page reload.
    void queryClient.invalidateQueries({ queryKey: ["portal-full-cycles"] });
    void queryClient.invalidateQueries({ queryKey: ["portal-resource-guards"] });
    void queryClient.invalidateQueries({ queryKey: ["portal-live-full-cycle"] });
  }, [queryClient, report]);

  const diagnostics = import.meta.env.DEV
    ? {
        liveMonitorMounted: true,
        authenticatedSessionFound: authed,
        controllerIdCaptured: Boolean(controllerId),
        controllerPollRunning: pollRunning,
        lastControllerStatus: report?.status ?? null,
        lastControllerPhase: report?.currentPhase ?? null,
        completedDetected,
      }
    : null;

  return (
    <Card className="flex flex-col gap-5 border-border bg-surface p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-border bg-background p-2">
            <TrendingDown className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">Live optimization monitor</p>
            <p className="text-xs text-muted-foreground">
              {authed ? session.data?.requesterEmail : "Read-only · advisory"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report && report.status.toUpperCase() === "RUNNING" ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/40 bg-primary/10 text-primary"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="inline-flex"
              >
                <Radio className="size-3" aria-hidden="true" />
              </motion.span>
              Live
            </Badge>
          ) : null}
        </div>
      </div>

      {!authed ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Sign in to monitor your live optimization run.
        </p>
      ) : run.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : run.data && run.data.state !== "ok" ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {run.data.message}
        </p>
      ) : !report ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No active Full Cycle run for your account. Start one from the supervisor chat and the
          progress will appear here.
        </p>
      ) : isReportTerminal(report) ? (
        <ResultView report={report} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-4">
            <Field label="Service" value={report.service} />
            <Field label="Status" value={humanLabel(report.status)} />
            <Field label="Run ID" value={report.runId} />
            <Field label="Controller ID" value={report.controllerId} />
            <Field label="Current phase" value={humanLabel(report.currentPhase)} />
            <Field label="AI Council verdict" value={report.aiCouncilVerdict} />
            <Field label="Scope coverage" value={report.scopeCoverage} />
            <Field label="Assessed clusters" value={report.assessedClusters.join(", ") || "—"} />
            <Field
              label="Unavailable clusters"
              value={report.unavailableClusters.join(", ") || "None"}
            />
          </div>
          <StageTracker report={report} />
        </div>
      )}

      {/* Dev diagnostics are intentionally kept out of the production/hackathon UI. */}
    </Card>
  );
}
