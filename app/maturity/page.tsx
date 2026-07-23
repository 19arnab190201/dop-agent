import { Suspense } from "react";
import { MaturityView } from "@/components/maturity/MaturityView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAllAccountsWithClients, getEffectiveRdRules, getLanguage, getEffectiveTemplates, getRequestToday } from "@/lib/queries";

export default function MaturityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MaturityPageContent />
    </Suspense>
  );
}

async function MaturityPageContent() {
  const today = await getRequestToday();
  const [accounts, rules, language, templates] = await Promise.all([
    getAllAccountsWithClients(today),
    getEffectiveRdRules(),
    getLanguage(),
    getEffectiveTemplates(),
  ]);
  return <MaturityView accounts={accounts} rules={rules} language={language} templates={templates} />;
}
