"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientCard } from "@/components/cards/ClientCard";
import { AddClientDialog } from "@/components/dialogs/AddClientDialog";
import type { ClientRollup } from "@/lib/queries";

type SortKey = "name" | "liability" | "status" | "nearestDue";

const STATUS_RANK: Record<string, number> = {
  critical: 0,
  "overdue2-3": 1,
  overdue1: 2,
  dueSoon: 3,
  current: 4,
  matured: 5,
};

export function ClientsListView({ rollups }: { rollups: ClientRollup[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("status");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rollups.filter(
          (r) =>
            r.client.displayName.toLowerCase().includes(q) ||
            r.accounts.some((a) => a.id.includes(q))
        )
      : rollups;

    return [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.client.displayName.localeCompare(b.client.displayName);
        case "liability":
          return b.totalMonthlyLiability - a.totalMonthlyLiability;
        case "nearestDue":
          return (a.nearestDueDate ?? "9999").localeCompare(b.nearestDueDate ?? "9999");
        case "status":
        default:
          return STATUS_RANK[a.worst] - STATUS_RANK[b.worst];
      }
    });
  }, [rollups, query, sort]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Clients</h1>
        <AddClientDialog />
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search name or account no..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" />
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Worst status</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="liability">Total liability</SelectItem>
            <SelectItem value="nearestDue">Nearest due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No clients found.</p>}

      {filtered.map((r) => (
        <ClientCard key={r.client.id} rollup={r} />
      ))}
    </div>
  );
}
