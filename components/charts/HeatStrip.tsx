"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { format, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export interface HeatStripDay {
  date: string; // ISO yyyy-mm-dd
  label: string; // "24"
  total: number;
}

const chartConfig = {
  total: { label: "Due", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function buildHeatStripData(dueDateTotals: Map<string, number>, today: Date = new Date()): HeatStripDay[] {
  const start = startOfDay(today);
  return Array.from({ length: 30 }, (_, i) => {
    const d = addDays(start, i);
    const iso = format(d, "yyyy-MM-dd");
    return { date: iso, label: format(d, "d"), total: dueDateTotals.get(iso) ?? 0 };
  });
}

export function HeatStrip({
  data,
  selectedDate,
  onSelectDate,
}: {
  data: HeatStripDay[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  return (
    <ChartContainer config={chartConfig} className="h-24 w-full">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} fontSize={10} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="total"
          radius={2}
          onClick={(entry) => {
            const day = (entry as unknown as { payload: HeatStripDay }).payload;
            onSelectDate(day.date === selectedDate ? null : day.date);
          }}
          className={cn("cursor-pointer")}
          fill="var(--color-total)"
        />
      </BarChart>
    </ChartContainer>
  );
}
