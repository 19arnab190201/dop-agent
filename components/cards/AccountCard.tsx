"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Phone, NotebookPen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DerivedAccount } from "@/lib/derive";
import { statusLabel, statusDotClass } from "@/lib/derive";
import { formatINR, formatDateDisplay } from "@/lib/format";
import { buildTelLink } from "@/lib/messages";
import { cn } from "@/lib/utils";

export function AccountCard({
  account,
  clientName,
  clientPhone,
  onCollect,
  onRemind,
  onNote,
  extraInfo,
  className,
}: {
  account: DerivedAccount;
  clientName: string;
  clientPhone?: string | null;
  onCollect?: (account: DerivedAccount) => void;
  onRemind?: (account: DerivedAccount) => void;
  onNote?: (account: DerivedAccount) => void;
  extraInfo?: ReactNode;
  className?: string;
}) {
  const amount = account.monthsOverdue > 0 ? account.amountToClear : account.denomination;
  const router = useRouter();

  function openDetail() {
    router.push(`/accounts/${account.id}`);
  }

  return (
    <Card
      className={cn("cursor-pointer gap-2 py-3", className)}
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail();
        }
      }}
    >
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium">{clientName}</div>
          <div className="flex items-center gap-1.5 text-right">
            <span className="font-semibold tabular-nums">{formatINR(amount)}</span>
            <span className={cn("size-2 shrink-0 rounded-full", statusDotClass(account.status))} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>…{account.id.slice(-4)}</span>
          <span>·</span>
          <span>month {account.monthsPaid}</span>
          {account.nextDueDate && (
            <>
              <span>·</span>
              <span>due {formatDateDisplay(account.nextDueDate)}</span>
            </>
          )}
          {account.isExtended && (
            <>
              <span>·</span>
              <span className="text-blue-600 dark:text-blue-400">extended +{account.monthsBeyondMaturity}mo</span>
            </>
          )}
          <Badge variant="outline" className="ml-auto">
            {statusLabel(account.status)}
          </Badge>
        </div>
        {extraInfo}
        <div className="mt-1 grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="default" onClick={() => onCollect?.(account)}>
            <CheckCircle2 />
            Collect
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRemind?.(account)}>
            <MessageCircle />
            Remind
          </Button>
          {onNote ? (
            <Button size="sm" variant="outline" onClick={() => onNote(account)}>
              <NotebookPen />
              Note
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!clientPhone}
              render={<a href={clientPhone ? buildTelLink(clientPhone) : undefined} />}
            >
              <Phone />
              Call
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
