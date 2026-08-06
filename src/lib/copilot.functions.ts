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
  reason?: string;
};

type DirectLineActivity = {
  id?: string;
  type?: string;
  text?: string;
  from?: { id?: string; role?: string };
};

function readSecret() {
  return process.env["COPILOT_DIRECTLINE_SECRET"]?.trim();
}

/** Opens a Direct Line conversation with the Copilot Studio agent. */
export const startCopilotConversation = createServerFn({ method: "POST" }).handler(
  async (): Promise<CopilotSession> => {
    const secret = readSecret();
    if (!secret) {
      return {
        connected: false,
        conversationId: "",
        token: "",
        watermark: null,
        reason:
          "The copilot connection is not configured yet. Add the Direct Line secret from Copilot Studio to connect this agent.",
      };
    }

    const res = await fetch(`${DIRECT_LINE_BASE}/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      return {
        connected: false,
        conversationId: "",
        token: "",
        watermark: null,
        reason: `The copilot rejected the connection (status ${res.status}). Please verify the Direct Line secret.`,
      };
    }

    const body = (await res.json()) as { conversationId?: string; token?: string };
    if (!body.conversationId || !body.token) {
      return {
        connected: false,
        conversationId: "",
        token: "",
        watermark: null,
        reason: "The copilot did not return a conversation. Please try again.",
      };
    }

    return {
      connected: true,
      conversationId: body.conversationId,
      token: body.token,
      watermark: null,
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
