"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PoweredByChipProps {
  href?: string;
  logoWidth?: number;
  logoHeight?: number;
  className?: string;
}

const PoweredByChip = ({  
  href = "https://techsoulbd.com", 
  logoWidth = 80, 
  logoHeight = 40,
  className 
}: PoweredByChipProps) => {
  const chipContent = (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* IC Chip Container */}
      <div className="relative">
        {/* Top Pins */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={`top-${i}`}
              className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/60 dark:from-muted-foreground/60 dark:to-muted-foreground/80 border border-border/50 shadow-sm"
            />
          ))}
        </div>

        {/* Bottom Pins */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={`bottom-${i}`}
              className="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/60 dark:from-muted-foreground/60 dark:to-muted-foreground/80 border border-border/50 shadow-sm"
            />
          ))}
        </div>

        {/* Left Pins */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 flex flex-col gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={`left-${i}`}
              className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 dark:from-muted-foreground/60 dark:to-muted-foreground/80 border border-border/50 shadow-sm"
            />
          ))}
        </div>

        {/* Right Pins */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 flex flex-col gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={`right-${i}`}
              className="w-2.5 h-2.5 rounded-sm bg-gradient-to-l from-muted-foreground/40 to-muted-foreground/60 dark:from-muted-foreground/60 dark:to-muted-foreground/80 border border-border/50 shadow-sm"
            />
          ))}
        </div>

        {/* Chip Body */}
        <div className="relative bg-gradient-to-br from-muted/80 to-muted dark:from-muted/60 dark:to-muted/40 border-2 border-border/60 dark:border-border/40 rounded-lg px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Chip surface texture */}
          <div className="absolute inset-0 rounded-lg opacity-30 dark:opacity-20">
            <div className="absolute inset-0 rounded-lg" style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(0, 0, 0, 0.03) 2px,
                rgba(0, 0, 0, 0.03) 4px
              )`
            }} />
          </div>

          {/* Logo Container */}
          <div className="relative z-10 flex items-center justify-center">
            <Image
              className="dark:invert opacity-90 group-hover:opacity-100 transition-opacity duration-300"
              src="/logo.png"
              alt="Techsoul Logo"
              width={logoWidth}
              height={logoHeight}
              priority
            />
          </div>

          {/* Subtle corner indicators */}
          <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-primary/30 dark:bg-primary/40" />
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary/30 dark:bg-primary/40" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block hover:opacity-90 transition-opacity"
      >
        {chipContent}
      </Link>
    );
  }

  return chipContent;
};

export default PoweredByChip;

