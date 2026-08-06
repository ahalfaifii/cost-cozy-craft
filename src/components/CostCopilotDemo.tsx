import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BadgeCheck,
  Cpu,
  GitPullRequest,
  Loader2,
  MemoryStick,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { analyzeService, type CostReport } from "@/lib/cost-analysis.functions";

const EXAMPLES = [
  "Can I save the cost for service payments-api?",
  "Can I save the cost for service customer-portal in namespace retail-prod?",
  "Review resource usage for service notification-worker",
];

const VERDICT_LABEL: Record<CostReport["verdict"], string> = {
  "savings-available": "Savings available",
  "already-optimized": "Already right-sized",
  "needs-more-data": "More data needed",
};

function Metric({
  icon: Icon,
  label,
  current,
  recommended,
}: {
  icon: typeof Cpu;
  label: string;
  current: string;
  recommended: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-3 flex items-center gap-2 font-mono text-sm">
        <span className="text-muted-foreground line-through">{current}</span>
        <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
        <span className="text-lg font-medium text-primary">{recommended}</span>
      </div>
    </div>
  );
}

export function CostCopilotDemo() {
  const [question, setQuestion] = useState(EXAMPLES[0]!);
  const analyze = useServerFn(analyzeService);

  const mutation = useMutation({
    mutationFn: (value: string) => analyze({ data: { question: value } }),
  });

  const report = mutation.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="border-border bg-surface p-6 shadow-panel">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          Ask the copilot
        </div>
        <h3 className="mt-3 text-xl font-semibold">Can I save the cost for a service?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Type a plain-language question. The agent identifies the OpenShift project, reviews merged
          pull requests for resource changes, and returns a CPU and RAM right-sizing report.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const value = question.trim();
            if (value.length > 2) mutation.mutate(value);
          }}
        >
          <label className="sr-only" htmlFor="copilot-question">
            Your question for the cost copilot
          </label>
          <Textarea
            id="copilot-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Can I save the cost for service {servicename}?"
            className="resize-none bg-background font-mono text-sm"
          />
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Analyzing workloads…
              </>
            ) : (
              <>
                Generate savings report
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Try an example</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuestion(example)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {mutation.isError ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            The copilot could not complete this analysis. Please try again in a moment.
          </p>
        ) : null}
      </Card>

      <Card className="border-border bg-surface p-6 shadow-panel">
        {!report ? (
          <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
            <div className="rounded-full border border-border bg-background p-4">
              <Sparkles className="size-6 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Your report appears here: utilization, recommended CPU and RAM requests, reviewed pull
              requests, and estimated monthly savings.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Report · {report.namespace}
                </p>
                <h3 className="mt-1 font-mono text-lg text-foreground">{report.service}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Est. monthly saving
                </p>
                <p className="font-display text-2xl font-semibold text-primary">
                  ${report.estimatedMonthlySavingsUsd.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {VERDICT_LABEL[report.verdict]}
              </Badge>
              <Badge variant="outline">Confidence {Math.round(report.confidence)}%</Badge>
              <Badge variant="outline">{report.recommended.replicas} replicas recommended</Badge>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Metric
                icon={Cpu}
                label="CPU request"
                current={report.current.cpuRequest}
                recommended={report.recommended.cpuRequest}
              />
              <Metric
                icon={MemoryStick}
                label="Memory request"
                current={report.current.memoryRequest}
                recommended={report.recommended.memoryRequest}
              />
            </div>

            <div className="space-y-3">
              {[
                { label: "CPU P95 utilization", value: report.utilization.cpuP95Percent },
                { label: "Memory P95 utilization", value: report.utilization.memoryP95Percent },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{row.label}</span>
                    <span className="font-mono">{Math.round(row.value)}%</span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, row.value))} className="mt-1.5 h-1.5" />
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Pull requests reviewed
              </p>
              <ul className="mt-2 space-y-2">
                {report.pullRequests.map((pr) => (
                  <li
                    key={pr.id}
                    className="flex gap-3 rounded-lg border border-border bg-background/60 p-3"
                  >
                    <GitPullRequest
                      className={
                        pr.resourceRelated
                          ? "mt-0.5 size-4 shrink-0 text-primary"
                          : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                      }
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        <span className="font-mono text-muted-foreground">{pr.id}</span>{" "}
                        {pr.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {pr.resourceRelated ? "Considered · " : "Skipped · "}
                        {pr.decision}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Findings</p>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {report.findings.map((finding) => (
                    <li key={finding.title}>
                      <span className="text-foreground">{finding.title}</span> — {finding.detail}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Next steps</p>
                <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {report.nextSteps.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="font-mono text-primary">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
