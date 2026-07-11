// ============================================
// File: src/app/page.tsx
// Home Page - Landing Page
// ============================================

// import React from "react";
// import Footer from "@/components/common/footer";
// import HeroSection from "@/components/home/hero-section";
// import FeaturesSection from "@/components/home/features-section";
// import HowItWorksSection from "@/components/home/how-it-works-section";
// import PricingSection from "@/components/home/pricing-section";
// import TestimonialsSection from "@/components/home/testimonials-section";
// import StatsSection from "@/components/home/stats-section";
// import CTASection from "@/components/home/cta-section";
import { Metadata } from "next";
// import Header from "@/components/common/header";
import LoginForm from "@/components/forms/login-form";
import Logo from "@/components/layout/logo";
// import PoweredByChip from "@/components/common/powered-by-chip";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Startup MVP - Build Your Dream Application",
  description: "The complete startup template with authentication, dashboard, and modern features built with Next.js 15, TypeScript, and Tailwind CSS.",
};

export default function HomePage() {
  console.log("HomePage", process.env.DATABASE_URL);
  return (
    <div className="min-h-screen flex bg-[url('/auth-bg.jpg')] bg-cover bg-center min-h-screen">
      {/* Left Side - Branding & Testimonial */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-white/10 backdrop-blur-sm dark:bg-black/30 dark:backdrop-blur-sm justify-between border-r border-white/10 p-8 lg:p-12 relative text-white">

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center hover:opacity-80 transition-opacity mb-8">
            <div className="invert dark:invert-0">
              <Logo width={200} height={100} />
            </div>
          </Link>
        </div>
        
        <div className="space-y-6 relative z-10">
          <blockquote className="text-lg leading-relaxed">
            <p className="text-zinc-100">
              "TS CRM has been a game-changer for our business. It's intuitive, powerful, and has helped us streamline our operations and improve productivity."
            </p>
            <footer className="mt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">MV</span>
                </div>
                <div>
                  <div className="font-semibold text-zinc-100">Manishankar Vakta</div>
                  <div className="text-sm text-zinc-400">CEO of TechSoul</div>
                </div>
              </div>
            </footer>
          </blockquote>
        </div>

        <div className="text-sm text-zinc-400 flex flex-col items-start gap-2 relative z-10">
          <p>© 2025 All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <Link href="https://techsoulbd.com" className="text-zinc-300 hover:text-white transition-colors">Techsoul</Link>
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

        <main className="flex-1 flex items-center justify-center p-4 lg:p-8 ">
          <div className="w-full max-w-md">
          
            <div className="space-y-6 bg-white/40 backdrop-blur-sm dark:bg-black/40 p-8 rounded-lg">
              <div className="space-y-2 text-center lg:text-left">
                <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email below to login to your account
                </p>
              </div>
              <LoginForm />
            </div>
            </div>
        </main>
      </div>
    </div>
  );
}