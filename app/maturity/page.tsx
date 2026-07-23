import { MaturityView } from "@/components/maturity/MaturityView";
import { getAllAccountsWithClients, getEffectiveRdRules, getLanguage, getEffectiveTemplates } from "@/lib/queries";

export default async function MaturityPage() {
  const [accounts, rules, language, templates] = await Promise.all([
    getAllAccountsWithClients(),
    getEffectiveRdRules(),
    getLanguage(),
    getEffectiveTemplates(),
  ]);
  return <MaturityView accounts={accounts} rules={rules} language={language} templates={templates} />;
}
