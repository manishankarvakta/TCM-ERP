import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/providers/theme-provider";
import StoreProvider from "@/components/ui/providers/store-provider";
import { ToastProvider } from "@/components/ui/providers/toast-provider";
// import { ThemeProvider } from "@/components/ui/providers/theme-provider";

// Font fallbacks for offline builds
const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "BHAGYAKUL",
  description: "BHAGYAKUL ERP",
  icons: {
    icon: "/site-icon.png",
    apple: "/site-icon.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <StoreProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </StoreProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
