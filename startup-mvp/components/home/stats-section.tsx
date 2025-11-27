// ============================================
// File: src/components/home/stats-section.tsx
// Stats Section Component
// ============================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

const StatsSection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    { value: "10K+", label: "Active Users" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
    { value: "150+", label: "Countries" },
  ];

  return (
    <section ref={ref} className="py-16 bg-muted/30 border-y">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;


