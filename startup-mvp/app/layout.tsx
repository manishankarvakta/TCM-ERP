import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/providers/theme-provider";
import StoreProvider from "@/components/ui/providers/store-provider";
import { ToastProvider } from "@/components/ui/providers/toast-provider";
import { auth } from "@/lib/auth";
import { SocketProvider } from "@/components/providers/SocketProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TECHSOUL",
  description: "Interior design and project management platform",
  icons: {
    icon: "/site-icon.png",
    apple: "/site-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
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
            <SocketProvider userId={session?.user?.id}>
              <StoreProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </StoreProvider>
            </SocketProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
