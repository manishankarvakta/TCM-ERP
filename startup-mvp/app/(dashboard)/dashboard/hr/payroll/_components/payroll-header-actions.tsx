"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus, FiSettings } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { generatePayroll } from "../_actions/payroll.action";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PayrollHeaderActionsProps {
  canCreate: boolean;
  canEdit: boolean;
}

export default function PayrollHeaderActions({ canCreate, canEdit }: PayrollHeaderActionsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleGenerate = () => {
    startTransition(async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const result = await generatePayroll(currentMonth, currentYear);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Payroll generated successfully for this month.",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate payroll.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button variant="outline" asChild>
          <Link href="/dashboard/hr/shifts">
            <FiSettings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      )}
      {canCreate && (
        <Button onClick={handleGenerate} disabled={isPending}>
          <FiPlus className="mr-2 h-4 w-4" />
          {isPending ? "Generating..." : "Generate This Month"}
        </Button>
      )}
    </div>
  );
}
