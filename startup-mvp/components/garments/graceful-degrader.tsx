import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FiLock, FiInfo } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface GracefulDegraderProps {
  isEnabled: boolean;
  moduleName: string;
  children: React.ReactNode;
}

export function GracefulDegrader({ isEnabled, moduleName, children }: GracefulDegraderProps) {
  if (isEnabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative space-y-6">
      {/* Informative Banner */}
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <FiInfo className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold">Garments Extension Required</AlertTitle>
        <AlertDescription className="text-amber-700 text-xs mt-1">
          The <strong>{moduleName}</strong> interface is part of the FashionFlow Garments Extension Pack. 
          Currently, garments features are disabled for this account. You are seeing a read-only preview.
        </AlertDescription>
      </Alert>

      {/* Grayed-out preview screen */}
      <div className="relative">
        <div className="absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px] pointer-events-none rounded-lg border border-dashed border-muted-foreground/20 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-background/80 p-6 rounded-xl border shadow-lg max-w-md pointer-events-auto">
            <FiLock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Feature Locked</h3>
            <p className="text-xs text-muted-foreground mt-2 mb-4">
              To fully utilize live tracking, automatic markers, and smart wastage alerts, enable this extension in settings.
            </p>
            <Button size="sm" variant="outline">
              Request Feature Access
            </Button>
          </div>
        </div>
        <div className="opacity-50 select-none pointer-events-none">
          {children}
        </div>
      </div>
    </div>
  );
}
