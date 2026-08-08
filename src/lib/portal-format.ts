import type { FullCycleReport } from "@/lib/portal.functions";

/** SAR with 2 decimals, grouped thousands. */
export function sar(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `SAR ${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortCommit(commit: string): string {
  return commit && commit !== "—" ? commit.slice(0, 12) : "—";
}

export function whenLabel(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STAGES: { key: string; label: string }[] = [
  { key: "SCOPE_RESOLVED", label: "Scope resolved" },
  { key: "ASSESSMENT_STARTED", label: "Assessment running" },
  { key: "ASSESSMENT_COMPLETED", label: "Assessment complete" },
  { key: "REPORT_READY", label: "Report generated" },
  { key: "EVIDENCE_READY", label: "Evidence validated" },
  { key: "SIMULATION_COMPLETED", label: "Execution simulated" },
  { key: "SIMULATION_COUNCIL_COMPLETE", label: "AI Council reviewed" },
  { key: "FINAL_STATE_STORED", label: "Final result stored" },
];

export type StageState = "completed" | "active" | "pending" | "failed";

export function stageStates(report: FullCycleReport): StageState[] {
  const done = new Set(report.completedStages.map((stage) => stage.trim().toUpperCase()));
  const status = report.status.toUpperCase();
  const failed = status.includes("FAIL") || status.includes("ERROR");
  let activeAssigned = false;
  return STAGES.map(({ key }) => {
    if (done.has(key)) return "completed" as StageState;
    if (!activeAssigned) {
      activeAssigned = true;
      if (failed) return "failed" as StageState;
      return status === "RUNNING" || status === "IN_PROGRESS" ? "active" : "pending";
    }
    return "pending" as StageState;
  });
}

export function isTerminal(status: string): boolean {
  const value = status.toUpperCase();
  return value === "COMPLETED" || value === "AWAITING_HUMAN_APPROVAL" || value === "COMPLETE";
}

export function verdictTone(verdict: string): "positive" | "warning" | "review" | "neutral" {
  const value = verdict.toUpperCase();
  if (value === "APPROVE") return "positive";
  if (value === "APPROVE_WITH_WARNINGS") return "warning";
  if (value.includes("HUMAN") || value.includes("REVIEW") || value.includes("REJECT"))
    return "review";
  return "neutral";
}

export function verdictClass(verdict: string): string {
  switch (verdictTone(verdict)) {
    case "positive":
      return "border-success/40 bg-success/10 text-success";
    case "warning":
      return "border-warning/40 bg-warning/10 text-warning";
    case "review":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function riskClass(risk: string): string {
  const value = risk.toUpperCase();
  if (value === "SAFE" || value === "LOW_RISK")
    return "border-success/40 bg-success/10 text-success";
  if (value === "MEDIUM_RISK") return "border-warning/40 bg-warning/10 text-warning";
  if (value === "HIGH_RISK") return "border-chart-3/50 bg-chart-3/15 text-chart-3";
  if (value === "CRITICAL_RISK") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export function statusClass(status: string): string {
  const value = status.toUpperCase();
  if (value === "RUNNING" || value === "IN_PROGRESS")
    return "border-primary/40 bg-primary/10 text-primary";
  if (isTerminal(value)) return "border-success/40 bg-success/10 text-success";
  if (value.includes("FAIL") || value.includes("ERROR"))
    return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export function humanLabel(value: string): string {
  if (!value || value === "—") return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

/** Event name used to hand a completed Full Cycle result to the chat panel. */
export const FULL_CYCLE_COMPLETED_EVENT = "portal:full-cycle-completed";

/** Event name used to announce a newly started Full Cycle controller. */
export const FULL_CYCLE_STARTED_EVENT = "full-cycle-started";

const CONTROLLER_KEYS = ["controllerId", "controller_id", "controllerID"];

/** Deep-scans a structured Direct Line payload for a controller id. */
export function findControllerIdInValue(input: unknown, depth = 0): string {
  if (!input || depth > 6) return "";
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findControllerIdInValue(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof input !== "object") return "";
  const record = input as Record<string, unknown>;
  for (const key of CONTROLLER_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(record)) {
    const found = findControllerIdInValue(value, depth + 1);
    if (found) return found;
  }
  return "";
}

/** Expected controller id shape, e.g. full-cycle-ertah-20260808144617-hl3rf */
const CONTROLLER_FORMAT = /^full-cycle-[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)+$/;

export function isValidControllerId(id: string): boolean {
  const value = id.trim();
  return value.length >= 12 && value.length <= 200 && CONTROLLER_FORMAT.test(value);
}

/**
 * Copilot text can concatenate labels without spacing
 * ("...-hl3rfRun ID:Status:..."), so cut any trailing field label.
 */
function trimTrailingLabel(raw: string): string {
  let out = raw;
  for (let i = 0; i < 6; i += 1) {
    const next = out.replace(
      /(?:Run(?:ID)?|Status|Phase|Service|Report|Requester|Next|Controller)$/,
      "",
    );
    if (next === out) break;
    out = next;
  }
  return out.replace(/[-_.:]+$/, "");
}

function cleanControllerCandidate(raw: string): string {
  const trimmed = trimTrailingLabel(raw.trim().replace(/[.,`"')\]]+$/, ""));
  return isValidControllerId(trimmed) ? trimmed : "";
}

/** Text fallback: only used when the copilot exposes the response as plain text. */
export function findControllerIdInText(text: string): string {
  if (!text) return "";
  // Stop the capture at a newline or at the next known field label.
  const labelled = text.match(
    /controller\s*id\s*[:=]?\s*[`"']?([A-Za-z0-9._:-]{6,200}?)(?=\s*(?:Run\s*ID|RunID|Status|Phase|Service|Report|Next|$|[\s,`"')\]]))/i,
  );
  const fromLabel = cleanControllerCandidate(labelled?.[1] ?? "");
  if (fromLabel) return fromLabel;
  const bare = text.match(/full-cycle-[A-Za-z0-9._:-]{3,190}/i);
  return cleanControllerCandidate(bare?.[0] ?? "");
}

export type ControllerSource = "structured" | "text-fallback";

export function extractControllerIdWithSource(
  value: unknown,
  text: string,
): { controllerId: string; source: ControllerSource } | null {
  const structured = cleanControllerCandidate(findControllerIdInValue(value));
  if (structured) return { controllerId: structured, source: "structured" };
  const parsed = findControllerIdInText(text);
  if (parsed) return { controllerId: parsed, source: "text-fallback" };
  return null;
}

export function extractControllerId(value: unknown, text: string): string {
  return extractControllerIdWithSource(value, text)?.controllerId ?? "";
}

/** Derives the service from the controller id: full-cycle-<service>-<stamp>-<rand>. */
export function serviceFromControllerId(controllerId: string): string {
  const parts = controllerId.split("-");
  return parts.length >= 4 ? parts[2] ?? "" : "";
}

/** Optimistic report used the instant a controller id is latched. */
export function startingReport(controllerId: string, service?: string): FullCycleReport {
  return {
    service: service || serviceFromControllerId(controllerId) || "—",
    runId: "—",
    controllerId,
    status: "FULL_CYCLE_ACCEPTED",
    terminalState: false,
    currentPhase: "BACKGROUND_CONTROLLER_STARTED",
    completedStages: [],
    aiCouncilVerdict: "—",
    scopeCoverage: "—",
    assessedClusters: [],
    unavailableClusters: [],
    approvedDeploymentCount: 0,
    blockedDeploymentCount: 0,
    rawOpportunityMonthlySavingsSar: 0,
    rawOpportunityYearlySavingsSar: 0,
    executableMonthlySavingsSar: 0,
    executableYearlySavingsSar: 0,
    blockedOpportunityMonthlySavingsSar: 0,
    currentMonthlyRequestCostSar: 0,
    targetMonthlyRequestCostSar: 0,
    warnings: [],
    hardBlockers: [],
    approvedDeployments: [],
    blockedDeployments: [],
    nextAction: "",
    completedAt: "",
    reportArtifact: null,
  };
}

/** Human status for the monitor — never "Unknown" once a controller is accepted. */
export function liveStatusLabel(report: FullCycleReport): string {
  const status = report.status.trim().toUpperCase();
  if (!status || status === "—" || status === "UNKNOWN") return "Starting…";
  if (status === "FULL_CYCLE_ACCEPTED") return "Starting…";
  if (status === "RUNNING" || status === "IN_PROGRESS") {
    return report.completedStages.length === 0 ? "Waiting for assessment…" : "Running";
  }
  return humanLabel(report.status);
}


/** Terminal detection tolerant of the backend's different completion signals. */
export function isReportTerminal(report: {
  status: string;
  terminalState?: boolean;
  completedStages: string[];
}): boolean {
  if (report.terminalState === true) return true;
  if (report.completedStages.some((stage) => stage.trim().toUpperCase() === "FINAL_STATE_STORED"))
    return true;
  return isTerminal(report.status);
}
