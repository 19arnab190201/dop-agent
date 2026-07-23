import { Suspense } from "react";
import { OverdueView } from "@/components/overdue/OverdueView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAllAccountsWithClients, getLanguage, getEffectiveTemplates, getRequestToday } from "@/lib/queries";

export default function OverduePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OverduePageContent />
    </Suspense>
  );
}

async function OverduePageContent() {
  const today = await getRequestToday();
  const [accounts, language, templates] = await Promise.all([
    getAllAccountsWithClients(today),
    getLanguage(),
    getEffectiveTemplates(),
  ]);
  return <OverdueView accounts={accounts} language={language} templates={templates} />;
}
