"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

export interface SearchIndexItem {
  id: string; // account id
  clientId: string;
  accountName: string;
  accountNo: string;
}

export function SearchOverlay({ index }: { index: SearchIndexItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
      >
        <Search className="size-5" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search by client name or account number">
        <CommandInput placeholder="Search name or account no..." />
        <CommandList>
          <CommandEmpty>No accounts found.</CommandEmpty>
          <CommandGroup heading="Accounts">
            {index.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.accountName} ${item.accountNo}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/clients/${item.clientId}`);
                }}
              >
                {item.accountName}
                <span className="ml-auto text-xs text-muted-foreground">…{item.accountNo.slice(-4)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
