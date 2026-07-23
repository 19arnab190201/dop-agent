import { TodayView } from "@/components/today/TodayView";
import { getAllAccountsWithClients, getCollectionsToday, getLanguage, getEffectiveTemplates } from "@/lib/queries";

export default async function TodayPage() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [accounts, collectionsToday, language, templates] = await Promise.all([
    getAllAccountsWithClients(),
    getCollectionsToday(todayIso),
    getLanguage(),
    getEffectiveTemplates(),
  ]);

  return (
    <TodayView
      accounts={accounts}
      collectionsToday={collectionsToday}
      todayIso={todayIso}
      language={language}
      templates={templates}
    />
  );
}
