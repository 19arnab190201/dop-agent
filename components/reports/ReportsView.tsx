"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/cards/SummaryCard";
import { Wallet, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { formatINR, formatDateDisplay } from "@/lib/format";
import { statusLabel } from "@/lib/derive";
import type { AccountWithClient } from "@/lib/queries";
import type { CollectionEntry } from "@/db/schema";
import type { RdRules } from "@/config/rdRules";

export function ReportsView({
  accounts,
  collections,
  rules,
}: {
  accounts: AccountWithClient[];
  collections: CollectionEntry[];
  rules: RdRules;
}) {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: `Day sheet ${day}` });

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const daySheetRows = collections.filter((c) => c.date === day);
  const daySheetTotal = daySheetRows.reduce((s, c) => s + Number(c.amount), 0);

  const monthCollections = collections.filter((c) => c.date.startsWith(month));
  const collected = monthCollections.reduce((s, c) => s + Number(c.amount), 0);
  const defaults = accounts.filter((a) => a.monthsOverdue > 0).reduce((s, a) => s + a.amountToClear, 0);
  const pending = Math.max(
    0,
    accounts.filter((a) => a.status !== "matured").reduce((s, a) => s + a.denomination, 0) - collected
  );
  const commission = collected * rules.agentCommissionRate;

  function exportBook() {
    const rows = accounts.map((a) => ({
      "Account No": a.id,
      "Client Name": a.client.displayName,
      Denomination: a.denomination,
      "Months Paid": a.monthsPaid,
      "Next Due Date": a.nextDueDate ?? "",
      Status: statusLabel(a.status),
      "Months Overdue": a.monthsOverdue,
      "Amount To Clear": a.amountToClear,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Accounts");
    XLSX.writeFile(workbook, `rd-book-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Day sheet</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-40" />
            <Button size="sm" onClick={() => print()} disabled={daySheetRows.length === 0}>
              <Printer />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={printRef} className="flex flex-col gap-2 p-2">
            <h2 className="text-base font-semibold">Day sheet — {formatDateDisplay(day)}</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1">Client</th>
                  <th className="py-1">Account</th>
                  <th className="py-1 text-right">Amount</th>
                  <th className="py-1">Signature</th>
                </tr>
              </thead>
              <tbody>
                {daySheetRows.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-1.5">{accountById.get(c.accountId)?.client.displayName ?? "—"}</td>
                    <td className="py-1.5">…{c.accountId.slice(-4)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatINR(Number(c.amount))}</td>
                    <td className="py-1.5"></td>
                  </tr>
                ))}
                {daySheetRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No collections recorded for this day.
                    </td>
                  </tr>
                )}
              </tbody>
              {daySheetRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2} className="pt-2 font-semibold">
                      Total
                    </td>
                    <td className="pt-2 text-right font-semibold tabular-nums">{formatINR(daySheetTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Monthly summary</CardTitle>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard icon={Wallet} label="Collected" value={formatINR(collected)} />
            <SummaryCard icon={Clock} label="Pending" value={formatINR(pending)} />
            <SummaryCard icon={AlertTriangle} label="Defaults" value={formatINR(defaults)} accentClassName="text-red-500" />
            <SummaryCard icon={TrendingUp} label="Commission" value={formatINR(commission)} accentClassName="text-emerald-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Full book export</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={exportBook}>
            <FileSpreadsheet />
            Export Excel ({accounts.length} accounts)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
