"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarRange, AlertCircle, CheckCircle2, Landmark } from "lucide-react";
import { startOfDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { AccountCard } from "@/components/cards/AccountCard";
import { HeatStrip, buildHeatStripData } from "@/components/charts/HeatStrip";
import { CollectSheet, type CollectTarget } from "@/components/sheets/CollectSheet";
import { ReminderSheet, reminderSheetKey, type ReminderTarget } from "@/components/sheets/ReminderSheet";
import { FAB } from "@/components/layout/FAB";
import { formatINR } from "@/lib/format";
import { markDepositedToPO } from "@/lib/actions";
import type { AccountWithClient } from "@/lib/queries";
import type { CollectionEntry } from "@/db/schema";
import type { TemplateLanguage, DEFAULT_TEMPLATES } from "@/lib/messages";

type HomeTab = "thisWeek" | "nextWeek" | "nextMonth";

const TAB_LABELS: Record<HomeTab, string> = {
  thisWeek: "This week",
  nextWeek: "Next week",
  nextMonth: "Next month",
};

// Sequential, non-overlapping windows — every account falls into exactly one tab (or none,
// if its due date is further out than nextMonth's window; those surface elsewhere, e.g. /maturity).
function tabFor(diffDays: number): HomeTab | null {
  if (diffDays < 0) return null;
  if (diffDays <= 6) return "thisWeek";
  if (diffDays <= 13) return "nextWeek";
  if (diffDays <= 44) return "nextMonth";
  return null;
}

export function TodayView({
  accounts,
  collectionsToday,
  todayIso,
  language = "en",
  templates,
}: {
  accounts: AccountWithClient[];
  collectionsToday: CollectionEntry[];
  todayIso: string;
  language?: TemplateLanguage;
  templates?: typeof DEFAULT_TEMPLATES;
}) {
  const today = useMemo(() => new Date(todayIso), [todayIso]);
  const [tab, setTab] = useState<HomeTab>("thisWeek");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [collectTarget, setCollectTarget] = useState<CollectTarget | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [remindTarget, setRemindTarget] = useState<ReminderTarget | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);

  const upcoming = useMemo(() => {
    const start = startOfDay(today);
    return accounts
      .filter((a) => a.monthsOverdue === 0 && a.nextDueDate)
      .map((a) => {
        const diffDays = Math.round((new Date(a.nextDueDate as string).getTime() - start.getTime()) / 86_400_000);
        return { account: a, diffDays, tab: tabFor(diffDays) };
      })
      .filter((x): x is { account: AccountWithClient; diffDays: number; tab: HomeTab } => x.tab !== null);
  }, [accounts, today]);

  const dueToday = upcoming.filter((x) => x.diffDays === 0);
  const dueThisWeek = upcoming.filter((x) => x.tab === "thisWeek");
  const overdueAccounts = accounts.filter((a) => a.monthsOverdue > 0);

  const toCollectToday = dueToday.reduce((s, x) => s + x.account.denomination, 0);
  const thisWeekTotal = dueThisWeek.reduce((s, x) => s + x.account.denomination, 0);
  const overdueTotal = overdueAccounts.reduce((s, a) => s + a.amountToClear, 0);
  const collectedToday = collectionsToday.reduce((s, c) => s + Number(c.amount), 0);
  const notYetDeposited = collectionsToday.filter((c) => !c.depositedToPO);
  const uniqueClientsToday = new Set(collectionsToday.map((c) => c.accountId)).size;

  const dueDateTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const { account } of upcoming) {
      m.set(account.nextDueDate as string, (m.get(account.nextDueDate as string) ?? 0) + account.denomination);
    }
    return m;
  }, [upcoming]);

  const heatData = useMemo(() => buildHeatStripData(dueDateTotals, today), [dueDateTotals, today]);

  const visible = selectedDate
    ? upcoming.filter((x) => x.account.nextDueDate === selectedDate)
    : upcoming;

  const tabCounts: Record<HomeTab, number> = {
    thisWeek: visible.filter((x) => x.tab === "thisWeek").length,
    nextWeek: visible.filter((x) => x.tab === "nextWeek").length,
    nextMonth: visible.filter((x) => x.tab === "nextMonth").length,
  };
  const activeAccounts = visible.filter((x) => x.tab === tab).map((x) => x.account);

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

  function openRemind(account: AccountWithClient) {
    setRemindTarget({
      clientName: account.client.displayName,
      clientPhone: account.client.phone,
      amount: account.denomination,
      dueDate: account.nextDueDate,
      kind: "reminder",
    });
    setRemindOpen(true);
  }

  async function handleMarkDeposited() {
    await markDepositedToPO(notYetDeposited.map((c) => c.id));
    toast.success("Marked as deposited at PO");
  }

  const collectableIndex: CollectTarget[] = accounts.map((a) => ({
    accountId: a.id,
    clientName: a.client.displayName,
    denomination: a.denomination,
    amountToClear: a.amountToClear,
    monthsOverdue: a.monthsOverdue,
  }));

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <SummaryCard icon={CalendarClock} label="To collect today" value={formatINR(toCollectToday)} sub={`${dueToday.length} accounts`} />
        <SummaryCard icon={CalendarRange} label="This week" value={formatINR(thisWeekTotal)} sub={`${dueThisWeek.length} accounts`} />
        <SummaryCard
          icon={AlertCircle}
          label="Overdue total"
          value={formatINR(overdueTotal)}
          sub={`${overdueAccounts.length} accounts`}
          href="/overdue"
          accentClassName="text-red-500"
        />
        <SummaryCard icon={CheckCircle2} label="Collected today" value={formatINR(collectedToday)} sub={`${uniqueClientsToday} clients`} accentClassName="text-emerald-500" />
      </div>

      <div className="rounded-lg border p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Next 30 days</div>
        <HeatStrip data={heatData} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </div>

      {notYetDeposited.length > 0 && (
        <Alert>
          <Landmark />
          <AlertTitle>
            Cash in hand: {formatINR(notYetDeposited.reduce((s, c) => s + Number(c.amount), 0))} from{" "}
            {new Set(notYetDeposited.map((c) => c.accountId)).size} clients
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" className="mt-2" onClick={handleMarkDeposited}>
              Mark deposited at PO
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as HomeTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="thisWeek">{TAB_LABELS.thisWeek} ({tabCounts.thisWeek})</TabsTrigger>
          <TabsTrigger value="nextWeek">{TAB_LABELS.nextWeek} ({tabCounts.nextWeek})</TabsTrigger>
          <TabsTrigger value="nextMonth">{TAB_LABELS.nextMonth} ({tabCounts.nextMonth})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {activeAccounts.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No dues in this window.</p>
        )}
        {activeAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            clientName={account.client.displayName}
            clientPhone={account.client.phone}
            onCollect={() => openCollect(account)}
            onRemind={() => openRemind(account)}
          />
        ))}
      </div>

      <FAB accounts={collectableIndex} />
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
