import { Suspense } from "react";
import { ClientsListView } from "@/components/clients/ClientsListView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAllAccountsWithClients, rollupByClient, getRequestToday } from "@/lib/queries";

export default function ClientsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientsPageContent />
    </Suspense>
  );
}

async function ClientsPageContent() {
  const today = await getRequestToday();
  const accounts = await getAllAccountsWithClients(today);
  const rollups = rollupByClient(accounts);
  return <ClientsListView rollups={rollups} />;
}
