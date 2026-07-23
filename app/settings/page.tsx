import { SettingsView } from "@/components/settings/SettingsView";
import {
  getAllAccountsWithClients,
  rollupByClient,
  getEffectiveRdRules,
  getEffectiveTemplates,
  getLanguage,
} from "@/lib/queries";

export default async function SettingsPage() {
  const [accounts, rules, templates, language] = await Promise.all([
    getAllAccountsWithClients(),
    getEffectiveRdRules(),
    getEffectiveTemplates(),
    getLanguage(),
  ]);

  const clientsList = rollupByClient(accounts)
    .map((r) => ({ id: r.client.id, displayName: r.client.displayName, accountCount: r.accounts.length }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return <SettingsView rules={rules} templates={templates} language={language} clientsList={clientsList} />;
}
