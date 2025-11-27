// ============================================
// File: src/app/(pages)/about/page.tsx
// About Page
// ============================================

import React from "react";
import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiLinkedin, FiTwitter, FiGithub } from "react-icons/fi";

export const metadata: Metadata = {
  title: "About Us | Startup MVP",
  description: "Learn more about our mission and team",
};

export default function AboutPage() {
  const team = [
    {
      name: "John Doe",
      role: "CEO & Founder",
      bio: "10+ years of experience in building scalable applications.",
      initials: "JD",
      social: {
        linkedin: "#",
        twitter: "#",
        github: "#",
      },
    },
    {
      name: "Jane Smith",
      role: "CTO",
      bio: "Expert in cloud architecture and distributed systems.",
      initials: "JS",
      social: {
        linkedin: "#",
        twitter: "#",
        github: "#",
      },
    },
    {
      name: "Mike Johnson",
      role: "Lead Developer",
      bio: "Full-stack developer passionate about clean code.",
      initials: "MJ",
      social: {
        linkedin: "#",
        twitter: "#",
        github: "#",
      },
    },
  ];

  const values = [
    {
      title: "Innovation",
      description:
        "We constantly push boundaries to deliver cutting-edge solutions.",
    },
    {
      title: "Quality",
      description:
        "We never compromise on code quality and user experience.",
    },
    {
      title: "Community",
      description:
        "We believe in building together and supporting each other.",
    },
    {
      title: "Transparency",
      description:
        "We maintain open communication with our users and partners.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">About Startup MVP</h1>
            <p className="text-lg text-muted-foreground">
                {`We're on a mission to help developers and startups build amazing
                applications faster with our production-ready template.`}
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Started in 2024, Startup MVP was born from the frustration of
                repeatedly building the same authentication systems, dashboards, and
                boilerplate code for every new project.
              </p>
              <p>
                We realized that developers and startups were wasting valuable time on
                infrastructure instead of focusing on what makes their product unique.
                So we decided to build the ultimate starter template.
              </p>
              <p>
                Today, Startup MVP is trusted by thousands of developers worldwide,
                helping them launch their applications faster and with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value) => (
                <Card key={value.title}>
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Meet Our Team</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map((member) => (
                <Card key={member.name} className="text-center">
                  <CardContent className="pt-6 space-y-4">
                    <Avatar className="w-24 h-24 mx-auto">
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.bio}</p>
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={member.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FiLinkedin className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={member.social.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FiTwitter className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={member.social.github}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FiGithub className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Join Our Journey</h2>
            <p className="text-lg text-muted-foreground">
              Be part of a growing community of developers building the future.
            </p>
            <Button size="lg" asChild>
              <Link href="/app/(auth)/registration">Get Started Today</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}