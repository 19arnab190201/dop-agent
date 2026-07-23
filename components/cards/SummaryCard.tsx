import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  accentClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  accentClassName?: string;
}) {
  const content = (
    <Card className="min-w-44 shrink-0 gap-2 py-3">
      <CardContent className="flex flex-col gap-1 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={cn("size-4", accentClassName)} />
          {label}
        </div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
