import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Flame } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { askAboutService, rankOpportunities } from "@/lib/impact";
import { humanLabel, sar, verdictClass } from "@/lib/portal-format";
import { getLatestFullCycleReports } from "@/lib/portal.functions";

export function TopOpportunities() {
  const fetchCycles = useServerFn(getLatestFullCycleReports);
  const cycles = useQuery({
    queryKey: ["portal-full-cycles"],
    queryFn: () => fetchCycles(),
    refetchInterval: 30_000,
  });

  const opportunities = rankOpportunities(cycles.data?.data ?? []);
  const max = Math.max(...opportunities.map((item) => item.yearlySar || item.rawYearlySar), 1);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Flame className="size-4 text-warning" aria-hidden="true" />
            Top optimization opportunities
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Services ranked by the savings the agent found. Select one to ask the advisor about it.
          </p>
        </div>
        {opportunities.length > 0 ? (
          <Badge variant="outline" className="border-primary/40 text-primary">
            {opportunities.length} services ranked
          </Badge>
        ) : null}
      </div>

      {cycles.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No completed assessments yet — the ranking fills in from live analysis as soon as the agent
          finishes its first Full Cycle run.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {opportunities.map((item, index) => {
            const value = item.yearlySar || item.rawYearlySar;
            const width = Math.max(6, Math.round((value / max) * 100));
            return (
              <motion.li
                key={item.service}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
              >
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => askAboutService(item.service)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      askAboutService(item.service);
                    }
                  }}
                  className="group cursor-pointer overflow-hidden border-border bg-surface p-4 transition-colors hover:border-primary/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background font-mono text-[11px] text-muted-foreground">
                        {index + 1}
                      </span>
                      <p className="truncate font-mono text-sm text-foreground">{item.service}</p>
                      {item.verdict && item.verdict !== "—" ? (
                        <Badge variant="outline" className={verdictClass(item.verdict)}>
                          {humanLabel(item.verdict)}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-semibold tabular-nums text-primary">
                        {value > 0 ? `${sar(value)} / year` : "Coming from live analysis"}
                      </p>
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${width}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {item.sizing.length > 0 ? (
                      item.sizing.map((pair) => (
                        <span key={pair.label} className="font-mono">
                          {pair.label}: {pair.current} → {pair.recommended}
                        </span>
                      ))
                    ) : (
                      <span>Sizing detail available in the run report</span>
                    )}
                    {item.reductionPercent !== null ? (
                      <span className="text-success">
                        {item.reductionPercent}% request cost reduction
                      </span>
                    ) : null}
                    {item.monthlySar > 0 ? <span>{sar(item.monthlySar)} / month</span> : null}
                  </div>
                </Card>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
