// ============================================
// File: src/app/page.tsx
// Home Page - Landing Page
// ============================================

import React from "react";
import Footer from "@/components/common/footer";
import HeroSection from "@/components/home/hero-section";
import FeaturesSection from "@/components/home/features-section";
import HowItWorksSection from "@/components/home/how-it-works-section";
import PricingSection from "@/components/home/pricing-section";
import TestimonialsSection from "@/components/home/testimonials-section";
import StatsSection from "@/components/home/stats-section";
import CTASection from "@/components/home/cta-section";
import { Metadata } from "next";
import Header from "@/components/common/header";

export const metadata: Metadata = {
  title: "Startup MVP - Build Your Dream Application",
  description: "The complete startup template with authentication, dashboard, and modern features built with Next.js 15, TypeScript, and Tailwind CSS.",
};

export default function HomePage() {
  console.log("HomePage", process.env.DATABASE_URL);
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}