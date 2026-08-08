import type { FullCycleReport } from "@/lib/portal.functions";

/**
 * Derivations over the EXISTING backend payloads only.
 * Anything the backend does not expose returns null so the UI can render
 * "Coming from live analysis" instead of a fabricated number.
 */

export const PROMPT_PREFILL_EVENT = "portal:prompt-prefill";

export type ImpactAggregate = {
  executableYearlySar: number;
  rawYearlySar: number;
  servicesAnalyzed: number;
  /** Percentage of requested cost released, null when cost fields are absent. */
  costReductionPercent: number | null;
  cpuOptimizedPercent: number | null;
  ramOptimizedPercent: number | null;
  approvedDeployments: number;
  blockedDeployments: number;
  hasLiveData: boolean;
};

function pct(current: number, target: number): number | null {
  if (!Number.isFinite(current) || current <= 0) return null;
  if (!Number.isFinite(target) || target < 0) return null;
  const value = ((current - target) / current) * 100;
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/** Pulls a `cpu: 500m -> 250m` / `memory: 8Gi -> 4Gi` pair out of a free-text line. */
function findPair(lines: string[], kind: "cpu" | "memory"): { from: string; to: string } | null {
  const label = kind === "cpu" ? "cpu" : "(?:memory|ram|mem)";
  const pattern = new RegExp(
    `${label}[^A-Za-z0-9]{0,12}([0-9]+(?:\\.[0-9]+)?\\s*[A-Za-z]{0,3})\\s*(?:->|→|=>|to)\\s*([0-9]+(?:\\.[0-9]+)?\\s*[A-Za-z]{0,3})`,
    "i",
  );
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1] && match[2]) return { from: match[1].trim(), to: match[2].trim() };
  }
  return null;
}

function toNumber(value: string): number | null {
  const match = value.match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  const base = Number(match[0]);
  if (!Number.isFinite(base)) return null;
  const unit = value.replace(match[0], "").trim().toLowerCase();
  if (unit === "m") return base / 1000;
  if (unit === "gi" || unit === "g" || unit === "gb") return base * 1024;
  if (unit === "mi" || unit === "mb") return base;
  return base;
}

export type SizingPair = {
  label: string;
  current: string;
  recommended: string;
  reductionPercent: number | null;
};

/** Before → after sizing derived from the report's own deployment lines. */
export function sizingFromReport(report: FullCycleReport): SizingPair[] {
  const lines = [...report.approvedDeployments, ...report.blockedDeployments];
  const result: SizingPair[] = [];
  const cpu = findPair(lines, "cpu");
  const memory = findPair(lines, "memory");
  if (cpu) {
    const from = toNumber(cpu.from);
    const to = toNumber(cpu.to);
    result.push({
      label: "CPU request",
      current: cpu.from,
      recommended: cpu.to,
      reductionPercent: from && to !== null ? pct(from, to) : null,
    });
  }
  if (memory) {
    const from = toNumber(memory.from);
    const to = toNumber(memory.to);
    result.push({
      label: "Memory request",
      current: memory.from,
      recommended: memory.to,
      reductionPercent: from && to !== null ? pct(from, to) : null,
    });
  }
  return result;
}

/** Monthly request cost before/after — always real when the backend sends it. */
export function costSizing(report: FullCycleReport): {
  current: number;
  target: number;
  reductionPercent: number | null;
} | null {
  if (report.currentMonthlyRequestCostSar <= 0) return null;
  return {
    current: report.currentMonthlyRequestCostSar,
    target: report.targetMonthlyRequestCostSar,
    reductionPercent: pct(report.currentMonthlyRequestCostSar, report.targetMonthlyRequestCostSar),
  };
}

export function aggregateImpact(reports: FullCycleReport[]): ImpactAggregate {
  const services = new Set(
    reports.map((report) => report.service).filter((service) => service && service !== "—"),
  );
  const totalCurrent = reports.reduce((sum, r) => sum + r.currentMonthlyRequestCostSar, 0);
  const totalTarget = reports.reduce((sum, r) => sum + r.targetMonthlyRequestCostSar, 0);

  const cpuPairs = reports
    .map((report) => sizingFromReport(report).find((pair) => pair.label === "CPU request"))
    .filter((pair): pair is SizingPair => Boolean(pair && pair.reductionPercent !== null));
  const ramPairs = reports
    .map((report) => sizingFromReport(report).find((pair) => pair.label === "Memory request"))
    .filter((pair): pair is SizingPair => Boolean(pair && pair.reductionPercent !== null));

  const average = (pairs: SizingPair[]) =>
    pairs.length === 0
      ? null
      : Math.round(pairs.reduce((sum, p) => sum + (p.reductionPercent ?? 0), 0) / pairs.length);

  return {
    executableYearlySar: reports.reduce((sum, r) => sum + r.executableYearlySavingsSar, 0),
    rawYearlySar: reports.reduce((sum, r) => sum + r.rawOpportunityYearlySavingsSar, 0),
    servicesAnalyzed: services.size,
    costReductionPercent: pct(totalCurrent, totalTarget),
    cpuOptimizedPercent: average(cpuPairs),
    ramOptimizedPercent: average(ramPairs),
    approvedDeployments: reports.reduce((sum, r) => sum + r.approvedDeploymentCount, 0),
    blockedDeployments: reports.reduce((sum, r) => sum + r.blockedDeploymentCount, 0),
    hasLiveData: reports.length > 0,
  };
}

export type Opportunity = {
  service: string;
  controllerId: string;
  yearlySar: number;
  monthlySar: number;
  rawYearlySar: number;
  reductionPercent: number | null;
  sizing: SizingPair[];
  verdict: string;
};

/** Services ranked by executable yearly savings, from the latest reports. */
export function rankOpportunities(reports: FullCycleReport[]): Opportunity[] {
  const byService = new Map<string, Opportunity>();
  for (const report of reports) {
    const service = report.service && report.service !== "—" ? report.service : "";
    if (!service) continue;
    const value = report.executableYearlySavingsSar || report.rawOpportunityYearlySavingsSar;
    const existing = byService.get(service);
    if (existing && existing.yearlySar >= value) continue;
    byService.set(service, {
      service,
      controllerId: report.controllerId,
      yearlySar: report.executableYearlySavingsSar,
      monthlySar: report.executableMonthlySavingsSar,
      rawYearlySar: report.rawOpportunityYearlySavingsSar,
      reductionPercent: costSizing(report)?.reductionPercent ?? null,
      sizing: sizingFromReport(report),
      verdict: report.aiCouncilVerdict,
    });
  }
  return [...byService.values()].sort(
    (a, b) => b.yearlySar - a.yearlySar || b.rawYearlySar - a.rawYearlySar,
  );
}

export function askAboutService(service: string): void {
  window.dispatchEvent(
    new CustomEvent(PROMPT_PREFILL_EVENT, {
      detail: { prompt: `Can I save cost for ${service}?` },
    }),
  );
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
