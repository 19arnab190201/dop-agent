import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { BottomTabs, BottomTabsSkeleton } from "@/components/layout/BottomTabs";
import { Sidebar, SidebarSkeleton } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RegisterServiceWorker } from "@/components/layout/RegisterServiceWorker";
import { getSearchIndex, getLastImportAt } from "@/lib/queries";
import type { SearchIndexItem } from "@/components/layout/SearchOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RD Agent Dashboard",
  description: "Postal RD agent client management dashboard",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "RD Agent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

async function loadShellData(): Promise<{ lastImportAt: string | null; searchIndex: SearchIndexItem[] }> {
  try {
    const [lastImportAt, searchIndex] = await Promise.all([getLastImportAt(), getSearchIndex()]);
    return { lastImportAt, searchIndex };
  } catch (err) {
    console.error("Failed to load shell data (is DATABASE_URL configured?):", err);
    return { lastImportAt: null, searchIndex: [] };
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { lastImportAt, searchIndex } = await loadShellData();

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <Suspense fallback={<SidebarSkeleton />}>
              <Sidebar />
            </Suspense>
            <div className="flex min-h-svh flex-col lg:pl-56">
              <TopBar lastImportAt={lastImportAt} searchIndex={searchIndex} />
              <main className="flex-1 pb-20 lg:pb-6">{children}</main>
            </div>
            <Suspense fallback={<BottomTabsSkeleton />}>
              <BottomTabs />
            </Suspense>
            <Toaster />
            <RegisterServiceWorker />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
