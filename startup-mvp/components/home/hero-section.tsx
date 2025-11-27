// ============================================
// File: src/components/home/hero-section.tsx
// Hero Section Component
// ============================================

"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FiArrowRight, FiPlay, FiCheck } from "react-icons/fi";

const HeroSection = () => {
  const features = [
    "No credit card required",
    "14-day free trial",
    "Cancel anytime",
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              🎉 Now in Beta - Join 10,000+ users
            </motion.div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Build Your Dream{" "}
                <span className="text-primary">Application</span> Faster
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                Complete startup template with authentication, dashboard, database,
                and all the modern features you need to launch your SaaS faster.
              </p>
            </div>

            {/* Features List */}
            <div className="flex flex-wrap gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <FiCheck className="h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Button size="lg" asChild className="group">
                <Link href="/app/(auth)/registration">
                  Get Started Free
                  <FiArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="group">
                <FiPlay className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-background flex items-center justify-center text-primary-foreground text-sm font-semibold"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-semibold">10,000+ Happy Users</div>
                <div className="text-muted-foreground">Join our community</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative"
          >
            <div className="relative rounded-xl border bg-card shadow-2xl overflow-hidden">
              {/* Mock Dashboard UI */}
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 p-8">
                <div className="space-y-4">
                  {/* Header Bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive"></div>
                    <div className="w-3 h-3 rounded-full bg-accent"></div>
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <div className="h-12 bg-background/50 backdrop-blur rounded-lg animate-pulse"></div>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-24 bg-background/50 backdrop-blur rounded-lg animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        ></div>
                      ))}
                    </div>
                    <div className="h-32 bg-background/50 backdrop-blur rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-lg"
              >
                ⚡ Live Preview
              </motion.div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;


