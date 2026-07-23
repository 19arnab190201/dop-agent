"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, clients, collections, reportImports, messageTemplates, appSettings } from "@/db/schema";
import { parseDopReport, type ParsedAccountRow } from "@/lib/parser";
import { normalizeName, mergeClientFields } from "@/lib/normalize";
import { resolveClientIds } from "@/lib/resolveClients";

export interface ImportPreview {
  rows: ParsedAccountRow[];
  errors: { line: string; reason: string }[];
  accountCount: number;
}

export async function previewImport(rawText: string): Promise<ImportPreview> {
  const { rows, errors } = parseDopReport(rawText);
  return { rows, errors, accountCount: rows.length };
}

export async function commitImport(rawText: string) {
  const { rows } = parseDopReport(rawText);

  const existing = await db.select({ id: accounts.id, monthsPaid: accounts.monthsPaid }).from(accounts);
  const existingIds = new Set(existing.map((a) => a.id));
  const existingMonthsPaid = new Map(existing.map((a) => [a.id, a.monthsPaid]));
  const incomingIds = new Set(rows.map((r) => r.accountNo));

  const added: string[] = [];
  const changed: string[] = [];
  const removed = [...existingIds].filter((id) => !incomingIds.has(id));

  const clientIdByName = await resolveClientIds(
    db,
    rows.map((row) => ({ normalizedName: normalizeName(row.accountName), displayName: row.accountName.trim() }))
  );

  for (const row of rows) {
    const displayName = row.accountName.trim();
    const clientId = clientIdByName.get(normalizeName(row.accountName))!;

    if (!existingIds.has(row.accountNo)) {
      added.push(row.accountNo);
    } else if (existingMonthsPaid.get(row.accountNo) !== row.monthsPaid) {
      changed.push(row.accountNo);
    }

    await db
      .insert(accounts)
      .values({
        id: row.accountNo,
        clientId,
        reportUserCode: row.reportUserCode,
        accountName: displayName,
        denomination: row.denomination.toString(),
        monthsPaid: row.monthsPaid,
        nextDueDate: row.nextDueDate,
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: {
          accountName: displayName,
          denomination: row.denomination.toString(),
          monthsPaid: row.monthsPaid,
          nextDueDate: row.nextDueDate,
          reportUserCode: row.reportUserCode,
          updatedAt: sql`now()`,
        },
      });
  }

  const diff = { added, removed, changed };

  await db.insert(reportImports).values({
    rawText,
    accountCount: rows.length,
    diff,
  });

  revalidatePath("/", "layout");
  return diff;
}

export async function markCollected(input: {
  accountId: string;
  amount: number;
  installmentsCovered: number;
  mode: "cash" | "cheque" | "other";
  date: string;
}) {
  await db.insert(collections).values({ ...input, amount: input.amount.toString() });
  revalidatePath("/", "layout");
}

export async function markDepositedToPO(collectionIds: number[]) {
  await db.update(collections).set({ depositedToPO: true }).where(inArray(collections.id, collectionIds));
  revalidatePath("/", "layout");
}

export async function updateAccountDetails(
  accountId: string,
  input: { interestRate?: number; openingDate?: string | null }
) {
  await db
    .update(accounts)
    .set({
      ...(input.interestRate !== undefined ? { interestRate: input.interestRate.toString() } : {}),
      ...(input.openingDate !== undefined ? { openingDate: input.openingDate } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(accounts.id, accountId));
  revalidatePath("/", "layout");
}

export async function updateClient(
  clientId: string,
  input: { phone?: string | null; notes?: string | null; tags?: string[] }
) {
  await db
    .update(clients)
    .set({ ...input, updatedAt: sql`now()` })
    .where(eq(clients.id, clientId));
  revalidatePath("/clients");
}

export async function mergeClients(primaryId: string, secondaryId: string) {
  const [primary] = await db.select().from(clients).where(eq(clients.id, primaryId)).limit(1);
  const [secondary] = await db.select().from(clients).where(eq(clients.id, secondaryId)).limit(1);
  if (!primary || !secondary) throw new Error("Client not found");

  const merged = mergeClientFields(primary, secondary);

  await db.update(accounts).set({ clientId: primaryId }).where(eq(accounts.clientId, secondaryId));
  await db.update(clients).set(merged).where(eq(clients.id, primaryId));
  await db.delete(clients).where(eq(clients.id, secondaryId));

  revalidatePath("/clients");
}

export async function updateAppSetting(key: string, value: unknown) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  revalidatePath("/settings");
}

export async function upsertMessageTemplate(key: string, language: "en" | "hi", body: string) {
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(sql`${messageTemplates.key} = ${key} and ${messageTemplates.language} = ${language}`)
    .limit(1);

  if (existing[0]) {
    await db.update(messageTemplates).set({ body }).where(eq(messageTemplates.id, existing[0].id));
  } else {
    await db.insert(messageTemplates).values({ key, language, body });
  }
  revalidatePath("/settings");
}

export interface Backup {
  exportedAt: string;
  clients: (typeof clients.$inferSelect)[];
  accounts: (typeof accounts.$inferSelect)[];
  collections: (typeof collections.$inferSelect)[];
  messageTemplates: (typeof messageTemplates.$inferSelect)[];
  appSettings: (typeof appSettings.$inferSelect)[];
}

export async function exportBackup(): Promise<Backup> {
  const [allClients, allAccounts, allCollections, allTemplates, allSettings] = await Promise.all([
    db.select().from(clients),
    db.select().from(accounts),
    db.select().from(collections),
    db.select().from(messageTemplates),
    db.select().from(appSettings),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    clients: allClients,
    accounts: allAccounts,
    collections: allCollections,
    messageTemplates: allTemplates,
    appSettings: allSettings,
  };
}

export async function restoreBackup(backup: Backup) {
  for (const c of backup.clients) {
    await db.insert(clients).values(c).onConflictDoUpdate({ target: clients.id, set: c });
  }
  for (const a of backup.accounts) {
    await db.insert(accounts).values(a).onConflictDoUpdate({ target: accounts.id, set: a });
  }
  for (const c of backup.collections) {
    const { id: _id, ...rest } = c;
    await db.insert(collections).values(c).onConflictDoUpdate({ target: collections.id, set: rest });
  }
  for (const t of backup.messageTemplates) {
    const { id: _id, ...rest } = t;
    await db.insert(messageTemplates).values(t).onConflictDoUpdate({ target: messageTemplates.id, set: rest });
  }
  for (const s of backup.appSettings) {
    await db.insert(appSettings).values(s).onConflictDoUpdate({ target: appSettings.key, set: { value: s.value } });
  }
  revalidatePath("/", "layout");
}

export async function clearAllData() {
  await db.delete(collections);
  await db.delete(accounts);
  await db.delete(clients);
  await db.delete(reportImports);
  await db.delete(messageTemplates);
  await db.delete(appSettings);
  revalidatePath("/", "layout");
}
