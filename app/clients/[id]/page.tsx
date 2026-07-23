import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ClientDetailView } from "@/components/clients/ClientDetailView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getClientDetail, getCollectionsForAccounts, getLanguage, getEffectiveTemplates, getRequestToday } from "@/lib/queries";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientDetailPageContent params={params} />
    </Suspense>
  );
}

async function ClientDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = await getRequestToday();
  const rollup = await getClientDetail(id, today);
  if (!rollup) notFound();

  const [history, language, templates] = await Promise.all([
    getCollectionsForAccounts(rollup.accounts.map((a) => a.id)),
    getLanguage(),
    getEffectiveTemplates(),
  ]);

  return <ClientDetailView rollup={rollup} history={history} language={language} templates={templates} />;
}
