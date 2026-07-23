import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { db } from "@/db";
import { accounts, clients, collections, messageTemplates, appSettings, reportImports } from "@/db/schema";
import { eq, desc, gte, inArray } from "drizzle-orm";
import { deriveAccount, worstStatus, type DerivedAccount } from "@/lib/derive";
import { mergeRdRules, type RdRules } from "@/config/rdRules";
import { DEFAULT_TEMPLATES, type TemplateLanguage } from "@/lib/messages";
import type { Client } from "@/db/schema";

// Short-lived — every mutation calls updateTag('accounts'/'collections') for immediate
// read-your-own-writes, so this window only covers data changed outside the app's own actions
// (e.g. a manual SQL backfill script).
function cacheLiveData() {
  cacheLife({ stale: 30, revalidate: 60, expire: 900 });
}

// Every page needs "now" to compute account status (monthsOverdue, dueSoon, etc.), which
// genuinely differs per request — connection() marks that boundary explicitly (Cache Components
// otherwise freezes non-deterministic values like `new Date()` at first-cache-fill time).
// Callers must be inside a <Suspense> boundary, since this opts the subtree out of prerendering.
export async function getRequestToday(): Promise<Date> {
  await connection();
  return new Date();
}

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

// Caches the actual Postgres round-trip (the expensive part, and the one every page hits).
// Keyed independent of "today" — deriveAccount below is pure JS applied post-cache, so status
// is always computed against whatever `today` the caller passed, never frozen at cache-fill time.
async function fetchAccountClientRows() {
  "use cache";
  cacheTag("accounts");
  cacheLiveData();
  return db
    .select({ account: accounts, client: clients })
    .from(accounts)
    .innerJoin(clients, eq(accounts.clientId, clients.id))
    .orderBy(accounts.nextDueDate);
}

export async function getAllAccountsWithClients(today: Date = new Date()): Promise<AccountWithClient[]> {
  const [rows, rules] = await Promise.all([fetchAccountClientRows(), getEffectiveRdRules()]);

  return rows.map(({ account, client }) => ({
    ...deriveAccount(account, today, rules),
    client,
  }));
}

export interface SearchIndexRow {
  id: string;
  clientId: string;
  accountName: string;
  accountNo: string;
}

// No "today" dependency (unlike getAllAccountsWithClients) — safe to call from the root layout,
// which wraps every route, without forcing the whole app dynamic just for a search index.
export async function getSearchIndex(): Promise<SearchIndexRow[]> {
  "use cache";
  cacheTag("accounts");
  cacheLiveData();
  const rows = await db
    .select({ id: accounts.id, clientId: accounts.clientId, accountName: accounts.accountName })
    .from(accounts);
  return rows.map((r) => ({ ...r, accountNo: r.id }));
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

export async function getClientDetail(clientId: string, today: Date = new Date()): Promise<ClientRollup | null> {
  const all = await getAllAccountsWithClients(today);
  const group = all.filter((a) => a.client.id === clientId);
  if (group.length === 0) return null;
  return rollupByClient(group)[0];
}

export async function getAccountDetail(accountId: string, today: Date = new Date()): Promise<AccountWithClient | null> {
  const all = await getAllAccountsWithClients(today);
  return all.find((a) => a.id === accountId) ?? null;
}

export async function getCollectionsForAccount(accountId: string) {
  "use cache";
  cacheTag("collections");
  cacheLiveData();
  return db.select().from(collections).where(eq(collections.accountId, accountId)).orderBy(desc(collections.date));
}

export async function getCollectionsForAccounts(accountIds: string[]) {
  "use cache";
  cacheTag("collections");
  cacheLiveData();
  if (accountIds.length === 0) return [];
  return db.select().from(collections).where(inArray(collections.accountId, accountIds)).orderBy(desc(collections.date));
}

export async function getCollectionsToday(todayIso: string) {
  "use cache";
  cacheTag("collections");
  cacheLiveData();
  return db.select().from(collections).where(gte(collections.date, todayIso));
}

export async function getAllCollections() {
  "use cache";
  cacheTag("collections");
  cacheLiveData();
  return db.select().from(collections).orderBy(desc(collections.date));
}

export async function getMessageTemplates() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
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
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return (rows[0]?.value as T) ?? null;
}

export async function getLastImportAt(): Promise<string | null> {
  "use cache";
  cacheTag("imports");
  cacheLife("hours");
  const rows = await db
    .select({ importedAt: reportImports.importedAt })
    .from(reportImports)
    .orderBy(desc(reportImports.importedAt))
    .limit(1);
  return rows[0]?.importedAt.toISOString() ?? null;
}
