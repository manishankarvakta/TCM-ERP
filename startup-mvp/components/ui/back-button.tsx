"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

interface BackButtonProps {
  fallbackUrl: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function BackButton({ fallbackUrl, className, variant = "ghost", size = "icon" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={() => {
        if (window.history.length > 2) {
          router.back();
        } else {
          router.push(fallbackUrl);
        }
      }}
      className={className}
    >
      <ArrowLeftIcon className="h-4 w-4" />
    </Button>
  );
}
