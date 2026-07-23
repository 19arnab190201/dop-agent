import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusLabel, statusDotClass } from "@/lib/derive";
import { formatINR, formatDateDisplay } from "@/lib/format";
import type { ClientRollup } from "@/lib/queries";

export function ClientCard({ rollup }: { rollup: ClientRollup }) {
  return (
    <Link href={`/clients/${rollup.client.id}`}>
      <Card className="gap-2 py-3">
        <CardContent className="flex flex-col gap-2 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium">{rollup.client.displayName}</div>
            <span className={`size-2 shrink-0 rounded-full ${statusDotClass(rollup.worst)}`} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Badge variant="secondary">{rollup.accounts.length} accounts</Badge>
            <span>{formatINR(rollup.totalMonthlyLiability)}/mo</span>
            {rollup.nearestDueDate && <span>· next due {formatDateDisplay(rollup.nearestDueDate)}</span>}
            <Badge variant="outline" className="ml-auto">
              {statusLabel(rollup.worst)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
