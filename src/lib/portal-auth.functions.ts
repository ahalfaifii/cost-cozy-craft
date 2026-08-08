import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PortalSessionState = {
  authenticated: boolean;
  email: string | null;
  displayName: string | null;
};

export const getPortalSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<PortalSessionState> => {
    const { readPortalIdentity } = await import("./portal-session.server");
    const identity = await readPortalIdentity();
    if (!identity) return { authenticated: false, email: null, displayName: null };
    return {
      authenticated: true,
      email: identity.email,
      displayName: identity.displayName,
    };
  },
);

const LoginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export type LoginResult =
  | { ok: true; email: string; displayName: string }
  | { ok: false; message: string };

export const loginPortalUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LoginInput.parse(input))
  .handler(async ({ data }): Promise<LoginResult> => {
    const { verifyPortalCredentials, writePortalIdentity } = await import(
      "./portal-session.server"
    );
    const check = verifyPortalCredentials(data.email, data.password);
    if (!check.ok) {
      return {
        ok: false,
        message:
          check.reason === "not-configured"
            ? "Portal approved users are not configured."
            : "Invalid email or password.",
      };
    }
    try {
      await writePortalIdentity(check.email, check.displayName);
    } catch {
      // No stack traces or secret values are surfaced to the browser.
      return { ok: false, message: "Unable to create your portal session." };
    }
    return { ok: true, email: check.email, displayName: check.displayName };
  });

export type PortalAuthDiagnostics = {
  approvedUsersConfigured: boolean;
  approvedUserCount: number;
  sessionConfigurationReady: boolean;
  loginHandlerReachable: boolean;
};

/** Temporary, non-sensitive diagnostics: no emails, passwords, hashes or cookies. */
export const getPortalAuthDiagnostics = createServerFn({ method: "GET" }).handler(
  async (): Promise<PortalAuthDiagnostics> => {
    const { approvedUserCount, isSessionConfigured } = await import("./portal-session.server");
    const count = approvedUserCount();
    return {
      approvedUsersConfigured: count > 0,
      approvedUserCount: count,
      sessionConfigurationReady: isSessionConfigured(),
      loginHandlerReachable: typeof loginPortalUser === "function",
    };
  },
);


export const logoutPortalUser = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { destroyPortalSession } = await import("./portal-session.server");
    await destroyPortalSession();
    return { ok: true };
  },
);
