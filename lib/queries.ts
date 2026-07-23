import { db } from "@/db";
import { accounts, clients, collections, messageTemplates, appSettings, reportImports } from "@/db/schema";
import { eq, desc, gte, inArray } from "drizzle-orm";
import { deriveAccount, worstStatus, type DerivedAccount } from "@/lib/derive";
import { mergeRdRules, type RdRules } from "@/config/rdRules";
import { DEFAULT_TEMPLATES, type TemplateLanguage } from "@/lib/messages";
import type { Client } from "@/db/schema";

export async function getEffectiveRdRules(): Promise<RdRules> {
  const overrides = await getAppSetting<Partial<RdRules>>("rdRules");
  return mergeRdRules(overrides);
}

export type AccountWithClient = DerivedAccount & { client: Client };

export interface ClientRollup {
  client: Client;
  accounts: DerivedAccount[];
  totalMonthlyLiability: number;
  totalOverdueAmount: number;
  totalCorpusPaid: number;
  nearestDueDate: string | null;
  worst: ReturnType<typeof worstStatus>;
}

export async function getAllAccountsWithClients(today: Date = new Date()): Promise<AccountWithClient[]> {
  const [rows, rules] = await Promise.all([
    db
      .select({ account: accounts, client: clients })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .orderBy(accounts.nextDueDate),
    getEffectiveRdRules(),
  ]);

  return rows.map(({ account, client }) => ({
    ...deriveAccount(account, today, rules),
    client,
  }));
}

export function rollupByClient(accountsWithClients: AccountWithClient[]): ClientRollup[] {
  const byClient = new Map<string, AccountWithClient[]>();
  for (const a of accountsWithClients) {
    const list = byClient.get(a.client.id) ?? [];
    list.push(a);
    byClient.set(a.client.id, list);
  }

  return Array.from(byClient.entries()).map(([, group]) => {
    const client = group[0].client;
    const dueDates = group.map((a) => a.nextDueDate).filter((d): d is string => Boolean(d));
    const nearestDueDate = dueDates.sort()[0] ?? null;

    return {
      client,
      accounts: group,
      totalMonthlyLiability: group.reduce((sum, a) => sum + a.denomination, 0),
      totalOverdueAmount: group.reduce((sum, a) => sum + (a.monthsOverdue > 0 ? a.amountToClear : 0), 0),
      totalCorpusPaid: group.reduce((sum, a) => sum + a.monthsPaid * a.denomination, 0),
      nearestDueDate,
      worst: worstStatus(group.map((a) => a.status)),
    };
  });
}

export async function getClientDetail(clientId: string): Promise<ClientRollup | null> {
  const all = await getAllAccountsWithClients();
  const group = all.filter((a) => a.client.id === clientId);
  if (group.length === 0) return null;
  return rollupByClient(group)[0];
}

export async function getCollectionsForAccount(accountId: string) {
  return db.select().from(collections).where(eq(collections.accountId, accountId)).orderBy(desc(collections.date));
}

export async function getCollectionsForAccounts(accountIds: string[]) {
  if (accountIds.length === 0) return [];
  return db.select().from(collections).where(inArray(collections.accountId, accountIds)).orderBy(desc(collections.date));
}

export async function getCollectionsToday(todayIso: string) {
  return db.select().from(collections).where(gte(collections.date, todayIso));
}

export async function getAllCollections() {
  return db.select().from(collections).orderBy(desc(collections.date));
}

export async function getMessageTemplates() {
  return db.select().from(messageTemplates);
}

export async function getEffectiveTemplates(): Promise<typeof DEFAULT_TEMPLATES> {
  const rows = await getMessageTemplates();
  const merged: typeof DEFAULT_TEMPLATES = {
    reminder: { ...DEFAULT_TEMPLATES.reminder },
    recovery: { ...DEFAULT_TEMPLATES.recovery },
    combinedReminder: { ...DEFAULT_TEMPLATES.combinedReminder },
    maturityPitch: { ...DEFAULT_TEMPLATES.maturityPitch },
  };
  for (const row of rows) {
    const key = row.key as keyof typeof DEFAULT_TEMPLATES;
    if (merged[key]) merged[key][row.language as TemplateLanguage] = row.body;
  }
  return merged;
}

export async function getLanguage(): Promise<TemplateLanguage> {
  return (await getAppSetting<TemplateLanguage>("language")) ?? "en";
}

export async function getAppSetting<T = unknown>(key: string): Promise<T | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return (rows[0]?.value as T) ?? null;
}

export async function getLastImportAt(): Promise<string | null> {
  const rows = await db
    .select({ importedAt: reportImports.importedAt })
    .from(reportImports)
    .orderBy(desc(reportImports.importedAt))
    .limit(1);
  return rows[0]?.importedAt.toISOString() ?? null;
}
