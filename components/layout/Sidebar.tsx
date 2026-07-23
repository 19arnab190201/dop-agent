"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, MORE_NAV } from "./nav-items";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  const pathname = usePathname();

  const renderLink = (item: (typeof PRIMARY_NAV)[number]) => {
    const active = pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex min-h-[40px] items-center gap-3 rounded-md px-3 text-sm font-medium",
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
        )}
      >
        <Icon className="size-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 border-r bg-background p-3 lg:flex">
      <div className="px-3 py-4 text-lg font-semibold">RD Agent</div>
      <div className="flex flex-col gap-1">{PRIMARY_NAV.map(renderLink)}</div>
      <Separator className="my-2" />
      <div className="flex flex-col gap-1">{MORE_NAV.map(renderLink)}</div>
    </aside>
  );
}
