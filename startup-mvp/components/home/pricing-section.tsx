// ============================================
// File: src/components/home/pricing-section.tsx  
// Pricing Section Component
// ============================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FiCheck } from "react-icons/fi";

const PricingSection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const plans = [
    {
      name: "Starter",
      price: "$29",
      description: "Perfect for small projects",
      features: [
        "Up to 10 team members",
        "Basic analytics",
        "24/7 support",
        "5GB storage",
        "API access",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "$79",
      description: "For growing businesses",
      features: [
        "Unlimited team members",
        "Advanced analytics",
        "Priority support",
        "50GB storage",
        "API access",
        "Custom integrations",
        "Advanced security",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Everything in Professional",
        "Dedicated support",
        "Unlimited storage",
        "SLA guarantee",
        "Custom development",
        "On-premise deployment",
      ],
      popular: false,
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
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            {`Choose the plan that's right for you. All plans include a 14-day free trial.`}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full relative ${plan.popular ? "border-primary shadow-xl scale-105" : ""}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <FiCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/app/(auth)/registration">
                      {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;


