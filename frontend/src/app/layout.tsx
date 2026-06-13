import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HotByte | Digital Menu & Ordering Platform",
  description:
    "HotByte transforms dining with a seamless digital menu experience. Order directly from your table with our smart, fast, and modern platform.",
  keywords:
    "HotByte, digital menu, restaurant ordering, table ordering, smart menu, food ordering system, QR menu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d11" },
  ],
};

import { LocaleProvider } from "../context/LocaleContext";
import I18nProvider from "../components/I18nProvider";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} min-h-full antialiased`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
            try {
              if (localStorage.getItem('hotbyte_theme') === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {}
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300" suppressHydrationWarning>
        <I18nProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
