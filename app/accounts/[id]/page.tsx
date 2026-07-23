import { notFound } from "next/navigation";
import { AccountDetailView } from "@/components/accounts/AccountDetailView";
import { getAccountDetail, getCollectionsForAccount, getLanguage, getEffectiveTemplates } from "@/lib/queries";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccountDetail(id);
  if (!account) notFound();

  const [history, language, templates] = await Promise.all([
    getCollectionsForAccount(id),
    getLanguage(),
    getEffectiveTemplates(),
  ]);

  return <AccountDetailView account={account} history={history} language={language} templates={templates} />;
}
