// ============================================
// File: src/app/(auth)/layout.tsx
// Authentication Layout - Split Screen Design with Testimonial
// Inspired by shadcn UI authentication example
// ============================================

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Logo from "@/components/layout/logo";
import PoweredByChip from "@/components/common/powered-by-chip";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[url('/auth-bg.jpg')] bg-cover bg-center min-h-screen">
    {/* Left Side - Branding & Testimonial */}
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-muted/30 p-8 lg:p-12">
      <div>
        <Link href="/" className="inline-flex items-center hover:opacity-80 transition-opacity mb-8">
          <Logo width={200} height={100} />
        </Link>
      </div>
      
      <div className="space-y-6">
        <blockquote className="text-lg leading-relaxed">
          <p className="text-foreground">
            "This library has saved me countless hours of work and helped me deliver stunning designs to my clients faster than ever before."
          </p>
          <footer className="mt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">SD</span>
              </div>
              <div>
                <div className="font-semibold text-foreground">Sofia Davis</div>
                <div className="text-sm text-muted-foreground">Product Designer</div>
              </div>
            </div>
          </footer>
        </blockquote>
      </div>

      <div className="text-sm text-muted-foreground flex flex-col items-start gap-2">
        <p>© 2025 All rights reserved.</p>
        <div className="flex items-center gap-2">
          <span>Powered by</span>
          <Link href="https://techsoulbd.com">
            techsoul
          </Link>
        </div>
      </div>
    </div>

    {/* Right Side - Auth Form */}
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between p-4 lg:p-6">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors lg:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

        <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
