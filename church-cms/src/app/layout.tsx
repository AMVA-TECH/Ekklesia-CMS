import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Sans, Fraunces } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { IntlProvider } from "@/app/_ekklesia/i18n/intl-provider";
import { DEFAULT_LOCALE } from "@/i18n/config";
import "./globals.css";

// DM Sans: all UI. Fraunces: scripture/devotional quote class only (not chrome).
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  const appName = t("homeTitle");
  return {
    title: {
      default: appName,
      template: `%s · ${appName}`,
    },
    description: t("homeDescription"),
    icons: {
      icon: [
        { url: "/branding/favicon.svg", type: "image/svg+xml" },
        { url: "/branding/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/branding/favicon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      ],
      shortcut: "/branding/favicon.svg",
      apple: [
        {
          url: "/branding/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#F7F8F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      suppressHydrationWarning
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Suspense fallback={null}>
          <IntlProvider>{children}</IntlProvider>
        </Suspense>
      </body>
    </html>
  );
}
