// ============================================
// File: src/components/home/features-section.tsx
// Features Section Component
// ============================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import {
  FiShield,
  FiZap,
  FiDatabase,
  FiLock,
  FiUsers,
  FiTrendingUp,
  FiGlobe,
  FiSettings,
  FiCode,
} from "react-icons/fi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FeaturesSection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const features = [
    {
      icon: FiShield,
      title: "Enterprise Security",
      description: "Bank-level encryption and security measures to protect your data.",
    },
    {
      icon: FiZap,
      title: "Lightning Fast",
      description: "Optimized performance with Next.js 15 and modern architecture.",
    },
    {
      icon: FiDatabase,
      title: "PostgreSQL & Redis",
      description: "Powerful database with caching for optimal performance.",
    },
    {
      icon: FiLock,
      title: "Authentication",
      description: "Secure auth with NextAuth v5, JWT, and role-based access.",
    },
    {
      icon: FiUsers,
      title: "User Management",
      description: "Complete user system with profiles, logs, and permissions.",
    },
    {
      icon: FiTrendingUp,
      title: "Analytics Dashboard",
      description: "Real-time insights and comprehensive analytics built-in.",
    },
    {
      icon: FiGlobe,
      title: "PWA Ready",
      description: "Progressive Web App support for mobile installation.",
    },
    {
      icon: FiSettings,
      title: "Highly Customizable",
      description: "Modular architecture for easy customization and scaling.",
    },
    {
      icon: FiCode,
      title: "TypeScript",
      description: "Full type safety with TypeScript for better development.",
    },
  ];

  return (
    <section ref={ref} className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Launch
          </h2>
          <p className="text-lg text-muted-foreground">
            Built with modern technologies and best practices. Production-ready
            features that scale with your business.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50 group">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;


