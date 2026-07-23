import { CommissionView } from "@/components/commission/CommissionView";
import { getAllAccountsWithClients, rollupByClient, getAllCollections, getEffectiveRdRules } from "@/lib/queries";

export default async function CommissionPage() {
  const [accounts, collections, rules] = await Promise.all([
    getAllAccountsWithClients(),
    getAllCollections(),
    getEffectiveRdRules(),
  ]);
  const rollups = rollupByClient(accounts);

  return <CommissionView accounts={accounts} rollups={rollups} collections={collections} rules={rules} />;
}
