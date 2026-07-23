"use client";

import { useState } from "react";
import { IndianRupee } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { CollectSheet, type CollectTarget } from "@/components/sheets/CollectSheet";
import { formatINR } from "@/lib/format";

export function FAB({ accounts }: { accounts: CollectTarget[] }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [target, setTarget] = useState<CollectTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        aria-label="Quick collect"
        className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:bottom-6"
      >
        <IndianRupee className="size-6" />
      </button>
      <CommandDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Quick collect"
        description="Search an account to collect a payment"
      >
        <CommandInput placeholder="Search name or account no..." />
        <CommandList>
          <CommandEmpty>No accounts found.</CommandEmpty>
          <CommandGroup heading="Accounts">
            {accounts.map((a) => (
              <CommandItem
                key={a.accountId}
                value={`${a.clientName} ${a.accountId}`}
                onSelect={() => {
                  setTarget(a);
                  setPickerOpen(false);
                  setSheetOpen(true);
                }}
              >
                {a.clientName}
                <span className="ml-auto text-xs text-muted-foreground">
                  …{a.accountId.slice(-4)} · {formatINR(a.monthsOverdue > 0 ? a.amountToClear : a.denomination)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <CollectSheet target={target} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
