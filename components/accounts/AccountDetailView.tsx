"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Phone, MessageCircle, Pencil, Wallet, AlertCircle, CalendarClock, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { CollectSheet, type CollectTarget } from "@/components/sheets/CollectSheet";
import { ReminderSheet, reminderSheetKey, type ReminderTarget } from "@/components/sheets/ReminderSheet";
import { statusLabel, statusDotClass, maturityFlagLabel } from "@/lib/derive";
import { formatINR, formatDateDisplay } from "@/lib/format";
import { buildTelLink } from "@/lib/messages";
import { updateAccountDetails } from "@/lib/actions";
import { RD_RULES } from "@/config/rdRules";
import type { AccountWithClient } from "@/lib/queries";
import type { CollectionEntry } from "@/db/schema";
import type { TemplateLanguage, DEFAULT_TEMPLATES } from "@/lib/messages";

export function AccountDetailView({
  account,
  history,
  language = "en",
  templates,
}: {
  account: AccountWithClient;
  history: CollectionEntry[];
  language?: TemplateLanguage;
  templates?: typeof DEFAULT_TEMPLATES;
}) {
  const { client } = account;
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [rateDraft, setRateDraft] = useState(account.interestRate.toString());
  const [openingDateDraft, setOpeningDateDraft] = useState(account.openingDate ?? "");
  const [collectTarget, setCollectTarget] = useState<CollectTarget | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [remindTarget, setRemindTarget] = useState<ReminderTarget | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);

  const flag = maturityFlagLabel(account);

  function startEditing() {
    setRateDraft(account.interestRate.toString());
    setOpeningDateDraft(account.openingDate ?? "");
    setEditing(true);
  }

  function saveDetails() {
    const parsedRate = parseFloat(rateDraft);
    startTransition(async () => {
      await updateAccountDetails(account.id, {
        interestRate: Number.isNaN(parsedRate) ? undefined : parsedRate,
        openingDate: openingDateDraft || null,
      });
      toast.success("Account details saved");
      setEditing(false);
    });
  }

  function openCollect() {
    setCollectTarget({
      accountId: account.id,
      clientName: client.displayName,
      denomination: account.denomination,
      amountToClear: account.amountToClear,
      monthsOverdue: account.monthsOverdue,
    });
    setCollectOpen(true);
  }

  function openRemind() {
    setRemindTarget({
      clientName: client.displayName,
      clientPhone: client.phone,
      amount: account.monthsOverdue > 0 ? account.amountToClear : account.denomination,
      dueDate: account.nextDueDate,
      penalty: account.defaultFeeOwed,
      kind: account.monthsOverdue > 0 ? "recovery" : "reminder",
    });
    setRemindOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href={`/clients/${client.id}`} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {client.displayName}
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">…{account.id.slice(-4)}</h1>
            <p className="text-xs text-muted-foreground">{account.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{statusLabel(account.status)}</Badge>
            <span className={`size-2.5 shrink-0 rounded-full ${statusDotClass(account.status)}`} />
          </div>
        </div>
        {flag && (
          <Badge variant={account.pastMaxExtension ? "destructive" : "secondary"} className="w-fit">
            {flag}
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" disabled={!client.phone} render={<a href={client.phone ? buildTelLink(client.phone) : undefined} />}>
          <Phone />
          Call
        </Button>
        <Button variant="outline" onClick={openRemind}>
          <MessageCircle />
          Remind
        </Button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <SummaryCard icon={Wallet} label="Installment" value={formatINR(account.denomination)} />
        <SummaryCard icon={AlertCircle} label="To clear" value={formatINR(account.amountToClear)} accentClassName="text-red-500" />
        <SummaryCard icon={CalendarClock} label="Next due" value={account.nextDueDate ? formatDateDisplay(account.nextDueDate) : "—"} />
        <SummaryCard icon={PiggyBank} label="Corpus paid" value={formatINR(account.monthsPaid * account.denomination)} />
      </div>

      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={(account.monthsPaid / RD_RULES.tenureMonths) * 100} className="h-2 flex-1" />
          <span className="tabular-nums">
            {account.monthsPaid}/{RD_RULES.tenureMonths}
          </span>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2 rounded-md border p-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Interest rate (% p.a.)</label>
                <Input type="number" step="0.01" value={rateDraft} onChange={(e) => setRateDraft(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Opening date</label>
                <Input type="date" value={openingDateDraft} onChange={(e) => setOpeningDateDraft(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveDetails} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={startEditing} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Pencil className="size-3" />
            {account.interestRate}% p.a. · opened {account.openingDate ? formatDateDisplay(account.openingDate) : "unknown"}
          </button>
        )}
      </div>

      <Button onClick={openCollect}>Collect payment</Button>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Collection history</h2>
        {history.length === 0 && <p className="text-sm text-muted-foreground">No collections recorded yet.</p>}
        {history.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex flex-col">
              <span>{formatDateDisplay(c.date)}</span>
              <span className="text-xs text-muted-foreground">{c.mode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{formatINR(Number(c.amount))}</span>
              {c.depositedToPO && <Badge variant="secondary">Deposited</Badge>}
            </div>
          </div>
        ))}
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
    </div>
  );
}
