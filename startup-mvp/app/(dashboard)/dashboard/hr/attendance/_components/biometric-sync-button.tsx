"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiUploadCloud } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface BiometricSyncButtonProps {
  date: string;
}

export default function BiometricSyncButton({ date }: BiometricSyncButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {/* 
        Simulating a device sync. In reality, the physical device hits a Webhook endpoint.
      */}
      <Button 
        variant="outline" 
        onClick={() => {
          startTransition(async () => {
            toast({ title: "Syncing...", description: "Connecting to biometric device..." });
            
            // Call the active TCP/IP puller
            const { triggerActiveDeviceSync } = await import("../_actions/biometric.action");
            const res = await triggerActiveDeviceSync();
              
            if(res.success) {
              toast({ title: "Sync Complete", description: res.message });
              router.refresh();
            } else {
              toast({ title: "Sync Error", description: res.error, variant: "destructive" });
            }
          });
        }}
        disabled={isPending}
      >
        <FiUploadCloud className={`mr-2 h-4 w-4 ${isPending ? "animate-bounce" : ""}`} />
        Sync Device
      </Button>
    </div>
  );
}
