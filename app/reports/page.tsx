import { ReportsView } from "@/components/reports/ReportsView";
import { getAllAccountsWithClients, getAllCollections, getEffectiveRdRules } from "@/lib/queries";

export default async function ReportsPage() {
  const [accounts, collections, rules] = await Promise.all([
    getAllAccountsWithClients(),
    getAllCollections(),
    getEffectiveRdRules(),
  ]);
  return <ReportsView accounts={accounts} collections={collections} rules={rules} />;
}
