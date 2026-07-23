import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RegisterServiceWorker } from "@/components/layout/RegisterServiceWorker";
import { getAllAccountsWithClients, getLastImportAt } from "@/lib/queries";
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

// This is a live operational dashboard (collections, imports) — never statically prerender.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

async function loadShellData(): Promise<{ lastImportAt: string | null; searchIndex: SearchIndexItem[] }> {
  try {
    const [lastImportAt, accountsWithClients] = await Promise.all([getLastImportAt(), getAllAccountsWithClients()]);
    return {
      lastImportAt,
      searchIndex: accountsWithClients.map((a) => ({
        id: a.id,
        clientId: a.client.id,
        accountName: a.accountName,
        accountNo: a.id,
      })),
    };
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
            <Sidebar />
            <div className="flex min-h-svh flex-col lg:pl-56">
              <TopBar lastImportAt={lastImportAt} searchIndex={searchIndex} />
              <main className="flex-1 pb-20 lg:pb-6">{children}</main>
            </div>
            <BottomTabs />
            <Toaster />
            <RegisterServiceWorker />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
