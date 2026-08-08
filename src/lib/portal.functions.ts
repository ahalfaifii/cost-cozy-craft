import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Types shared with the UI (plain DTOs only)
 * ------------------------------------------------------------------ */

export type PortalConfigState = "ok" | "not-configured" | "error";

export type ReportArtifact = { url: string; filename?: string } | null;

export type FullCycleReport = {
  service: string;
  runId: string;
  controllerId: string;
  status: string;
  currentPhase: string;
  completedStages: string[];
  aiCouncilVerdict: string;
  scopeCoverage: string;
  assessedClusters: string[];
  unavailableClusters: string[];
  approvedDeploymentCount: number;
  blockedDeploymentCount: number;
  rawOpportunityMonthlySavingsSar: number;
  rawOpportunityYearlySavingsSar: number;
  executableMonthlySavingsSar: number;
  executableYearlySavingsSar: number;
  blockedOpportunityMonthlySavingsSar: number;
  currentMonthlyRequestCostSar: number;
  targetMonthlyRequestCostSar: number;
  warnings: string[];
  hardBlockers: string[];
  approvedDeployments: string[];
  blockedDeployments: string[];
  nextAction: string;
  completedAt: string;
  reportArtifact: ReportArtifact;
};

export type ResourceGuardReport = {
  riskLevel: string;
  repository: string;
  commit: string;
  service: string;
  environment: string;
  cluster: string;
  namespace: string;
  deployment: string;
  changeDirection: string;
  implementer: string;
  generatedAt: string;
  monthlySavingsSar: number;
  yearlySavingsSar: number;
  monthlyCostDeltaSar: number;
  yearlyCostDeltaSar: number;
  resourceDiff: string[];
  suggestedSaferValues: string[];
  historicalEvidence: string[];
  councilFindings: string[];
  runtimeObservation: string[];
  recommendation: string;
  reportArtifact: ReportArtifact;
};

export type PortalResult<T> = {
  state: PortalConfigState;
  message?: string;
  data: T;
};

/* ------------------------------------------------------------------ *
 * Server-only backend call
 * ------------------------------------------------------------------ */

const REQUESTER_COOKIE = "portal_requester";

type BackendCall = { ok: true; body: unknown } | { ok: false; state: PortalConfigState; message: string };

async function callBackend(payload: Record<string, unknown>): Promise<BackendCall> {
  const url = process.env["PORTAL_BACKEND_URL"]?.trim();
  const secret = process.env["PORTAL_BACKEND_SECRET"]?.trim();
  const userKey = process.env["PORTAL_3SCALE_USER_KEY"]?.trim();

  if (!url || !secret) {
    return {
      ok: false,
      state: "not-configured",
      message:
        "The portal backend is not configured yet. Add PORTAL_BACKEND_URL and PORTAL_BACKEND_SECRET as server-side secrets to load Full Cycle and Resource Guard data.",
    };
  }

  if (!userKey) {
    return {
      ok: false,
      state: "not-configured",
      message: "PORTAL_3SCALE_USER_KEY is not configured.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-portal-secret": secret,
        user_key: userKey,
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        state: "error",
        message:
          "The portal backend rejected the request (authentication failed). Verify the portal and API gateway credentials configured on the server.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        state: "error",
        message: `The portal backend responded with status ${res.status}.`,
      };
    }
    return { ok: true, body: await res.json() };
  } catch {
    return { ok: false, state: "error", message: "The portal backend could not be reached." };
  }
}


/* ------------------------------------------------------------------ *
 * Lenient response normalisation
 * ------------------------------------------------------------------ */

const RecordSchema = z.record(z.string(), z.unknown());
const EnvelopeSchema = z.union([RecordSchema, z.array(RecordSchema)]);

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pick(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function str(source: Record<string, unknown>, keys: string[], fallback = ""): string {
  const value = pick(source, keys);
  if (value === undefined) return fallback;
  return typeof value === "string" ? value : String(value);
}

function num(source: Record<string, unknown>, keys: string[]): number {
  const value = pick(source, keys);
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function list(source: Record<string, unknown>, keys: string[]): string[] {
  const value = pick(source, keys);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? Object.entries(item as Record<string, unknown>)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(" · ")
            : String(item),
      )
      .filter((item) => item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

/** Strips any base64 payload; only a real URL is ever exposed. */
function artifact(source: Record<string, unknown>): ReportArtifact {
  const raw = rec(pick(source, ["reportArtifact", "report", "artifact", "excelReport"]));
  const url = str(raw, ["url", "link", "href", "downloadUrl"]) || str(source, ["reportUrl", "excelUrl"]);
  if (!/^https?:\/\//i.test(url)) return null;
  const filename = str(raw, ["filename", "name", "fileName"]);
  return filename ? { url, filename } : { url };
}

function toFullCycle(input: unknown): FullCycleReport {
  const s = rec(input);
  const savings = rec(pick(s, ["savings", "costs", "financials"]));
  const merged = { ...savings, ...s };
  return {
    service: str(merged, ["service", "serviceName", "app"], "—"),
    runId: str(merged, ["runId", "run_id", "runID"], "—"),
    controllerId: str(merged, ["controllerId", "controller_id", "controllerID"], "—"),
    status: str(merged, ["status", "state"], "UNKNOWN"),
    currentPhase: str(merged, ["currentPhase", "phase", "currentStage"], "—"),
    completedStages: list(merged, ["completedStages", "completed_stages", "stages"]),
    aiCouncilVerdict: str(merged, ["aiCouncilVerdict", "councilVerdict", "verdict"], "—"),
    scopeCoverage: str(merged, ["scopeCoverage", "coverage"], "—"),
    assessedClusters: list(merged, ["assessedClusters", "clustersAssessed"]),
    unavailableClusters: list(merged, ["unavailableClusters", "clustersUnavailable"]),
    approvedDeploymentCount: num(merged, ["approvedDeploymentCount", "approvedCount"]),
    blockedDeploymentCount: num(merged, ["blockedDeploymentCount", "blockedCount"]),
    rawOpportunityMonthlySavingsSar: num(merged, [
      "rawOpportunityMonthlySavingsSar",
      "rawMonthlySavingsSar",
      "rawMonthlyOpportunitySar",
    ]),
    rawOpportunityYearlySavingsSar: num(merged, [
      "rawOpportunityYearlySavingsSar",
      "rawYearlySavingsSar",
      "rawYearlyOpportunitySar",
    ]),
    executableMonthlySavingsSar: num(merged, ["executableMonthlySavingsSar", "executableMonthlySar"]),
    executableYearlySavingsSar: num(merged, ["executableYearlySavingsSar", "executableYearlySar"]),
    blockedOpportunityMonthlySavingsSar: num(merged, [
      "blockedOpportunityMonthlySavingsSar",
      "blockedMonthlySavingsSar",
    ]),
    currentMonthlyRequestCostSar: num(merged, ["currentMonthlyRequestCostSar", "currentMonthlyCostSar"]),
    targetMonthlyRequestCostSar: num(merged, ["targetMonthlyRequestCostSar", "targetMonthlyCostSar"]),
    warnings: list(merged, ["warnings", "warning"]),
    hardBlockers: list(merged, ["hardBlockers", "blockers"]),
    approvedDeployments: list(merged, ["approvedDeployments", "approved"]),
    blockedDeployments: list(merged, ["blockedDeployments", "blocked"]),
    nextAction: str(merged, ["nextAction", "next_action", "recommendation"], "—"),
    completedAt: str(merged, ["completedAt", "completedTime", "finishedAt", "updatedAt", "createdAt"]),
    reportArtifact: artifact(merged),
  };
}

function toResourceGuard(input: unknown): ResourceGuardReport {
  const s = rec(input);
  const cost = rec(pick(s, ["cost", "savings", "financials"]));
  const merged = { ...cost, ...s };
  return {
    riskLevel: str(merged, ["riskLevel", "risk", "riskBadge"], "UNKNOWN"),
    repository: str(merged, ["repository", "repo"], "—"),
    commit: str(merged, ["commit", "commitSha", "sha"], "—"),
    service: str(merged, ["service", "serviceName"], "—"),
    environment: str(merged, ["environment", "env"], "—"),
    cluster: str(merged, ["cluster"], "—"),
    namespace: str(merged, ["namespace", "project"], "—"),
    deployment: str(merged, ["deployment", "workload"], "—"),
    changeDirection: str(merged, ["changeDirection", "direction", "change"], "—"),
    implementer: str(merged, ["implementer", "author", "committer"], "—"),
    generatedAt: str(merged, ["generatedAt", "generatedTime", "createdAt", "updatedAt"]),
    monthlySavingsSar: num(merged, ["monthlySavingsSar", "monthlySavings"]),
    yearlySavingsSar: num(merged, ["yearlySavingsSar", "yearlySavings"]),
    monthlyCostDeltaSar: num(merged, ["monthlyCostDeltaSar", "monthlyCostDelta", "monthlyIncreaseSar"]),
    yearlyCostDeltaSar: num(merged, ["yearlyCostDeltaSar", "yearlyCostDelta", "yearlyIncreaseSar"]),
    resourceDiff: list(merged, ["resourceDiff", "diff"]),
    suggestedSaferValues: list(merged, ["suggestedSaferValues", "saferValues", "suggestions"]),
    historicalEvidence: list(merged, ["historicalEvidence", "evidence", "history"]),
    councilFindings: list(merged, ["councilFindings", "aiCouncilFindings", "riskSources", "findings"]),
    runtimeObservation: list(merged, ["runtimeObservation", "runtimeObservations", "observations"]),
    recommendation: str(merged, ["recommendation", "advice", "nextAction"], "—"),
    reportArtifact: artifact(merged),
  };
}

function collection(body: unknown, keys: string[]): unknown[] {
  const parsed = EnvelopeSchema.safeParse(body);
  if (!parsed.success) return [];
  if (Array.isArray(parsed.data)) return parsed.data;
  const root = parsed.data;
  const found = pick(root, [...keys, "items", "data", "results", "records", "rows"]);
  if (Array.isArray(found)) return found;
  const nested = rec(found);
  if (Object.keys(nested).length > 0) return [nested];
  return Object.keys(root).length > 0 ? [root] : [];
}

function single(body: unknown, keys: string[]): unknown | null {
  const items = collection(body, keys);
  return items[0] ?? null;
}

/* ------------------------------------------------------------------ *
 * Requester session (authoritative, server-side cookie)
 * ------------------------------------------------------------------ */

export type RequesterSession = { requesterEmail: string | null; requesterDisplayName: string | null };

export const getPortalRequester = createServerFn({ method: "GET" }).handler(
  async (): Promise<RequesterSession> => {
    const { readPortalIdentity } = await import("./portal-session.server");
    const identity = await readPortalIdentity();
    return {
      requesterEmail: identity?.email ?? null,
      requesterDisplayName: identity?.displayName ?? null,
    };
  },
);

/* ------------------------------------------------------------------ *
 * Data server functions
 * ------------------------------------------------------------------ */

export const getLatestFullCycleReports = createServerFn({ method: "POST" }).handler(
  async (): Promise<PortalResult<FullCycleReport[]>> => {
    const { requirePortalIdentity } = await import("./portal-session.server");
    await requirePortalIdentity();
    const result = await callBackend({ action: "latest-full-cycles", limit: 5 });
    if (!result.ok) return { state: result.state, message: result.message, data: [] };
    const items = collection(result.body, ["fullCycles", "reports", "fullCycleReports"]);
    return { state: "ok", data: items.slice(0, 5).map(toFullCycle) };
  },
);

export const getLiveFullCycle = createServerFn({ method: "POST" }).handler(
  async (): Promise<PortalResult<FullCycleReport | null> & { requesterEmail: string | null }> => {
    // requesterEmail comes ONLY from the authenticated server session, never from the browser.
    const { readPortalIdentity } = await import("./portal-session.server");
    const identity = await readPortalIdentity();
    const requesterEmail = identity?.email ?? null;
    if (!requesterEmail) {
      return {
        state: "ok",
        data: null,
        requesterEmail: null,
        message: "Sign in to monitor your live optimization run.",
      };
    }

    const result = await callBackend({ action: "live-full-cycle", requesterEmail });
    if (!result.ok)
      return { state: result.state, message: result.message, data: null, requesterEmail };
    const item = single(result.body, ["fullCycle", "controller", "run"]);
    return { state: "ok", data: item ? toFullCycle(item) : null, requesterEmail };
  },
);

const ControllerInput = z.object({ controllerId: z.string().trim().min(1).max(200) });

export const getFullCycleByController = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ControllerInput.parse(input))
  .handler(async ({ data }): Promise<PortalResult<FullCycleReport | null>> => {
    const result = await callBackend({
      action: "full-cycle-by-controller",
      controllerId: data.controllerId,
    });
    if (!result.ok) return { state: result.state, message: result.message, data: null };
    const item = single(result.body, ["fullCycle", "controller", "run"]);
    return { state: "ok", data: item ? toFullCycle(item) : null };
  });

export const getLatestResourceGuardReports = createServerFn({ method: "POST" }).handler(
  async (): Promise<PortalResult<ResourceGuardReport[]>> => {
    const result = await callBackend({ action: "latest-resource-guards", limit: 5 });
    if (!result.ok) return { state: result.state, message: result.message, data: [] };
    const items = collection(result.body, ["resourceGuards", "reports", "guardReports"]);
    return { state: "ok", data: items.slice(0, 5).map(toResourceGuard) };
  },
);
