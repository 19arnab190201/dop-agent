import { Suspense } from "react";
import { ReportsView } from "@/components/reports/ReportsView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAllAccountsWithClients, getAllCollections, getEffectiveRdRules, getRequestToday } from "@/lib/queries";

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsPageContent />
    </Suspense>
  );
}

async function ReportsPageContent() {
  const today = await getRequestToday();
  const [accounts, collections, rules] = await Promise.all([
    getAllAccountsWithClients(today),
    getAllCollections(),
    getEffectiveRdRules(),
  ]);
  return <ReportsView accounts={accounts} collections={collections} rules={rules} />;
}
