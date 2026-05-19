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
          description: result.message || "Attendance processing started in the background.",
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
        This is a placeholder for the actual upload modal. 
        In a real integration, this would trigger a file upload or API sync.
      */}
      <Button variant="outline" disabled>
        <FiUploadCloud className="mr-2 h-4 w-4" />
        Sync Device
      </Button>
    </div>
  );
}
