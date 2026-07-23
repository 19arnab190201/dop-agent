import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AccountDetailView } from "@/components/accounts/AccountDetailView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAccountDetail, getCollectionsForAccount, getLanguage, getEffectiveTemplates, getRequestToday } from "@/lib/queries";

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountDetailPageContent params={params} />
    </Suspense>
  );
}

async function AccountDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = await getRequestToday();
  const account = await getAccountDetail(id, today);
  if (!account) notFound();

  const [history, language, templates] = await Promise.all([
    getCollectionsForAccount(id),
    getLanguage(),
    getEffectiveTemplates(),
  ]);

  return <AccountDetailView account={account} history={history} language={language} templates={templates} />;
}
