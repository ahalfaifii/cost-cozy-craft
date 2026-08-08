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

/** Text fallback: only used when the copilot exposes the response as plain text. */
export function findControllerIdInText(text: string): string {
  if (!text) return "";
  const labelled = text.match(/controller\s*id\s*[:=]?\s*[`"']?([A-Za-z0-9._:-]{6,200})/i);
  if (labelled?.[1]) return labelled[1].replace(/[.,`"')\]]+$/, "");
  const bare = text.match(/\bfull-cycle-[A-Za-z0-9._:-]{3,190}\b/i);
  return bare?.[0]?.replace(/[.,`"')\]]+$/, "") ?? "";
}

export function extractControllerId(value: unknown, text: string): string {
  return findControllerIdInValue(value) || findControllerIdInText(text);
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
