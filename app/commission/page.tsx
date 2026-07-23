import { Suspense } from "react";
import { CommissionView } from "@/components/commission/CommissionView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAllAccountsWithClients, rollupByClient, getAllCollections, getEffectiveRdRules, getRequestToday } from "@/lib/queries";

export default function CommissionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CommissionPageContent />
    </Suspense>
  );
}

async function CommissionPageContent() {
  const today = await getRequestToday();
  const [accounts, collections, rules] = await Promise.all([
    getAllAccountsWithClients(today),
    getAllCollections(),
    getEffectiveRdRules(),
  ]);
  const rollups = rollupByClient(accounts);

  return <CommissionView accounts={accounts} rollups={rollups} collections={collections} rules={rules} />;
}
