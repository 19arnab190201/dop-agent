"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, NotebookPen, Pencil, Wallet, AlertCircle, CalendarClock, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { CollectSheet, type CollectTarget } from "@/components/sheets/CollectSheet";
import { ReminderSheet, reminderSheetKey, type ReminderTarget } from "@/components/sheets/ReminderSheet";
import { NoteDialog } from "@/components/dialogs/NoteDialog";
import { statusLabel, statusDotClass } from "@/lib/derive";
import { formatINR, formatDateDisplay } from "@/lib/format";
import { buildTelLink, formatAccountsListForMessage } from "@/lib/messages";
import { updateClient, updateAccountDetails } from "@/lib/actions";
import { RD_RULES } from "@/config/rdRules";
import type { ClientRollup } from "@/lib/queries";
import type { CollectionEntry } from "@/db/schema";
import type { TemplateLanguage, DEFAULT_TEMPLATES } from "@/lib/messages";

export function ClientDetailView({
  rollup,
  history,
  language = "en",
  templates,
}: {
  rollup: ClientRollup;
  history: CollectionEntry[];
  language?: TemplateLanguage;
  templates?: typeof DEFAULT_TEMPLATES;
}) {
  const { client, accounts } = rollup;
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [pending, startTransition] = useTransition();
  const [collectTarget, setCollectTarget] = useState<CollectTarget | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [remindTarget, setRemindTarget] = useState<ReminderTarget | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState("");
  const [openingDateDraft, setOpeningDateDraft] = useState("");

  function startEditingAccount(accountId: string, interestRate: number, openingDate: string | null) {
    setEditingAccountId(accountId);
    setRateDraft(interestRate.toString());
    setOpeningDateDraft(openingDate ?? "");
  }

  function saveAccountDetails(accountId: string) {
    const parsedRate = parseFloat(rateDraft);
    startTransition(async () => {
      await updateAccountDetails(accountId, {
        interestRate: Number.isNaN(parsedRate) ? undefined : parsedRate,
        openingDate: openingDateDraft || null,
      });
      toast.success("Account details saved");
      setEditingAccountId(null);
    });
  }

  function savePhone() {
    startTransition(async () => {
      await updateClient(client.id, { phone: phone || null });
      toast.success("Phone saved");
      setPhoneEditing(false);
    });
  }

  function openCombinedReminder() {
    setRemindTarget({
      clientName: client.displayName,
      clientPhone: client.phone,
      amount: rollup.totalMonthlyLiability,
      kind: "combinedReminder",
      accountsList: formatAccountsListForMessage(
        accounts.map((a) => ({ accountName: a.accountName, id: a.id, amount: a.denomination, dueDate: a.nextDueDate }))
      ),
    });
    setRemindOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{client.displayName}</h1>
            <div className="flex flex-wrap gap-1 pt-1">
              {client.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className={`size-2.5 shrink-0 rounded-full ${statusDotClass(rollup.worst)}`} />
        </div>

        {phoneEditing ? (
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone number" />
            <Button onClick={savePhone} disabled={pending}>
              Save
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!client.phone}
              render={<a href={client.phone ? buildTelLink(client.phone) : undefined} />}
            >
              <Phone />
              Call
            </Button>
            <Button variant="outline" onClick={openCombinedReminder} disabled={accounts.length === 0}>
              <MessageCircle />
              WhatsApp all dues
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPhoneEditing(true)} aria-label="Edit phone">
              <Pencil />
            </Button>
          </div>
        )}

        <Button variant="ghost" className="w-fit" size="sm" onClick={() => setNoteOpen(true)}>
          <NotebookPen />
          {client.notes ? "Edit note" : "Add note"}
        </Button>
        {client.notes && <p className="rounded-md bg-muted p-2 text-sm text-muted-foreground">{client.notes}</p>}
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <SummaryCard icon={Wallet} label="Monthly liability" value={formatINR(rollup.totalMonthlyLiability)} />
        <SummaryCard icon={AlertCircle} label="Overdue" value={formatINR(rollup.totalOverdueAmount)} accentClassName="text-red-500" />
        <SummaryCard icon={CalendarClock} label="Next due" value={rollup.nearestDueDate ? formatDateDisplay(rollup.nearestDueDate) : "—"} />
        <SummaryCard icon={PiggyBank} label="Corpus paid" value={formatINR(rollup.totalCorpusPaid)} />
      </div>

      <Accordion className="flex flex-col gap-2">
        {accounts.map((account) => (
          <AccordionItem key={account.id} value={account.id} className="rounded-lg border px-3">
            <AccordionTrigger className="py-3">
              <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                <span className="text-sm">…{account.id.slice(-4)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatINR(account.denomination)}</span>
                  <Badge variant="outline">{statusLabel(account.status)}</Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Progress value={(account.monthsPaid / RD_RULES.tenureMonths) * 100} className="h-2 flex-1" />
                <span className="tabular-nums">
                  {account.monthsPaid}/{RD_RULES.tenureMonths}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {account.nextDueDate && <span>due {formatDateDisplay(account.nextDueDate)}</span>}
                {account.monthsOverdue > 0 && <span>to clear {formatINR(account.amountToClear)}</span>}
              </div>

              {editingAccountId === account.id ? (
                <div className="flex flex-col gap-2 rounded-md border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Interest rate (% p.a.)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rateDraft}
                        onChange={(e) => setRateDraft(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Opening date</label>
                      <Input
                        type="date"
                        value={openingDateDraft}
                        onChange={(e) => setOpeningDateDraft(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveAccountDetails(account.id)} disabled={pending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAccountId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEditingAccount(account.id, account.interestRate, account.openingDate)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3" />
                  {account.interestRate}% p.a. · opened{" "}
                  {account.openingDate ? formatDateDisplay(account.openingDate) : "unknown"}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setCollectTarget({
                      accountId: account.id,
                      clientName: client.displayName,
                      denomination: account.denomination,
                      amountToClear: account.amountToClear,
                      monthsOverdue: account.monthsOverdue,
                    });
                    setCollectOpen(true);
                  }}
                >
                  Collect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRemindTarget({
                      clientName: client.displayName,
                      clientPhone: client.phone,
                      amount: account.monthsOverdue > 0 ? account.amountToClear : account.denomination,
                      dueDate: account.nextDueDate,
                      penalty: account.defaultFeeOwed,
                      kind: account.monthsOverdue > 0 ? "recovery" : "reminder",
                    });
                    setRemindOpen(true);
                  }}
                >
                  Remind
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Collection history</h2>
        {history.length === 0 && <p className="text-sm text-muted-foreground">No collections recorded yet.</p>}
        {history.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex flex-col">
              <span>{formatDateDisplay(c.date)}</span>
              <span className="text-xs text-muted-foreground">
                …{c.accountId.slice(-4)} · {c.mode}
              </span>
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
      <NoteDialog
        key={client.id}
        clientId={client.id}
        clientName={client.displayName}
        initialNote={client.notes}
        open={noteOpen}
        onOpenChange={setNoteOpen}
      />
    </div>
  );
}
