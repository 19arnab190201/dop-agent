import { Suspense } from "react";
import { SettingsView } from "@/components/settings/SettingsView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import {
  getAllAccountsWithClients,
  rollupByClient,
  getEffectiveRdRules,
  getEffectiveTemplates,
  getLanguage,
  getRequestToday,
} from "@/lib/queries";

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}

async function SettingsPageContent() {
  const today = await getRequestToday();
  const [accounts, rules, templates, language] = await Promise.all([
    getAllAccountsWithClients(today),
    getEffectiveRdRules(),
    getEffectiveTemplates(),
    getLanguage(),
  ]);

  const clientsList = rollupByClient(accounts)
    .map((r) => ({ id: r.client.id, displayName: r.client.displayName, accountCount: r.accounts.length }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return <SettingsView rules={rules} templates={templates} language={language} clientsList={clientsList} />;
}
