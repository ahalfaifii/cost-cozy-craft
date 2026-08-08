import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { AlertTriangle, Check, FileSpreadsheet, Radio, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AgentReasoning } from "@/components/AgentReasoning";
import { OptimizationResultCard } from "@/components/OptimizationResultCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FULL_CYCLE_COMPLETED_EVENT,
  FULL_CYCLE_STARTED_EVENT,
  isReportTerminal,
  isValidControllerId,
  liveStatusLabel,
  humanLabel,
  sar,
  serviceFromControllerId,
  startingReport,
  statusClass,
  verdictClass,
  type ControllerSource,
} from "@/lib/portal-format";
import {
  getFullCycleByController,
  getLiveFullCycle,
  getPortalRequester,
  type FullCycleReport,
} from "@/lib/portal.functions";

function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`truncate text-xs text-foreground ${mono ? "font-mono" : ""}`} title={value}>
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
      transition={{ duration: 0.3 }}
      className={`rounded-lg border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-base font-semibold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </motion.div>
  );
}

function ReportHeader({ report }: { report: FullCycleReport }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Service</p>
          <p className="truncate font-mono text-sm text-foreground">{report.service}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusClass(report.status)}`}>
          {liveStatusLabel(report)}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Run ID" value={report.runId} />
        <Field label="Controller ID" value={report.controllerId} />
        <Field label="AI Council verdict" value={report.aiCouncilVerdict} />
        <Field label="Scope coverage" value={report.scopeCoverage} />
      </div>
    </div>
  );
}

function ResultView({ report }: { report: FullCycleReport }) {
  const executable =
    report.executableMonthlySavingsSar > 0 || report.executableYearlySavingsSar > 0;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-2.5 text-xs"
      >
        <Check className="size-4 text-success" aria-hidden="true" />
        <span className="text-foreground">
          Full Cycle finished for <span className="font-mono">{report.service}</span>
        </span>
        <Badge variant="outline" className={`ml-auto ${statusClass(report.status)}`}>
          {humanLabel(report.status)}
        </Badge>
      </motion.div>

      <ReportHeader report={report} />

      <OptimizationResultCard report={report} />

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Kpi label="Raw monthly opportunity" value={sar(report.rawOpportunityMonthlySavingsSar)} />
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
        <div className="grid grid-cols-2 gap-2.5">
          <Kpi label="Approved deploys" value={String(report.approvedDeploymentCount)} />
          <Kpi label="Blocked deploys" value={String(report.blockedDeploymentCount)} />
        </div>
      </div>

      {!executable ? (
        <p className="rounded-lg border border-border bg-background p-2.5 text-xs text-muted-foreground">
          No currently executable savings — the raw opportunity of{" "}
          <span className="font-mono text-foreground">
            {sar(report.rawOpportunityMonthlySavingsSar)}
          </span>{" "}
          per month is identified but not executable under current safety policy.
        </p>
      ) : null}

      {report.blockedOpportunityMonthlySavingsSar > 0 ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
          Blocked by safety controls — {sar(report.blockedOpportunityMonthlySavingsSar)} per month
          held back.
        </p>
      ) : null}

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Completed stages
        </p>
        <p className="mt-1 text-xs text-foreground">
          {report.completedStages.map((stage) => humanLabel(stage)).join(" · ") || "—"}
        </p>
      </div>

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

  const [activeControllerId, setActiveControllerId] = useState<string | null>(null);
  const [controllerSource, setControllerSource] = useState<ControllerSource | "discovery" | null>(
    null,
  );
  const [startedReport, setStartedReport] = useState<FullCycleReport | null>(null);
  const [completedDetected, setCompletedDetected] = useState(false);
  const [ignoredMismatchedControllerCount, setIgnoredMismatched] = useState(0);

  const session = useQuery({
    queryKey: ["portal-requester"],
    queryFn: () => requester(),
    staleTime: 30_000,
  });

  const authed = Boolean(session.data?.requesterEmail);

  // A newly announced controller from the chat wins over anything already shown.
  useEffect(() => {
    function onStarted(event: Event) {
      const detail = (
        event as CustomEvent<{
          controllerId?: string;
          controllerSource?: ControllerSource;
          service?: string;
        }>
      ).detail;
      const next = detail?.controllerId?.trim();
      if (!next || !isValidControllerId(next)) return;
      setActiveControllerId((previous) => (previous === next ? previous : next));
      setControllerSource(detail?.controllerSource ?? "text-fallback");
      setCompletedDetected(false);
      setIgnoredMismatched(0);
      // Render the accepted run immediately — never "Unknown".
      setStartedReport(startingReport(next, detail?.service || serviceFromControllerId(next)));
      void queryClient.invalidateQueries({
        queryKey: ["portal-full-cycle-controller", next],
      });
    }
    window.addEventListener(FULL_CYCLE_STARTED_EVENT, onStarted);
    return () => window.removeEventListener(FULL_CYCLE_STARTED_EVENT, onStarted);
  }, [queryClient]);

  // Discovery runs ONLY while no controller has been latched.
  const discoveryEnabled = authed && !activeControllerId;
  const discovery = useQuery({
    queryKey: ["portal-live-full-cycle"],
    queryFn: () => live(),
    enabled: discoveryEnabled,
    refetchInterval: discoveryEnabled ? 5000 : false,
  });

  const discovered = discovery.data?.data ?? null;

  useEffect(() => {
    const found = discovered?.controllerId;
    if (!activeControllerId && found && isValidControllerId(found)) {
      setActiveControllerId(found);
      setControllerSource("discovery");
      setStartedReport(null);
      setCompletedDetected(false);
    }
  }, [activeControllerId, discovered?.controllerId]);

  // Exact controller poll: authoritative once a controller id is known.
  const exactPolling = Boolean(authed && activeControllerId && !completedDetected);
  const controllerRun = useQuery({
    queryKey: ["portal-full-cycle-controller", activeControllerId],
    queryFn: () => byController({ data: { controllerId: activeControllerId as string } }),
    enabled: authed && Boolean(activeControllerId),
    refetchInterval: exactPolling ? 5000 : false,
  });

  const backendReport = controllerRun.data?.data ?? null;

  // Only accept backend payloads that belong to the latched controller.
  const matchedReport = useMemo(() => {
    if (!backendReport) return null;
    if (
      activeControllerId &&
      backendReport.controllerId &&
      backendReport.controllerId !== activeControllerId
    ) {
      return null;
    }
    return backendReport;
  }, [activeControllerId, backendReport]);

  useEffect(() => {
    if (
      backendReport &&
      activeControllerId &&
      backendReport.controllerId &&
      backendReport.controllerId !== activeControllerId
    ) {
      setIgnoredMismatched((count) => count + 1);
    }
  }, [activeControllerId, backendReport]);

  const report: FullCycleReport | null = activeControllerId
    ? (matchedReport ?? startedReport)
    : discovered;

  const run = activeControllerId ? controllerRun : discovery;
  const announced = useRef(new Set<string>());

  useEffect(() => {
    if (!matchedReport || !isReportTerminal(matchedReport)) return;
    setCompletedDetected(true);
    const key = matchedReport.controllerId || matchedReport.runId;
    if (!key || announced.current.has(key)) return;
    announced.current.add(key);
    window.dispatchEvent(new CustomEvent(FULL_CYCLE_COMPLETED_EVENT, { detail: matchedReport }));
    void queryClient.invalidateQueries({ queryKey: ["portal-full-cycles"] });
    void queryClient.invalidateQueries({ queryKey: ["portal-resource-guards"] });
    void queryClient.invalidateQueries({ queryKey: ["portal-overview"] });
  }, [queryClient, matchedReport]);

  const diagnostics = useMemo(
    () =>
      import.meta.env.DEV
        ? {
            activeControllerId,
            controllerSource,
            exactControllerPolling: exactPolling,
            discoveryPolling: discoveryEnabled,
            lastStatus: report?.status ?? null,
            lastPhase: report?.currentPhase ?? null,
            lastControllerIdReturned: backendReport?.controllerId ?? null,
            ignoredMismatchedControllerCount,
          }
        : null,
    [
      activeControllerId,
      controllerSource,
      exactPolling,
      discoveryEnabled,
      report?.status,
      report?.currentPhase,
      backendReport?.controllerId,
      ignoredMismatchedControllerCount,
    ],
  );

  useEffect(() => {
    if (diagnostics) console.debug("[live-monitor]", diagnostics);
  }, [diagnostics]);

  const isRunning = Boolean(report && !isReportTerminal(report));

  return (
    <Card className="flex flex-col gap-4 border-border bg-surface p-4 shadow-panel">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 rounded-md border border-border bg-background p-1.5">
            <TrendingDown className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">Live optimization monitor</p>
            <p className="truncate text-xs text-muted-foreground">
              {authed ? session.data?.requesterEmail : "Read-only · advisory"}
            </p>
          </div>
        </div>
        {isRunning ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1.5 border-primary/40 bg-primary/10 text-primary"
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

      {!authed ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          Sign in to monitor your live optimization run.
        </p>
      ) : !report && run.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : !report && run.data && run.data.state !== "ok" ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {run.data.message}
        </p>
      ) : !report ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          No active Full Cycle run for your account. Start one from the supervisor chat and the
          progress will appear here.
        </p>
      ) : isReportTerminal(report) ? (
        <ResultView report={report} />
      ) : (
        <div className="space-y-4">
          <ReportHeader report={report} />
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-background p-3">
            <Field label="Current phase" value={humanLabel(report.currentPhase)} />
            <Field label="Assessed clusters" value={report.assessedClusters.join(", ") || "—"} />
            <Field
              label="Unavailable clusters"
              value={report.unavailableClusters.join(", ") || "None"}
            />
            <Field label="Completed stages" value={String(report.completedStages.length)} />
          </div>
          <AgentReasoning report={report} />
        </div>
      )}
    </Card>
  );
}
