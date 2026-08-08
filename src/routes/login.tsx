import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Cpu, Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPortalAuthDiagnostics,
  getPortalSession,
  loginPortalUser,
  type PortalAuthDiagnostics,
} from "@/lib/portal-auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Portal sign in — OpenShift Cost Copilot" },
      {
        name: "description",
        content:
          "Approved pilot users sign in to the OpenShift Cost Copilot portal to monitor Full Cycle optimization runs and Resource Guard reviews.",
      },
      { property: "og:title", content: "Portal sign in — OpenShift Cost Copilot" },
      {
        property: "og:description",
        content: "Restricted pilot access to the OpenShift cost optimization portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const session = await getPortalSession();
    if (session.authenticated) throw redirect({ to: "/" });
  },
  component: Login,
});

function Login() {
  const login = useServerFn(loginPortalUser);
  const diagnose = useServerFn(getPortalAuthDiagnostics);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [diag, setDiag] = useState<PortalAuthDiagnostics | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await login({ data: { email: email.trim(), password } });
      if (result.ok) {
        setPassword("");
        // Full document load so the freshly issued HttpOnly session cookie is
        // used for the protected route's server-side guard.
        window.location.assign("/");
        return;
      }
      setError(result.message);
      setPending(false);
    } catch {
      setError("Sign in could not be completed. Please try again.");
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 grid-backdrop opacity-40"
        aria-hidden="true"
      />
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <Card className="relative w-full max-w-sm border-border bg-surface p-7 shadow-panel">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-border bg-background p-1.5">
            <Cpu className="size-4 text-primary" aria-hidden="true" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight">
            OpenShift Cost Copilot
          </span>
        </div>

        <h1 className="mt-6 text-xl font-semibold">Pilot portal sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Access is limited to approved pilot users. Your identity is used to resolve your live
          optimization run.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="portal-email">Work email</Label>
            <Input
              id="portal-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your.name@elm.sa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portal-password">Password</Label>
            <Input
              id="portal-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LockKeyhole className="size-4" aria-hidden="true" />
            )}
            Enter the portal
          </Button>
        </form>

        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            className="text-[11px] uppercase tracking-wide text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              void diagnose().then(setDiag);
            }}
          >
            Run access diagnostics
          </button>
          {diag ? (
            <dl className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>approvedUsersConfigured</dt>
                <dd>{String(diag.approvedUsersConfigured)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>approvedUserCount</dt>
                <dd>{diag.approvedUserCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>sessionConfigurationReady</dt>
                <dd>{String(diag.sessionConfigurationReady)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>loginHandlerReachable</dt>
                <dd>{String(diag.loginHandlerReachable)}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
