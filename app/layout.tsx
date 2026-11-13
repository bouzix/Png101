import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import prisma from "@/lib/db";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCodeInjection } from "@/lib/code-injection";
import { getWebsiteInfo } from "@/lib/website-info";
import { getErrorPagesConfig } from "@/lib/error-pages";
import { checkAndRunScheduledSeoGeneration } from "@/lib/seo-generator";
import CodeInjector from "./components/CodeInjector";
import Footer from "./components/Footer";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const info = await getWebsiteInfo();
    const title = info.websiteName || "PNG Finder";

    return {
      title: {
        default: title,
        template: `%s - ${title}`
      },
      description: info.tagline || "Find high-quality PNG images",
    };
  } catch (error) {
    console.error("Error fetching website title:", error);
    return {
      title: "PNG Finder",
      description: "Find high-quality PNG images",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Trigger background scheduled SEO sitemap regeneration if due
  void checkAndRunScheduledSeoGeneration();

  const [
    { headCode, bodyCode, footerCode },
    websiteInfo,
    errorPagesConfig,
    headersList,
    cookieStore,
  ] = await Promise.all([
    getCodeInjection(),
    getWebsiteInfo(),
    getErrorPagesConfig(),
    headers(),
    cookies(),
  ]);

  const pathname = headersList.get('x-pathname') || '';
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  // Maintenance Mode Guard
  const isMaintenanceActive = Boolean(errorPagesConfig.maintenance?.enabled);
  if (isMaintenanceActive) {
    // Exempt paths:
    // 1. Admin dashboard & admin login (/admin, /admin/dashboard/...)
    // 2. Teams login & dashboard (/team/login, /team/...)
    // 3. Essential APIs (/api/...)
    // 4. Maintenance page itself (/maintenance)
    const isExempt =
      cleanPath.startsWith('/admin') ||
      cleanPath.startsWith('/team') ||
      cleanPath.startsWith('/api') ||
      cleanPath === '/maintenance';

    if (!isExempt) {
      redirect('/maintenance');
    }
  } else {
    // If maintenance mode is OFF, redirect regular visitors from /maintenance back to /
    const token = cookieStore.get('auth_token')?.value;
    const isSuperAdmin = token === 'authenticated';
    if (!isSuperAdmin && cleanPath === '/maintenance') {
      redirect('/');
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CodeInjector html={headCode} location="head" />
        <CodeInjector html={bodyCode} location="body" />
        <NextTopLoader
          color="#3b82f6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
        />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Footer info={websiteInfo} />
        <Toaster position="bottom-right" richColors />
        <CodeInjector html={footerCode} location="footer" />
      </body>
    </html>
  );
}
