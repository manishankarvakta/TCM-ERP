"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FiRefreshCw } from "react-icons/fi";
import { syncEmployeeBiometricIds } from "../_actions/employee.action";

export default function SyncBiometricButton() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleSync = () => {
    startTransition(async () => {
      const res = await syncEmployeeBiometricIds();
      if (res.success) {
        toast({
          title: "Biometric Sync Complete",
          description: res.message || "Employees and device mappings synced successfully.",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: res.error || "An error occurred during sync.",
        });
      }
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={isPending}
    >
      <FiRefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Syncing..." : "Map Users"}
    </Button>
  );
}
