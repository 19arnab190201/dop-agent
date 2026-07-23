"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAccount } from "@/lib/actions";

export function AddAccountDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [denomination, setDenomination] = useState("");
  const [monthsPaid, setMonthsPaid] = useState("0");
  const [openingDate, setOpeningDate] = useState("");
  const [interestRate, setInterestRate] = useState("6.7");
  const [pending, startTransition] = useTransition();

  function reset(nextOpen: boolean) {
    if (nextOpen) {
      setAccountId("");
      setDenomination("");
      setMonthsPaid("0");
      setOpeningDate("");
      setInterestRate("6.7");
    }
    setOpen(nextOpen);
  }

  function submit() {
    const parsedDenomination = parseFloat(denomination);
    const parsedMonthsPaid = parseInt(monthsPaid, 10);
    const parsedRate = parseFloat(interestRate);

    if (!accountId.trim()) {
      toast.error("Enter an account number");
      return;
    }
    if (!parsedDenomination || parsedDenomination <= 0) {
      toast.error("Enter a valid installment amount");
      return;
    }
    if (Number.isNaN(parsedMonthsPaid) || parsedMonthsPaid < 0) {
      toast.error("Enter a valid months-paid count");
      return;
    }

    startTransition(async () => {
      try {
        await createAccount({
          clientId,
          accountId,
          denomination: parsedDenomination,
          monthsPaid: parsedMonthsPaid,
          openingDate: openingDate || null,
          interestRate: Number.isNaN(parsedRate) ? undefined : parsedRate,
        });
        toast.success(`Added account …${accountId.slice(-4)}`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add account");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus />
        Add account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-id">Account number</Label>
            <Input id="account-id" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="e.g. 20019080776" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-denomination">Installment (₹)</Label>
              <Input id="account-denomination" inputMode="decimal" value={denomination} onChange={(e) => setDenomination(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-months-paid">Months paid</Label>
              <Input id="account-months-paid" inputMode="numeric" value={monthsPaid} onChange={(e) => setMonthsPaid(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-opening-date">Opening date</Label>
              <Input id="account-opening-date" type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-interest-rate">Interest rate (% p.a.)</Label>
              <Input id="account-interest-rate" type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Adding..." : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
