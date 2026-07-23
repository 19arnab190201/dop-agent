import { Suspense } from "react";
import { TodayView } from "@/components/today/TodayView";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { getAllAccountsWithClients, getCollectionsToday, getLanguage, getEffectiveTemplates, getRequestToday } from "@/lib/queries";

export default function TodayPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TodayPageContent />
    </Suspense>
  );
}

async function TodayPageContent() {
  const today = await getRequestToday();
  const todayIso = today.toISOString().slice(0, 10);
  const [accounts, collectionsToday, language, templates] = await Promise.all([
    getAllAccountsWithClients(today),
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
