"use client";

import React from "react";
import Link from "next/link";
import Logo from "./logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
import {
  FiMail,
  FiMapPin,
  FiPhone,
  FiFacebook,
  FiTwitter,
  FiLinkedin,
  FiGithub,
  FiInstagram,
  FiYoutube,
  FiSend,
} from "react-icons/fi";

const Footer = () => {
  const [email, setEmail] = React.useState("");
  const [isSubscribing, setIsSubscribing] = React.useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log("Subscribed:", email);
      setEmail("");
      setIsSubscribing(false);
    }, 1000);
  };

  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Use Cases", href: "/use-cases" },
        { label: "Integrations", href: "/integrations" },
        { label: "Roadmap", href: "/roadmap" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Blog", href: "/blog" },
        { label: "Press Kit", href: "/press" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "/docs" },
        { label: "API Reference", href: "/api" },
        { label: "Tutorials", href: "/tutorials" },
        { label: "Help Center", href: "/help" },
        { label: "Community", href: "/community" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "GDPR", href: "/gdpr" },
        { label: "Security", href: "/security" },
      ],
    },
  ];

  const socialLinks = [
    { icon: FiFacebook, href: "https://facebook.com", label: "Facebook" },
    { icon: FiTwitter, href: "https://twitter.com", label: "Twitter" },
    { icon: FiLinkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: FiGithub, href: "https://github.com", label: "GitHub" },
    { icon: FiInstagram, href: "https://instagram.com", label: "Instagram" },
    { icon: FiYoutube, href: "https://youtube.com", label: "YouTube" },
  ];

  const contactInfo = [
    {
      icon: FiMail,
      label: "Email",
      value: "hello@startup.com",
      href: "mailto:hello@startup.com",
    },
    {
      icon: FiPhone,
      label: "Phone",
      value: "+1 (555) 123-4567",
      href: "tel:+15551234567",
    },
    {
      icon: FiMapPin,
      label: "Address",
      value: "123 Business St, Tech City, TC 12345",
      href: "#",
    },
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          {/* Company Info & Newsletter */}
          <div className="lg:col-span-2 space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground">
              Building the future of startup applications with modern tools and
              best practices. Join thousands of users already growing their
              business with us.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 pt-2">
              {contactInfo.map((info) => {
                const Icon = info.icon;
                return (
                  <a
                    key={info.label}
                    href={info.href}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 group-hover:text-primary transition-colors" />
                    <span>{info.value}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="font-semibold text-sm">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* <Separator className="my-8" /> */}

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <div className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} Startup MVP. All rights reserved.
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <Button
                  key={social.label}
                  variant="ghost"
                  size="icon"
                  asChild
                  className="hover:text-primary transition-colors"
                >
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </Button>
              );
            })}
          </div>

          {/* Additional Links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/sitemap" className="hover:text-foreground transition-colors">
              Sitemap
            </Link>
            <span>•</span>
            <Link href="/status" className="hover:text-foreground transition-colors">
              Status
            </Link>
            <span>•</span>
            <Link href="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-8 right-8 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 z-40 group"
        aria-label="Back to top"
      >
        <svg
          className="w-5 h-5 transform group-hover:-translate-y-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </footer>
  );
};

export default Footer;