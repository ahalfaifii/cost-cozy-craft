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
            ? "Pilot access is not configured yet. Add PORTAL_APPROVED_USERS as a server-side secret."
            : "Those credentials are not on the approved pilot list.",
      };
    }
    await writePortalIdentity(check.email, check.displayName);
    return { ok: true, email: check.email, displayName: check.displayName };
  });

export const logoutPortalUser = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const { destroyPortalSession } = await import("./portal-session.server");
    await destroyPortalSession();
    return { ok: true };
  },
);
