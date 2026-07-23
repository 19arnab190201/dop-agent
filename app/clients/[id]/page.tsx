import { notFound } from "next/navigation";
import { ClientDetailView } from "@/components/clients/ClientDetailView";
import { getClientDetail, getCollectionsForAccounts, getLanguage, getEffectiveTemplates } from "@/lib/queries";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rollup = await getClientDetail(id);
  if (!rollup) notFound();

  const [history, language, templates] = await Promise.all([
    getCollectionsForAccounts(rollup.accounts.map((a) => a.id)),
    getLanguage(),
    getEffectiveTemplates(),
  ]);

  return <ClientDetailView rollup={rollup} history={history} language={language} templates={templates} />;
}
