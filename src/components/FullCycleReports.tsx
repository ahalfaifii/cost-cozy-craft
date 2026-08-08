import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, FileSpreadsheet, Inbox, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { humanLabel, sar, statusClass, verdictClass, whenLabel } from "@/lib/portal-format";
import { getLatestFullCycleReports, type FullCycleReport } from "@/lib/portal.functions";

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FullCycleReports() {
  const fetchReports = useServerFn(getLatestFullCycleReports);
  const [selected, setSelected] = useState<FullCycleReport | null>(null);

  const query = useQuery({
    queryKey: ["portal-full-cycles"],
    queryFn: () => fetchReports(),
    refetchInterval: 30_000,
  });

  const reports = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Latest 5 Full Cycle reports</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw
            className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      {query.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      ) : query.data && query.data.state !== "ok" ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {query.data.message}
        </p>
      ) : reports.length === 0 ? (
        <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Inbox className="size-5" aria-hidden="true" />
          No Full Cycle reports yet.
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card
              key={`${report.controllerId}-${report.runId}`}
              className="border-border bg-surface p-4 transition-shadow hover:shadow-panel"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">{report.service}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{report.runId}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusClass(report.status)}>
                    {humanLabel(report.status)}
                  </Badge>
                  <Badge variant="outline" className={verdictClass(report.aiCouncilVerdict)}>
                    {humanLabel(report.aiCouncilVerdict)}
                  </Badge>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Completed</dt>
                  <dd className="mt-0.5 font-mono">{whenLabel(report.completedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Scope coverage</dt>
                  <dd className="mt-0.5 font-mono">{report.scopeCoverage}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Raw monthly opportunity</dt>
                  <dd className="mt-0.5 font-mono tabular-nums">
                    {sar(report.rawOpportunityMonthlySavingsSar)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Executable monthly</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-primary">
                    {sar(report.executableMonthlySavingsSar)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Executable yearly</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-primary">
                    {sar(report.executableYearlySavingsSar)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(report)}
                >
                  Details
                </Button>
                {report.reportArtifact ? (
                  <Button asChild variant="ghost" size="sm">
                    <a href={report.reportArtifact.url} target="_blank" rel="noreferrer">
                      <FileSpreadsheet className="size-4" aria-hidden="true" />
                      Open Excel Report
                    </a>
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.service} · Full Cycle detail</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selected?.controllerId}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailList title="Assessed clusters" items={selected.assessedClusters} />
              <DetailList title="Unavailable clusters" items={selected.unavailableClusters} />
              <DetailList
                title={`Approved deployments (${selected.approvedDeploymentCount})`}
                items={selected.approvedDeployments}
              />
              <DetailList
                title={`Blocked deployments (${selected.blockedDeploymentCount})`}
                items={selected.blockedDeployments}
              />
              <DetailList title="Warnings" items={selected.warnings} />
              <DetailList title="Hard blockers" items={selected.hardBlockers} />
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Next action
                </p>
                <p className="mt-1 text-sm">{selected.nextAction}</p>
              </div>
              {selected.reportArtifact ? (
                <div className="sm:col-span-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={selected.reportArtifact.url} target="_blank" rel="noreferrer">
                      <FileSpreadsheet className="size-4" aria-hidden="true" />
                      Open Excel Report
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
