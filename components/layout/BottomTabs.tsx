"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV } from "./nav-items";
import { MoreSheet } from "./MoreSheet";

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background lg:hidden">
      <div className="grid grid-cols-5">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-xs",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <MoreSheet>
          <button className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground">
            <MoreHorizontal className="size-5" />
            More
          </button>
        </MoreSheet>
      </div>
    </nav>
  );
}
