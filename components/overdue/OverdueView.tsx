"use client";

import { useMemo, useState } from "react";
import { AccountCard } from "@/components/cards/AccountCard";
import { CollectSheet, type CollectTarget } from "@/components/sheets/CollectSheet";
import { ReminderSheet, reminderSheetKey, type ReminderTarget } from "@/components/sheets/ReminderSheet";
import { NoteDialog } from "@/components/dialogs/NoteDialog";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountWithClient } from "@/lib/queries";
import type { AccountStatus } from "@/lib/derive";
import type { TemplateLanguage, DEFAULT_TEMPLATES } from "@/lib/messages";

type Severity = "all" | "overdue1" | "overdue2-3" | "critical";

export function OverdueView({
  accounts,
  language = "en",
  templates,
}: {
  accounts: AccountWithClient[];
  language?: TemplateLanguage;
  templates?: typeof DEFAULT_TEMPLATES;
}) {
  const [severity, setSeverity] = useState<Severity>("all");
  const [collectTarget, setCollectTarget] = useState<CollectTarget | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [remindTarget, setRemindTarget] = useState<ReminderTarget | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const [noteClient, setNoteClient] = useState<{ id: string; name: string; note: string | null } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const overdue = useMemo(
    () => accounts.filter((a) => a.monthsOverdue > 0).sort((a, b) => b.monthsOverdue - a.monthsOverdue),
    [accounts]
  );

  const counts: Record<Exclude<Severity, "all">, number> = {
    overdue1: overdue.filter((a) => a.status === "overdue1").length,
    "overdue2-3": overdue.filter((a) => a.status === "overdue2-3").length,
    critical: overdue.filter((a) => a.status === "critical").length,
  };

  const filtered = severity === "all" ? overdue : overdue.filter((a) => a.status === (severity as AccountStatus));

  const commissionAtRisk = overdue.reduce((s, a) => s + a.expectedCommission, 0);

  function openCollect(account: AccountWithClient) {
    setCollectTarget({
      accountId: account.id,
      clientName: account.client.displayName,
      denomination: account.denomination,
      amountToClear: account.amountToClear,
      monthsOverdue: account.monthsOverdue,
    });
    setCollectOpen(true);
  }

  function openRecovery(account: AccountWithClient) {
    setRemindTarget({
      clientName: account.client.displayName,
      clientPhone: account.client.phone,
      amount: account.amountToClear,
      penalty: account.defaultFeeOwed,
      kind: "recovery",
    });
    setRemindOpen(true);
  }

  function openNote(account: AccountWithClient) {
    setNoteClient({ id: account.client.id, name: account.client.displayName, note: account.client.notes });
    setNoteOpen(true);
  }

  const chips: { key: Severity; label: string; count: number; colorClass: string }[] = [
    { key: "all", label: "All", count: overdue.length, colorClass: "" },
    { key: "overdue1", label: "1 month", count: counts.overdue1, colorClass: "border-yellow-500 text-yellow-600 dark:text-yellow-400" },
    { key: "overdue2-3", label: "2–3 months", count: counts["overdue2-3"], colorClass: "border-orange-500 text-orange-600 dark:text-orange-400" },
    { key: "critical", label: "4+ months", count: counts.critical, colorClass: "border-red-500 text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setSeverity(chip.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
              severity === chip.key ? "bg-accent" : "bg-background",
              chip.colorClass
            )}
          >
            {chip.label}
            <span className="rounded-full bg-muted px-1.5 tabular-nums">{chip.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No overdue accounts in this bucket. 🎉</p>
      )}

      {filtered.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          clientName={account.client.displayName}
          clientPhone={account.client.phone}
          onCollect={() => openCollect(account)}
          onRemind={() => openRecovery(account)}
          onNote={() => openNote(account)}
          extraInfo={
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{account.monthsOverdue} missed</span>
              <span>·</span>
              <span>fee {formatINR(account.defaultFeeOwed)}</span>
              {account.daysToDiscontinuation !== null && (
                <>
                  <span>·</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {account.daysToDiscontinuation}d to discontinuation
                  </span>
                </>
              )}
            </div>
          }
        />
      ))}

      <div className="sticky bottom-20 mt-2 rounded-lg border bg-background/95 p-3 text-sm backdrop-blur lg:bottom-4">
        <span className="text-muted-foreground">Commission at risk: </span>
        <span className="font-semibold text-red-600 dark:text-red-400">{formatINR(commissionAtRisk)}</span>
      </div>

      <CollectSheet target={collectTarget} open={collectOpen} onOpenChange={setCollectOpen} />
      <ReminderSheet
        key={reminderSheetKey(remindTarget)}
        target={remindTarget}
        open={remindOpen}
        onOpenChange={setRemindOpen}
        language={language}
        templates={templates}
      />
      <NoteDialog
        key={noteClient?.id ?? "none"}
        clientId={noteClient?.id ?? null}
        clientName={noteClient?.name}
        initialNote={noteClient?.note}
        open={noteOpen}
        onOpenChange={setNoteOpen}
      />
    </div>
  );
}
