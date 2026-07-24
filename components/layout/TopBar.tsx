import { Badge } from "@/components/ui/badge";
import { SearchOverlay, type SearchIndexItem } from "./SearchOverlay";
import { ThemeToggle } from "./ThemeToggle";
import { formatDateDisplay } from "@/lib/format";

export function TopBar({
  lastImportAt,
  searchIndex,
}: {
  lastImportAt: string | null;
  searchIndex: SearchIndexItem[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <span className="text-base font-semibold lg:hidden">RD Agent</span>
      {lastImportAt && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Last import {formatDateDisplay(lastImportAt)}
        </Badge>
      )}
      <div className="ml-auto flex items-center gap-1">
        <SearchOverlay index={searchIndex} />
        <ThemeToggle />
      </div>
    </header>
  );
}

// lastImportAt/searchIndex come from a Suspense-wrapped, connection()-gated fetch in layout.tsx
// (so it's request-time, not eagerly filled during `next build`) — this fallback keeps the same
// header shape (no badge, no search index yet) so there's no layout shift while that streams in.
export function TopBarSkeleton() {
  return <TopBar lastImportAt={null} searchIndex={[]} />;
}
