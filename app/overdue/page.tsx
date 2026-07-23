import { OverdueView } from "@/components/overdue/OverdueView";
import { getAllAccountsWithClients, getLanguage, getEffectiveTemplates } from "@/lib/queries";

export default async function OverduePage() {
  const [accounts, language, templates] = await Promise.all([
    getAllAccountsWithClients(),
    getLanguage(),
    getEffectiveTemplates(),
  ]);
  return <OverdueView accounts={accounts} language={language} templates={templates} />;
}
