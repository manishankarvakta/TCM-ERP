// ============================================
// File: src/app/(pages)/features/page.tsx
// Features Page
// ============================================

import React from "react";
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
  FiSmartphone,
  FiBell,
  FiLayout,
} from "react-icons/fi";

export const metadata: Metadata = {
  title: "Features | Startup MVP",
  description: "Explore all the powerful features of our startup template",
};

export default function FeaturesPage() {
  const features = [
    {
      icon: FiShield,
      title: "Enterprise Security",
      description:
        "Bank-level encryption, secure authentication, and comprehensive security measures to protect your data and users.",
      features: [
        "End-to-end encryption",
        "Two-factor authentication",
        "Role-based access control",
        "Security audit logs",
      ],
      category: "Security",
    },
    {
      icon: FiZap,
      title: "Lightning Performance",
      description:
        "Built with Next.js 15 and optimized for speed. Enjoy blazing fast load times and seamless user experience.",
      features: [
        "Server-side rendering",
        "Edge caching with Redis",
        "Image optimization",
        "Code splitting",
      ],
      category: "Performance",
    },
    {
      icon: FiDatabase,
      title: "Powerful Database",
      description:
        "PostgreSQL with Prisma ORM for reliable data management. Redis for caching and real-time features.",
      features: [
        "PostgreSQL database",
        "Prisma ORM",
        "Redis caching",
        "Data migrations",
      ],
      category: "Database",
    },
    {
      icon: FiLock,
      title: "Advanced Authentication",
      description:
        "Complete authentication system with NextAuth v5, supporting multiple providers and secure session management.",
      features: [
        "Email/password authentication",
        "OAuth providers",
        "JWT tokens",
        "Session management",
      ],
      category: "Authentication",
    },
    {
      icon: FiUsers,
      title: "User Management",
      description:
        "Comprehensive user system with profiles, permissions, activity logs, and admin controls.",
      features: [
        "User profiles",
        "Permission system",
        "Activity tracking",
        "Admin dashboard",
      ],
      category: "Users",
    },
    {
      icon: FiTrendingUp,
      title: "Analytics & Insights",
      description:
        "Built-in analytics dashboard with real-time metrics, charts, and comprehensive reporting.",
      features: [
        "Real-time metrics",
        "Custom reports",
        "Data visualization",
        "Export capabilities",
      ],
      category: "Analytics",
    },
    {
      icon: FiGlobe,
      title: "PWA Support",
      description:
        "Progressive Web App capabilities for mobile installation, offline access, and native-like experience.",
      features: [
        "Mobile installation",
        "Offline mode",
        "Push notifications",
        "App-like experience",
      ],
      category: "Mobile",
    },
    {
      icon: FiSettings,
      title: "Highly Customizable",
      description:
        "Modular architecture with customizable components, themes, and configurations for your needs.",
      features: [
        "Component library",
        "Theme customization",
        "Plugin system",
        "API extensibility",
      ],
      category: "Customization",
    },
    {
      icon: FiCode,
      title: "TypeScript & Type Safety",
      description:
        "Full TypeScript support with comprehensive type definitions for safer and more maintainable code.",
      features: [
        "100% TypeScript",
        "Type inference",
        "Auto-completion",
        "Compile-time checks",
      ],
      category: "Development",
    },
    {
      icon: FiSmartphone,
      title: "Responsive Design",
      description:
        "Fully responsive UI that works perfectly on all devices, from mobile phones to large desktop screens.",
      features: [
        "Mobile-first design",
        "Tablet optimization",
        "Desktop layouts",
        "Touch-friendly",
      ],
      category: "UI/UX",
    },
    {
      icon: FiBell,
      title: "Notification System",
      description:
        "Real-time notifications with Redux state management, toast messages, and customizable alerts.",
      features: [
        "Toast notifications",
        "Real-time updates",
        "Email notifications",
        "Custom alerts",
      ],
      category: "Communication",
    },
    {
      icon: FiLayout,
      title: "Dashboard Templates",
      description:
        "Pre-built dashboard layouts with sidebar navigation, header, and customizable widgets.",
      features: [
        "Admin dashboard",
        "User dashboard",
        "Analytics views",
        "Custom layouts",
      ],
      category: "Templates",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 pt-32 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge className="mb-4">All Features</Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Everything You Need to Build & Scale
            </h1>
            <p className="text-lg text-muted-foreground">
              Production-ready features built with modern technologies. Start building
              your application with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="hover:shadow-lg transition-all duration-300 hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline">{feature.category}</Badge>
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Experience These Features?
            </h2>
            <p className="text-lg text-muted-foreground">
              Start your free trial today and see how our template can accelerate your
              development.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" asChild>
                <Link href="/app/(auth)/registration">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
