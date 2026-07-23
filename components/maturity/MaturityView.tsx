"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { ReminderSheet, reminderSheetKey, type ReminderTarget } from "@/components/sheets/ReminderSheet";
import { estimateMaturityValue, maturityFlagLabel } from "@/lib/derive";
import { formatINR } from "@/lib/format";
import type { AccountWithClient } from "@/lib/queries";
import type { RdRules } from "@/config/rdRules";
import type { TemplateLanguage, DEFAULT_TEMPLATES } from "@/lib/messages";

type Bucket = "maturing6" | "maturing3" | "matured";

export function MaturityView({
  accounts,
  rules,
  language = "en",
  templates,
}: {
  accounts: AccountWithClient[];
  rules: RdRules;
  language?: TemplateLanguage;
  templates?: typeof DEFAULT_TEMPLATES;
}) {
  const [remindTarget, setRemindTarget] = useState<ReminderTarget | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);

  const buckets = useMemo(() => {
    const result: Record<Bucket, AccountWithClient[]> = { maturing6: [], maturing3: [], matured: [] };
    for (const a of accounts) {
      if (a.monthsPaid >= rules.tenureMonths) result.matured.push(a);
      else if (a.monthsPaid >= rules.tenureMonths - 3) result.maturing3.push(a);
      else if (a.monthsPaid >= rules.tenureMonths - 6) result.maturing6.push(a);
    }
    // Surface accounts furthest into (or past the legal limit of) their extension first —
    // those need a PO conversation soonest.
    result.matured.sort((a, b) => b.monthsBeyondMaturity - a.monthsBeyondMaturity);
    return result;
  }, [accounts, rules.tenureMonths]);

  function pitch(account: AccountWithClient) {
    const projectionMonths = account.monthsPaid + account.monthsToMaturity;
    const estimate = estimateMaturityValue(account.denomination, projectionMonths, account.interestRate);
    setRemindTarget({
      clientName: account.client.displayName,
      clientPhone: account.client.phone,
      amount: estimate,
      kind: "maturityPitch",
    });
    setRemindOpen(true);
  }

  function renderList(list: AccountWithClient[]) {
    if (list.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No accounts in this bucket.</p>;
    return (
      <div className="flex flex-col gap-2">
        {list.map((account) => {
          const projectionMonths = account.monthsPaid + account.monthsToMaturity;
          const estimate = estimateMaturityValue(account.denomination, projectionMonths, account.interestRate);
          const flag = maturityFlagLabel(account);
          return (
            <Card key={account.id} className="gap-2 py-3">
              <CardContent className="flex flex-col gap-2 px-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{account.client.displayName}</span>
                  <Badge variant="outline">month {account.monthsPaid}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>…{account.id.slice(-4)}</span>
                  <span>·</span>
                  <span>{formatINR(account.denomination)}/mo</span>
                  <span>·</span>
                  <span>{account.interestRate}% p.a.</span>
                  <span>·</span>
                  <span>~{formatINR(estimate)} approx. maturity value</span>
                </div>
                {flag && (
                  <Badge variant={account.pastMaxExtension ? "destructive" : "secondary"} className="w-fit">
                    {flag}
                  </Badge>
                )}
                <Button size="sm" variant="outline" onClick={() => pitch(account)}>
                  <MessageCircle />
                  Maturity pitch
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Tabs defaultValue="matured">
        <TabsList className="w-full">
          <TabsTrigger value="matured">Matured ({buckets.matured.length})</TabsTrigger>
          <TabsTrigger value="maturing3">In 3 months ({buckets.maturing3.length})</TabsTrigger>
          <TabsTrigger value="maturing6">In 6 months ({buckets.maturing6.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="matured" className="mt-3">
          {renderList(buckets.matured)}
        </TabsContent>
        <TabsContent value="maturing3" className="mt-3">
          {renderList(buckets.maturing3)}
        </TabsContent>
        <TabsContent value="maturing6" className="mt-3">
          {renderList(buckets.maturing6)}
        </TabsContent>
      </Tabs>
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
