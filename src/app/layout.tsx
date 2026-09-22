import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CartProvider } from "@/components/providers/CartProvider";
import { WishlistProvider } from "@/components/providers/WishlistProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { StorefrontChrome } from "@/components/layout/StorefrontChrome";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "M2Stores - Online Shopping in India",
    template: "%s | M2Stores",
  },
  description: "Shop the best products at M2Stores — India's premium online marketplace for electronics, fashion, home & more. Secure payments, easy returns.",
  keywords: ["e-commerce", "India", "shopping", "online store", "M2Stores", "electronics", "fashion"],
  authors: [{ name: "M2Stores" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "M2Stores",
    title: "M2Stores - Online Shopping in India",
    description: "Shop the best products at M2Stores — India's premium online marketplace.",
  },
  twitter: {
    card: "summary_large_image",
    title: "M2Stores - Online Shopping in India",
    description: "Shop the best products at M2Stores.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-surface-50 text-surface-900 antialiased min-h-dvh flex flex-col">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
                  >
                    Skip to content
                  </a>

                  <main id="main-content" className="flex-1">
                    <StorefrontChrome>{children}</StorefrontChrome>
                  </main>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
