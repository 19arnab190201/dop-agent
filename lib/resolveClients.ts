import { inArray } from "drizzle-orm";
import type { db as Db } from "@/db";
import { clients } from "@/db/schema";

export interface ClientNameEntry {
  normalizedName: string;
  displayName: string;
}

/**
 * Finds existing clients by normalized name and creates any that don't exist yet,
 * letting Postgres generate their UUIDs. Returns a normalizedName -> client id map
 * so callers can link accounts without a second round-trip per row.
 */
export async function resolveClientIds(
  db: typeof Db,
  entries: ClientNameEntry[]
): Promise<Map<string, string>> {
  const uniqueByName = new Map<string, ClientNameEntry>();
  for (const entry of entries) uniqueByName.set(entry.normalizedName, entry);

  const normalizedNames = [...uniqueByName.keys()];
  if (normalizedNames.length === 0) return new Map();

  const existing = await db
    .select({ id: clients.id, normalizedName: clients.normalizedName })
    .from(clients)
    .where(inArray(clients.normalizedName, normalizedNames));

  const idByName = new Map(existing.map((c) => [c.normalizedName, c.id]));

  const toInsert = [...uniqueByName.values()].filter((e) => !idByName.has(e.normalizedName));
  if (toInsert.length > 0) {
    const inserted = await db
      .insert(clients)
      .values(toInsert.map((e) => ({ normalizedName: e.normalizedName, displayName: e.displayName })))
      .returning({ id: clients.id, normalizedName: clients.normalizedName });
    for (const c of inserted) idByName.set(c.normalizedName, c.id);
  }

  return idByName;
}
