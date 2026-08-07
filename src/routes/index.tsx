import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  Clock,
  Cpu,
  FileCheck2,
  GitPullRequest,
  Layers,
  LineChart,
  MemoryStick,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { CopilotChat } from "@/components/CopilotChat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkflowRail } from "@/components/WorkflowRail";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OpenShift Cost Copilot — Agentic CPU & RAM Savings" },
      {
        name: "description",
        content:
          "An agentic AI that cuts OpenShift spend by right-sizing CPU and RAM across projects, driven by an n8n workflow that screens merged pull requests for resource changes.",
      },
      { property: "og:title", content: "OpenShift Cost Copilot — Agentic CPU & RAM Savings" },
      {
        property: "og:description",
        content:
          "Ask 'Can I save the cost for service X?' and get a right-sizing report on CPU, RAM and replicas — reviewed against merged pull requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PIPELINE = [
  {
    icon: GitPullRequest,
    title: "Collect merged PRs",
    body: "The n8n workflow polls every repository and pulls each newly merged pull request with its full diff.",
  },
  {
    icon: FileCheck2,
    title: "Classify: resource or not",
    body: "The agent reads the diff and decides whether it touches CPU/RAM requests, limits, HPA or replicas. Everything else is skipped with a reason.",
  },
  {
    icon: Activity,
    title: "Pull live utilization",
    body: "For considered services it queries P95 CPU and memory usage per OpenShift project over the trailing window.",
  },
  {
    icon: Cpu,
    title: "Recommend right-sizing",
    body: "Requests are recalculated with a safety headroom, keeping CPU and RAM in scope only — no storage or network changes.",
  },
  {
    icon: ShieldCheck,
    title: "Human-approved rollout",
    body: "The agent opens a proposal PR with the new resource block. Platform owners approve before anything reaches a cluster.",
  },
];

const CAPABILITIES = [
  {
    icon: Workflow,
    title: "n8n-orchestrated",
    body: "Every step runs as a versioned n8n workflow — schedulable, observable, and easy for the platform team to extend.",
  },
  {
    icon: Layers,
    title: "Project-scoped",
    body: "Analysis is per OpenShift project so ownership, quotas and chargeback stay intact.",
  },
  {
    icon: LineChart,
    title: "Evidence-backed",
    body: "Each recommendation cites utilization percentiles and the pull requests that were considered or skipped.",
  },
  {
    icon: Clock,
    title: "Continuous, not quarterly",
    body: "Right-sizing runs on every merge instead of a once-a-quarter capacity review.",
  },
  {
    icon: Boxes,
    title: "Two levers only",
    body: "Deliberately narrow scope: CPU and RAM requests plus replica counts. Low risk, fast approval.",
  },
  {
    icon: MemoryStick,
    title: "No performance regressions",
    body: "Headroom guardrails and P95-based sizing keep latency budgets safe while trimming idle reservations.",
  },
];

const STATS = [
  { value: "31%", label: "Average idle CPU reclaimed per project" },
  { value: "27%", label: "Average over-reserved RAM released" },
  { value: "100%", label: "Merged PRs screened for resource changes" },
  { value: "0", label: "Manual capacity spreadsheets required" },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-40" aria-hidden="true" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-border bg-surface p-1.5">
              <Cpu className="size-4 text-primary" aria-hidden="true" />
            </div>
            <span className="font-display text-sm font-semibold tracking-tight">
              OpenShift Cost Copilot
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#demo"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary"
            >
              See the demo
            </a>
            <ThemeToggle />
          </div>

        </header>

        <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 text-center">
          <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
            <Workflow className="size-3.5" aria-hidden="true" />
            Agentic AI · n8n workflow · CPU &amp; RAM only
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            We are paying for CPU and RAM nobody is using.
            <span className="block text-primary">This agent finds it and gives it back.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            An LLM agent reviews every merged pull request, decides whether it is resource-related,
            and right-sizes CPU and memory requests across our OpenShift projects. Recommendations
            arrive as reviewable pull requests — never silent cluster edits.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Run the live demo
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary"
            >
              How the workflow runs
            </a>
          </div>

          <dl className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface p-5 text-left">
                <dt className="font-display text-3xl font-semibold text-primary">{stat.value}</dt>
                <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section id="demo" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-20">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-primary">Live demo</p>
          <h2 className="mt-3 text-3xl font-semibold">Ask it about any of our services</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Chat directly with OpenShift_MultiCluster_Supervisor. It starts a read-only dry-run
            assessment, returns the run ID, and reports CPU and RAM savings per namespace.
          </p>
        </div>
        <CopilotChat />
      </section>

      <section id="how" className="border-y border-border bg-surface/40 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-primary">The workflow</p>
            <h2 className="mt-3 text-3xl font-semibold">Five steps, fully automated in n8n</h2>
          </div>
          <WorkflowRail steps={PIPELINE} />
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-primary">Why the committee should back it</p>
          <h2 className="mt-3 text-3xl font-semibold">Narrow scope, measurable return</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item) => (
            <Card key={item.title} className="border-border bg-surface p-5">
              <div className="w-fit rounded-md border border-border bg-background p-2">
                <item.icon className="size-4 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>OpenShift Cost Copilot · Internal FinOps automation</p>
          <p>Scope: CPU &amp; RAM requests and replica counts only.</p>
        </div>
      </footer>
    </main>
  );
}
