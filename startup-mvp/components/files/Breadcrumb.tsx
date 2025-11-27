"use client";

import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const segments = path === "/" ? [] : path.split("/").filter(Boolean);

  return (
    <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate("/")}
        className="h-8 px-2"
      >
        <Home className="h-4 w-4" />
      </Button>
      
      {segments.length > 0 && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {segments.map((segment, index) => {
            const segmentPath = `/${segments.slice(0, index + 1).join("/")}`;
            const isLast = index === segments.length - 1;

            return (
              <div key={segmentPath} className="flex items-center space-x-1">
                {isLast ? (
                  <span className="font-medium text-foreground">{segment}</span>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(segmentPath)}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      {segment}
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
    </nav>
  );
}

