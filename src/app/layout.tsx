import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akcije - Stock Dashboard",
  description: "Prati Top Gainers & Losers akcije sa TradingView chartovima, AI preporukama i najnovijim vestima.",
  keywords: ["akcije", "stock", "dashboard", "TradingView", "gainers", "losers", "berza", "investiranje"],
  authors: [{ name: "gesprem-creator" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2322c55e'/><text x='50' y='68' font-size='50' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold'>S</text></svg>",
  },
  openGraph: {
    title: "Akcije - Stock Dashboard",
    description: "Prati Top Gainers & Losers akcije sa TradingView chartovima",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akcije - Stock Dashboard",
    description: "Prati Top Gainers & Losers akcije sa TradingView chartovima",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
