"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { AccountWithClient, ClientRollup } from "@/lib/queries";
import type { CollectionEntry } from "@/db/schema";
import type { RdRules } from "@/config/rdRules";

const trendConfig = { commission: { label: "Commission earned", color: "var(--chart-1)" } } satisfies ChartConfig;
const denomColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function denominationBucket(denomination: number): string {
  if (denomination < 500) return "< ₹500";
  if (denomination < 1000) return "₹500–999";
  if (denomination < 3000) return "₹1,000–2,999";
  if (denomination < 5000) return "₹3,000–4,999";
  return "₹5,000+";
}

export function CommissionView({
  accounts,
  rollups,
  collections,
  rules,
}: {
  accounts: AccountWithClient[];
  rollups: ClientRollup[];
  collections: CollectionEntry[];
  rules: RdRules;
}) {
  const now = useMemo(() => new Date(), []);

  const projectedCommission = accounts
    .filter((a) => a.status !== "matured")
    .reduce((s, a) => s + a.expectedCommission, 0);

  const currentMonthKey = format(now, "yyyy-MM");
  const earnedThisMonth = collections
    .filter((c) => c.date.startsWith(currentMonthKey))
    .reduce((s, c) => s + Number(c.amount) * rules.agentCommissionRate, 0);

  const lostToDefaults = accounts
    .filter((a) => a.monthsOverdue > 0)
    .reduce((s, a) => s + a.amountToClear * rules.agentCommissionRate, 0);

  const trend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
    return months.map((m) => {
      const key = format(m, "yyyy-MM");
      const total = collections.filter((c) => c.date.startsWith(key)).reduce((s, c) => s + Number(c.amount), 0);
      return { month: format(m, "MMM"), commission: Math.round(total * rules.agentCommissionRate) };
    });
  }, [collections, now, rules.agentCommissionRate]);

  const topClients = useMemo(
    () =>
      [...rollups]
        .sort((a, b) => b.totalMonthlyLiability - a.totalMonthlyLiability)
        .slice(0, 10)
        .map((r) => ({ ...r, commission: r.totalMonthlyLiability * rules.agentCommissionRate })),
    [rollups, rules.agentCommissionRate]
  );

  const denomMix = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const a of accounts) {
      buckets.set(denominationBucket(a.denomination), (buckets.get(denominationBucket(a.denomination)) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <SummaryCard icon={TrendingUp} label="Projected (book)" value={formatINR(projectedCommission)} />
        <SummaryCard icon={Wallet} label="Earned this month" value={formatINR(earnedThisMonth)} accentClassName="text-emerald-500" />
        <SummaryCard icon={AlertTriangle} label="Lost to defaults" value={formatINR(lostToDefaults)} accentClassName="text-red-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">6-month commission trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-48 w-full">
            <BarChart data={trend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="commission" fill="var(--color-commission)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Denomination mix</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="mx-auto h-48 w-full max-w-64">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={denomMix} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                {denomMix.map((_, i) => (
                  <Cell key={i} fill={denomColors[i % denomColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {denomMix.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: denomColors[i % denomColors.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top clients by commission</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Commission/mo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.map((c) => (
                <TableRow key={c.client.id}>
                  <TableCell>{c.client.displayName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(c.commission)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
