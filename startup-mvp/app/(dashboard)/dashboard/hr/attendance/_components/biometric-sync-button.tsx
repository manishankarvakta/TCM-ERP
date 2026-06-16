"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiRefreshCw, FiUploadCloud } from "react-icons/fi";
import { triggerAttendanceProcessing } from "../_actions/biometric.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface BiometricSyncButtonProps {
  date: string;
}

export default function BiometricSyncButton({ date }: BiometricSyncButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleProcess = () => {
    startTransition(async () => {
      const selectedDate = new Date(date);
      const result = await triggerAttendanceProcessing(selectedDate, selectedDate);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Processed ${result.processedCount} attendance records from biometric logs.`,
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process logs",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={handleProcess} 
        disabled={isPending}
      >
        <FiRefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Processing..." : "Process Biometric Logs"}
      </Button>
      
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
