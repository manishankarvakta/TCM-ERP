// ============================================
// File: src/components/home/how-it-works-section.tsx
// How It Works Section Component
// ============================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { FiDownload, FiSettings } from "react-icons/fi";
import { HiOutlineRocketLaunch } from "react-icons/hi2";

const HowItWorksSection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const steps = [
    {
      icon: FiDownload,
      title: "Sign Up",
      description: "Create your account in seconds with our simple registration process.",
      step: 1,
    },
    {
      icon: FiSettings,
      title: "Customize",
      description: "Configure your dashboard and settings to match your needs.",
      step: 2,
    },
    {
      icon: HiOutlineRocketLaunch,
      title: "Launch",
      description: "Deploy your application and start growing your business.",
      step: 3,
    },
  ];

  return (
    <section ref={ref} className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in three simple steps and launch your application today.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={isInView ? { scaleX: 1 } : {}}
                      transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                      className="h-full bg-primary origin-left"
                    />
                  </div>
                )}

                <div className="text-center space-y-4">
                  <div className="relative inline-flex">
                    <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto">
                      <Icon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;


