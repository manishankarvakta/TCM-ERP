// ============================================
// File: src/components/home/cta-section.tsx
// Call-to-Action Section Component
// ============================================

"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FiArrowRight } from "react-icons/fi";

const CTASection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-20 md:py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center max-w-3xl mx-auto space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Join thousands of developers and startups building amazing applications
            with our template. Start your free trial today.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button size="lg" asChild className="group">
              <Link href="/app/(auth)/registration">
                Start Free Trial
                <FiArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">Talk to Sales</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;