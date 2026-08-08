import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
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
import { humanLabel, riskClass, sar, shortCommit, whenLabel } from "@/lib/portal-format";
import { getLatestResourceGuardReports, type ResourceGuardReport } from "@/lib/portal.functions";

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None recorded</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResourceGuardReports() {
  const fetchReports = useServerFn(getLatestResourceGuardReports);
  const [selected, setSelected] = useState<ResourceGuardReport | null>(null);

  const query = useQuery({
    queryKey: ["portal-resource-guards"],
    queryFn: () => fetchReports(),
    refetchInterval: 30_000,
  });

  const reports = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Latest 5 Resource Guard reviews — advisory only, commits and merges are never blocked.
        </p>
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
          No Resource Guard reports yet.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {reports.map((report) => {
            const reduction = report.monthlySavingsSar > 0 || report.yearlySavingsSar > 0;
            const increase =
              !reduction && (report.monthlyCostDeltaSar !== 0 || report.yearlyCostDeltaSar !== 0);
            return (
              <Card
                key={`${report.repository}-${report.commit}-${report.deployment}`}
                className="border-border bg-surface p-4 transition-shadow hover:shadow-panel"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold">{report.service}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {report.repository} · {shortCommit(report.commit)}
                    </p>
                  </div>
                  <Badge variant="outline" className={riskClass(report.riskLevel)}>
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    {humanLabel(report.riskLevel)}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Environment</dt>
                    <dd className="mt-0.5 font-mono">{report.environment}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cluster</dt>
                    <dd className="mt-0.5 font-mono">{report.cluster}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Namespace</dt>
                    <dd className="mt-0.5 font-mono">{report.namespace}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deployment</dt>
                    <dd className="mt-0.5 font-mono">{report.deployment}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Change direction</dt>
                    <dd className="mt-0.5 font-mono">{humanLabel(report.changeDirection)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Implementer</dt>
                    <dd className="mt-0.5 font-mono">{report.implementer}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Generated</dt>
                    <dd className="mt-0.5 font-mono">{whenLabel(report.generatedAt)}</dd>
                  </div>
                </dl>

                {reduction ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Monthly savings</p>
                      <p className="mt-0.5 font-mono tabular-nums text-success">
                        {sar(report.monthlySavingsSar)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Yearly savings</p>
                      <p className="mt-0.5 font-mono tabular-nums text-success">
                        {sar(report.yearlySavingsSar)}
                      </p>
                    </div>
                  </div>
                ) : increase ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Monthly cost delta</p>
                      <p className="mt-0.5 font-mono tabular-nums text-warning">
                        {sar(report.monthlyCostDeltaSar)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Yearly cost delta</p>
                      <p className="mt-0.5 font-mono tabular-nums text-warning">
                        {sar(report.yearlyCostDeltaSar)}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(report)}
                  >
                    View evidence
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.service} · Resource Guard evidence</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selected ? `${selected.repository} · ${shortCommit(selected.commit)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <EvidenceList title="Resource diff" items={selected.resourceDiff} />
              <EvidenceList title="Suggested safer values" items={selected.suggestedSaferValues} />
              <EvidenceList title="Historical evidence" items={selected.historicalEvidence} />
              <EvidenceList
                title="AI Council findings / risk sources"
                items={selected.councilFindings}
              />
              <EvidenceList title="Runtime observation" items={selected.runtimeObservation} />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Recommendation
                </p>
                <p className="mt-1 text-sm">{selected.recommendation}</p>
              </div>
              <p className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                Advisory guidance for the implementing team. Resource Guard does not block commits,
                merges or deployments.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
