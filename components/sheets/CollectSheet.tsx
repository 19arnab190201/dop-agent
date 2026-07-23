"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markCollected } from "@/lib/actions";
import { formatINR } from "@/lib/format";

export interface CollectTarget {
  accountId: string;
  clientName: string;
  denomination: number;
  amountToClear: number;
  monthsOverdue: number;
}

export function CollectSheet({
  target,
  open,
  onOpenChange,
}: {
  target: CollectTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState<string>("");
  const [installments, setInstallments] = useState<string>("1");
  const [mode, setMode] = useState<"cash" | "cheque" | "other">("cash");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const suggestedAmount = target ? (target.monthsOverdue > 0 ? target.amountToClear : target.denomination) : 0;
  const suggestedInstallments = target ? Math.max(1, target.monthsOverdue + 1) : 1;

  function reset(nextOpen: boolean) {
    if (nextOpen && target) {
      setAmount(suggestedAmount.toString());
      setInstallments(suggestedInstallments.toString());
      setMode("cash");
      setDate(new Date().toISOString().slice(0, 10));
    }
    onOpenChange(nextOpen);
  }

  function submit() {
    if (!target) return;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      await markCollected({
        accountId: target.accountId,
        amount: parsedAmount,
        installmentsCovered: parseInt(installments, 10) || 1,
        mode,
        date,
      });
      toast.success(`Collected ${formatINR(parsedAmount)} from ${target.clientName}`);
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={reset}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Collect payment</SheetTitle>
          <SheetDescription>{target?.clientName ?? "Select an account"}</SheetDescription>
        </SheetHeader>
        {target && (
          <div className="flex flex-col gap-4 px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="collect-amount">Amount (₹)</Label>
                <Input
                  id="collect-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="collect-installments">Installments</Label>
                <Input
                  id="collect-installments"
                  inputMode="numeric"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="collect-date">Date</Label>
                <Input id="collect-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        <SheetFooter>
          <Button disabled={!target || pending} onClick={submit} className="w-full">
            {pending ? "Saving..." : "Mark collected"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
