"use client";

import Link from "next/link";
import { useState, type ReactElement } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MORE_NAV } from "./nav-items";

export function MoreSheet({ children }: { children: ReactElement }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={children} />
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-6">
          {MORE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm hover:bg-accent"
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
