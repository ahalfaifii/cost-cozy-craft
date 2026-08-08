import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DIRECT_LINE_BASE = "https://directline.botframework.com/v3/directline";

export type CopilotActivity = {
  id: string;
  from: "user" | "bot";
  text: string;
};

export type CopilotSession = {
  connected: boolean;
  conversationId: string;
  token: string;
  watermark: string | null;
  /** Authenticated requester, derived server-side from the portal session only. */
  requesterEmail: string;
  reason?: string;
  diagnostics: CopilotConnectDiagnostics;
};

export type CopilotConnectDiagnostics = {
  portalSessionFound: boolean;
  requesterContextPrepared: boolean;
  directLineConversationCreated: boolean;
  pvaSetContextDelivered: boolean;
};

type DirectLineActivity = {
  id?: string;
  type?: string;
  text?: string;
  from?: { id?: string; role?: string };
};

/** Server-only read of the Direct Line secret. Never returned to the client. */
function readSecret() {
  return process.env["COPILOT_DIRECTLINE_SECRET"]?.trim();
}

const EMPTY_DIAGNOSTICS: CopilotConnectDiagnostics = {
  portalSessionFound: false,
  requesterContextPrepared: false,
  directLineConversationCreated: false,
  pvaSetContextDelivered: false,
};

function failed(reason: string, diagnostics: CopilotConnectDiagnostics): CopilotSession {
  return {
    connected: false,
    conversationId: "",
    token: "",
    watermark: null,
    requesterEmail: "",
    reason,
    diagnostics,
  };
}

/** Opens a Direct Line conversation with the Copilot Studio agent. */
export const startCopilotConversation = createServerFn({ method: "POST" }).handler(
  async (): Promise<CopilotSession> => {
    const { requirePortalIdentity } = await import("./portal-session.server");
    // Fail closed: no authenticated portal session means no Direct Line conversation.
    const identity = await requirePortalIdentity();
    const diagnostics: CopilotConnectDiagnostics = {
      ...EMPTY_DIAGNOSTICS,
      portalSessionFound: true,
    };

    // The requester context is built exclusively from the signed server session.
    const requesterContext = {
      RequesterEmail: identity.email,
      RequesterDisplayName: identity.displayName,
      PortalAuthenticated: "true",
    };
    diagnostics.requesterContextPrepared = Boolean(requesterContext.RequesterEmail);
    if (!diagnostics.requesterContextPrepared) {
      return failed(
        "Authenticated requester context could not be provided to the Supervisor Agent.",
        diagnostics,
      );
    }

    const secret = readSecret();
    if (!secret) {
      return failed(
        "COPILOT_DIRECTLINE_SECRET is not configured. Add the Direct Line secret from Copilot Studio as a server-side secret to connect this agent.",
        diagnostics,
      );
    }

    const res = await fetch(`${DIRECT_LINE_BASE}/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      return failed(
        `The copilot rejected the connection (status ${res.status}). Please verify the Direct Line secret.`,
        diagnostics,
      );
    }

    const body = (await res.json()) as { conversationId?: string; token?: string };
    if (!body.conversationId || !body.token) {
      return failed("The copilot did not return a conversation. Please try again.", diagnostics);
    }
    diagnostics.directLineConversationCreated = true;

    // Hand the authenticated identity to the agent before any user turn.
    try {
      const contextRes = await fetch(
        `${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(body.conversationId)}/activities`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${body.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "event",
            name: "pvaSetContext",
            from: { id: "portal-user" },
            value: requesterContext,
          }),
        },
      );
      diagnostics.pvaSetContextDelivered = contextRes.ok;
    } catch {
      diagnostics.pvaSetContextDelivered = false;
    }

    if (!diagnostics.pvaSetContextDelivered) {
      // Fail closed rather than letting the agent run without a verified requester.
      return failed(
        "Authenticated requester context could not be provided to the Supervisor Agent.",
        diagnostics,
      );
    }

    return {
      connected: true,
      conversationId: body.conversationId,
      token: body.token,
      watermark: null,
      requesterEmail: identity.email,
      diagnostics,
    };
  },
);


const SendInput = z.object({
  conversationId: z.string().min(1),
  token: z.string().min(1),
  text: z.string().min(1).max(2000),
});

/** Posts the user's text to the copilot conversation. */
export const sendCopilotMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requirePortalIdentity } = await import("./portal-session.server");
    await requirePortalIdentity();
    const res = await fetch(
      `${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(data.conversationId)}/activities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "message",
          from: { id: "web-user" },
          text: data.text,
        }),
      },
    );

    if (!res.ok) {
      return { ok: false, error: `The copilot could not accept the message (status ${res.status}).` };
    }
    return { ok: true };
  });

const PollInput = z.object({
  conversationId: z.string().min(1),
  token: z.string().min(1),
  watermark: z.string().nullable(),
});

/** Reads new activities from the copilot since the given watermark. */
export const pollCopilotActivities = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PollInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ activities: CopilotActivity[]; watermark: string | null; error?: string }> => {
      const { requirePortalIdentity } = await import("./portal-session.server");
      await requirePortalIdentity();
      const query = data.watermark ? `?watermark=${encodeURIComponent(data.watermark)}` : "";
      const res = await fetch(
        `${DIRECT_LINE_BASE}/conversations/${encodeURIComponent(data.conversationId)}/activities${query}`,
        { headers: { Authorization: `Bearer ${data.token}` } },
      );

      if (!res.ok) {
        return {
          activities: [],
          watermark: data.watermark,
          error: `The copilot connection dropped (status ${res.status}).`,
        };
      }

      const body = (await res.json()) as {
        activities?: DirectLineActivity[];
        watermark?: string;
      };

      const activities: CopilotActivity[] = (body.activities ?? [])
        .filter((activity) => activity.type === "message" && (activity.text ?? "").trim().length > 0)
        .map((activity, index) => ({
          id: activity.id ?? `${data.conversationId}-${index}`,
          from: activity.from?.id === "web-user" ? ("user" as const) : ("bot" as const),
          text: (activity.text ?? "").trim(),
        }));

      return { activities, watermark: body.watermark ?? data.watermark };
    },
  );
