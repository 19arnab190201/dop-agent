import { ClientsListView } from "@/components/clients/ClientsListView";
import { getAllAccountsWithClients, rollupByClient } from "@/lib/queries";

export default async function ClientsPage() {
  const accounts = await getAllAccountsWithClients();
  const rollups = rollupByClient(accounts);
  return <ClientsListView rollups={rollups} />;
}
