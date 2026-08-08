import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, FileSpreadsheet, Gauge, ServerCog } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FULL_CYCLE_COMPLETED_EVENT, humanLabel, sar, verdictClass } from "@/lib/portal-format";
import type { FullCycleReport } from "@/lib/portal.functions";
import {
  pollCopilotActivities,
  sendCopilotMessage,
  startCopilotConversation,
  type CopilotActivity,
} from "@/lib/copilot.functions";


const SUGGESTIONS = [
  "how much can we save for nafath?",
  "what happened for runid: multicluster-nafath-20260803142148",
  "run a dry-run savings assessment for iam2",
];

/** Turns raw Copilot Studio error codes into guidance the committee can act on. */
function explain(text: string): string {
  if (text.includes("IntegratedAuthenticationNotSupportedInChannel")) {
    return "The agent is set to Microsoft (integrated) authentication, which only works inside Teams. In Copilot Studio open Settings → Security → Authentication, switch to “No authentication” (or manual Entra auth), then publish again.";
  }
  if (text.includes("AuthenticationNotConfigured")) {
    return "The agent is set to “Authenticate manually” but no identity provider is filled in, so Copilot Studio rejects every turn. In Copilot Studio open Settings → Security → Authentication and pick “No authentication” (leaving nothing half-configured), save, then Publish again. If you must keep manual auth, complete the Entra ID app registration fields (client ID, secret, tenant, scopes) before publishing.";
  }
  if (text.includes("LatestPublishedVersionNotFound")) {
    return "The agent has not been published yet. In Copilot Studio choose Publish, then retry here.";
  }
  return text;

}

export function CopilotChat() {
  const start = useServerFn(startCopilotConversation);
  const send = useServerFn(sendCopilotMessage);
  const poll = useServerFn(pollCopilotActivities);

  const [messages, setMessages] = useState<CopilotActivity[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FullCycleReport[]>([]);
  const [requesterEmail, setRequesterEmail] = useState<string | null>(null);


  const session = useRef<{ conversationId: string; token: string } | null>(null);
  const watermark = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const connect = useMutation({
    mutationFn: () => start(),
    onSuccess: (result) => {
      if (!result.connected) {
        setError(result.reason ?? "The copilot is not reachable.");
        return;
      }
      session.current = { conversationId: result.conversationId, token: result.token };
      setRequesterEmail(result.requesterEmail);
      setError(null);
    },

    onError: () => setError("Could not reach the copilot backend."),
  });

  const connectRef = useRef(connect.mutate);
  connectRef.current = connect.mutate;

  useEffect(() => {
    connectRef.current();
  }, []);

  const drain = useCallback(async () => {
    if (!session.current) return;
    const result = await poll({
      data: {
        conversationId: session.current.conversationId,
        token: session.current.token,
        watermark: watermark.current,
      },
    });
    watermark.current = result.watermark;
    if (result.error) {
      setError(result.error);
      return;
    }
    const fresh = result.activities.filter((activity) => !seen.current.has(activity.id));
    if (fresh.length === 0) return;
    fresh.forEach((activity) => seen.current.add(activity.id));
    setMessages((previous) => [...previous, ...fresh]);
    if (fresh.some((activity) => activity.from === "bot")) setWaiting(false);
  }, [poll]);

  useEffect(() => {
    const id = setInterval(() => {
      void drain();
    }, 2000);
    return () => clearInterval(id);
  }, [drain]);

  const submit = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) return;
      if (!session.current) {
        setError("The copilot is not connected yet. Please retry in a moment.");
        return;
      }
      setInput("");
      setWaiting(true);
      setError(null);
      const result = await send({
        data: {
          conversationId: session.current.conversationId,
          token: session.current.token,
          text: value,
        },
      });
      if (!result.ok) {
        setWaiting(false);
        setError(result.error ?? "The copilot could not accept the message.");
        return;
      }
      void drain();
      textareaRef.current?.focus();
    },
    [drain, send],
  );

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // The portal itself surfaces completed Full Cycle results; nothing is posted back to Direct Line.
  useEffect(() => {
    function onCompleted(event: Event) {
      const report = (event as CustomEvent<FullCycleReport>).detail;
      if (!report) return;
      setResults((previous) =>
        previous.some((item) => item.controllerId === report.controllerId)
          ? previous
          : [...previous, report],
      );
    }
    window.addEventListener(FULL_CYCLE_COMPLETED_EVENT, onCompleted);
    return () => window.removeEventListener(FULL_CYCLE_COMPLETED_EVENT, onCompleted);
  }, []);


  return (
    <Card className="flex h-[620px] flex-col overflow-hidden border-border bg-surface shadow-panel">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="rounded-md border border-border bg-background p-2">
          <ServerCog className="size-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-foreground">
            OpenShift_MultiCluster_Supervisor
          </p>
          <p className="text-xs text-muted-foreground">
            {error
              ? "Not connected"
              : session.current
                ? "Connected · dry-run, read-only"
                : "Connecting…"}
          </p>
        </div>
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 && !error ? (
            <div className="space-y-4 py-6">
              <p className="text-sm text-muted-foreground">
                Ask about a service and the supervisor will start a read-only savings assessment,
                report the run ID, and follow up with the final CPU and RAM savings.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submit(suggestion)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <Message key={message.id} from={message.from === "user" ? "user" : "assistant"}>
              <MessageContent>
                <MessageResponse>{explain(message.text)}</MessageResponse>
              </MessageContent>
            </Message>
          ))}

          {results.map((report) => (
            <motion.div
              key={report.controllerId || report.runId}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
            >
              <Card className="border-primary/40 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Gauge className="size-4 text-primary" aria-hidden="true" />
                  <p className="font-display text-sm font-semibold">Full Cycle result</p>
                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                    Generated by the portal
                  </Badge>
                  <Badge variant="outline" className={`ml-auto ${verdictClass(report.aiCouncilVerdict)}`}>
                    {humanLabel(report.aiCouncilVerdict)}
                  </Badge>
                </div>
                <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Service</dt>
                    <dd className="mt-0.5 font-mono">{report.service}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">AI Council verdict</dt>
                    <dd className="mt-0.5 font-mono">{report.aiCouncilVerdict}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Executable monthly savings</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-primary">
                      {sar(report.executableMonthlySavingsSar)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Executable yearly savings</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-primary">
                      {sar(report.executableYearlySavingsSar)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Approved deployments</dt>
                    <dd className="mt-0.5 font-mono">{report.approvedDeploymentCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Blocked deployments</dt>
                    <dd className="mt-0.5 font-mono">{report.blockedDeploymentCount}</dd>
                  </div>
                </dl>
                {report.reportArtifact ? (
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <a href={report.reportArtifact.url} target="_blank" rel="noreferrer">
                        <FileSpreadsheet className="size-4" aria-hidden="true" />
                        Open Excel Report
                      </a>
                    </Button>
                  </div>
                ) : null}
              </Card>
            </motion.div>
          ))}


          {waiting ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Assessing workloads…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}

          {error ? (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-4">
        <PromptInput
          onSubmit={(_message, event) => {
            event.preventDefault();
            void submit(input);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={2000}
            placeholder="Ask a question or describe what you need"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={waiting ? "submitted" : "ready"} disabled={!input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </Card>
  );
}
