import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createLovableResponsesProvider } from "./ai-gateway.server";

const ReportSchema = z.object({
  service: z.string(),
  namespace: z.string(),
  verdict: z.enum(["savings-available", "already-optimized", "needs-more-data"]),
  confidence: z.number(),
  estimatedMonthlySavingsUsd: z.number(),
  summary: z.string(),
  current: z.object({ cpuRequest: z.string(), memoryRequest: z.string(), replicas: z.number() }),
  recommended: z.object({ cpuRequest: z.string(), memoryRequest: z.string(), replicas: z.number() }),
  utilization: z.object({ cpuP95Percent: z.number(), memoryP95Percent: z.number() }),
  pullRequests: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      resourceRelated: z.boolean(),
      decision: z.string(),
    }),
  ),
  findings: z.array(z.object({ title: z.string(), detail: z.string(), severity: z.string() })),
  nextSteps: z.array(z.string()),
});

export type CostReport = z.infer<typeof ReportSchema>;

const SYSTEM_PROMPT = `You are the OpenShift Cost Optimization Copilot for an internal FinOps platform.
You analyse a free-text question about a service running on OpenShift and produce a right-sizing report.
Scope is strictly CPU and RAM requests/limits and replica counts — never storage, network or licensing.

Rules:
- Infer the service name and a plausible OpenShift namespace/project from the user's text.
- You review recently merged pull requests and classify each as resource-related (touching requests/limits, HPA, replicas, JVM heap, container resources) or not. Non resource-related PRs are skipped with a short reason.
- Recommend CPU (millicores, e.g. "250m") and memory (e.g. "512Mi") requests based on P95 utilisation with a safety headroom of about 30%.
- Keep summary under 60 words. Each finding detail under 30 words. At most 5 pull requests, 4 findings, 4 next steps.
- confidence is 0-100. estimatedMonthlySavingsUsd is a plain number in USD.
- If the text gives no service to analyse, use verdict "needs-more-data" and explain what is missing.
This is a demo environment: when live telemetry is unavailable, produce realistic representative figures.`;

export const analyzeService = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ question: z.string().min(3).max(1000) }).parse(input))
  .handler(async ({ data }): Promise<CostReport> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const gateway = createLovableResponsesProvider(key);

    try {
      const result = streamText({
        model: gateway("openai/gpt-5.6-sol"),
        system: SYSTEM_PROMPT,
        prompt: data.question,
        output: Output.object({ schema: ReportSchema }),
      });
      return await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const text = error.text ?? "";
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = ReportSchema.safeParse(JSON.parse(match[0]));
          if (parsed.success) return parsed.data;
        }
      }
      throw error;
    }
  });
