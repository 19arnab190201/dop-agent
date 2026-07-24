import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { BottomTabs, BottomTabsSkeleton } from "@/components/layout/BottomTabs";
import { Sidebar, SidebarSkeleton } from "@/components/layout/Sidebar";
import { TopBar, TopBarSkeleton } from "@/components/layout/TopBar";
import { RegisterServiceWorker } from "@/components/layout/RegisterServiceWorker";
import { getSearchIndex, getLastImportAt, getRequestToday } from "@/lib/queries";

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

// getRequestToday() calls connection() first, which pushes this whole subtree to request time —
// without it, having no request-time dependency makes Next eagerly fill this cache during
// `next build` itself (as part of the static shell), requiring a live DB round-trip at build time.
async function ShellTopBar() {
  await getRequestToday();
  let lastImportAt: string | null = null;
  let searchIndex: Awaited<ReturnType<typeof getSearchIndex>> = [];
  try {
    [lastImportAt, searchIndex] = await Promise.all([getLastImportAt(), getSearchIndex()]);
  } catch (err) {
    console.error("Failed to load shell data (is DATABASE_URL configured?):", err);
  }
  return <TopBar lastImportAt={lastImportAt} searchIndex={searchIndex} />;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <Suspense fallback={<SidebarSkeleton />}>
              <Sidebar />
            </Suspense>
            <div className="flex min-h-svh flex-col lg:pl-56">
              <Suspense fallback={<TopBarSkeleton />}>
                <ShellTopBar />
              </Suspense>
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
