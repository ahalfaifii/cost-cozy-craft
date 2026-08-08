import { createHash, timingSafeEqual } from "node:crypto";
import {
  getCookie,
  getRequestHeader,
  getRequestUrl,
  useSession,
} from "@tanstack/react-start/server";

/** Safe identity kept in the signed, HttpOnly session cookie. */
export type PortalSessionData = {
  email?: string;
  displayName?: string;
  authenticated?: boolean;
};

export type PortalIdentity = {
  email: string;
  displayName: string;
  authenticated: true;
};

function isHttps(): boolean {
  try {
    const forwarded = getRequestHeader("x-forwarded-proto");
    if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
    return getRequestUrl().protocol === "https:";
  } catch {
    return true;
  }
}

function sessionConfig() {
  const password = process.env["PORTAL_SESSION_SECRET"]?.trim();
  if (!password) {
    throw new Error("PORTAL_SESSION_SECRET is not configured.");
  }
  // Over HTTPS the portal can be rendered inside an embedded preview frame — a
  // cross-site context where SameSite=Lax cookies are dropped — so the session
  // cookie must be None + Secure there. Plain-HTTP local dev cannot send
  // Secure cookies, so it falls back to Lax.
  const https = isHttps();
  return {
    password,
    name: "portal-session",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      sameSite: https ? ("none" as const) : ("lax" as const),
      secure: https,
      path: "/",
    },
  };
}

export function isSessionConfigured(): boolean {
  return Boolean(process.env["PORTAL_SESSION_SECRET"]?.trim());
}

export function approvedUserCount(): number {
  return readApprovedUsers()?.length ?? 0;
}

/** Reads the authenticated identity, or null. Never throws for anonymous users. */
export async function readPortalIdentity(): Promise<PortalIdentity | null> {
  // Important: useSession() issues a brand-new empty sealed cookie when none can
  // be read, which would clobber a session cookie that was just written by a
  // concurrent login request. Read-only checks therefore bail out first when no
  // session cookie is present on the request.
  if (!getCookie("portal-session")) return null;
  const session = await useSession<PortalSessionData>(sessionConfig());
  const data = session.data;
  if (!data?.authenticated || !data.email) return null;

  return {
    email: data.email,
    displayName: data.displayName ?? data.email,
    authenticated: true,
  };
}

/** Server-side guard for any portal server function. */
export async function requirePortalIdentity(): Promise<PortalIdentity> {
  const identity = await readPortalIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export async function writePortalIdentity(email: string, displayName: string): Promise<void> {
  const session = await useSession<PortalSessionData>(sessionConfig());
  await session.update({ email, displayName, authenticated: true });
}

export async function destroyPortalSession(): Promise<void> {
  const session = await useSession<PortalSessionData>(sessionConfig());
  await session.clear();
}

type ApprovedUser = { email: string; displayName?: string; password: string };

function readApprovedUsers(): ApprovedUser[] | null {
  const raw = process.env["PORTAL_APPROVED_USERS"]?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item): item is ApprovedUser =>
        !!item &&
        typeof item === "object" &&
        typeof (item as ApprovedUser).email === "string" &&
        typeof (item as ApprovedUser).password === "string",
    );
  } catch {
    return null;
  }
}

function matches(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

export type CredentialCheck =
  | { ok: true; email: string; displayName: string }
  | { ok: false; reason: "not-configured" | "invalid" };

/**
 * Validates credentials against PORTAL_APPROVED_USERS.
 * Passwords are compared server-side only and are never returned.
 */
export function verifyPortalCredentials(email: string, password: string): CredentialCheck {
  const users = readApprovedUsers();
  if (!users || users.length === 0) return { ok: false, reason: "not-configured" };

  const normalized = email.trim().toLowerCase();
  let found: ApprovedUser | null = null;
  for (const user of users) {
    if (user.email.trim().toLowerCase() === normalized) found = user;
  }
  if (!found || !matches(password, found.password)) return { ok: false, reason: "invalid" };

  return {
    ok: true,
    email: found.email.trim().toLowerCase(),
    displayName: (found.displayName ?? "").trim() || found.email.trim(),
  };
}
