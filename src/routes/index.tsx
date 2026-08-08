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
import { FullCycleReports } from "@/components/FullCycleReports";
import { LiveOptimizationPanel } from "@/components/LiveOptimizationPanel";
import { OverviewSummary } from "@/components/OverviewSummary";
import { ResourceGuardReports } from "@/components/ResourceGuardReports";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkflowRail } from "@/components/WorkflowRail";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";



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

const BENEFITS = [
  {
    title: "Real money, evidenced in SAR",
    body: "Every run reports raw opportunity and the executable portion after safety controls, so the committee sees what is actually bankable.",
  },
  {
    title: "Safety before savings",
    body: "The AI Council reviews each simulated change; anything risky is held back and surfaced as a blocked opportunity instead of applied.",
  },
  {
    title: "Advisory, never disruptive",
    body: "The portal and Resource Guard are read-only. Engineers keep full control of commits, merges and deployments.",
  },
  {
    title: "Audit-ready reporting",
    body: "Full Cycle runs keep run IDs, controller IDs, cluster coverage and Excel reports for review long after the demo.",
  },
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
              href="#demo"
              className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary"
            >
              Open the portal
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

      <section id="demo" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-primary">Cost optimization portal</p>
          <h2 className="mt-3 text-3xl font-semibold">Everything the committee needs, in one view</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A read-only, advisory portal over the live Full Cycle optimization runs, the AI Council
            verdicts and the Resource Guard reviews.
          </p>
        </div>

        <Tabs defaultValue="overview" className="gap-6">
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live">Live Optimization</TabsTrigger>
            <TabsTrigger value="reports">Full Cycle Reports</TabsTrigger>
            <TabsTrigger value="guard">Resource Guard</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <OverviewSummary />
            <div>
              <h3 className="mb-4 font-display text-lg font-semibold">How a run flows</h3>
              <WorkflowRail steps={PIPELINE} />
            </div>
          </TabsContent>

          <TabsContent value="live">
            <div className="grid gap-6 lg:grid-cols-2">
              <CopilotChat />
              <LiveOptimizationPanel />
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <FullCycleReports />
          </TabsContent>

          <TabsContent value="guard">
            <ResourceGuardReports />
          </TabsContent>

          <TabsContent value="features">
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
          </TabsContent>

          <TabsContent value="benefits">
            <div className="grid gap-4 md:grid-cols-2">
              {BENEFITS.map((item) => (
                <Card key={item.title} className="border-border bg-surface p-5">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
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
