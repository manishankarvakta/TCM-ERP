"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiTrendingUp } from "react-icons/fi";
import LeadConversionDialog from "./LeadConversionDialog";
import { LeadStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

interface LeadConversionButtonProps {
  leadId: string;
  leadName: string;
  currentStatus: LeadStatus;
}

export function LeadConversionButton({
  leadId,
  leadName,
  currentStatus,
}: LeadConversionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  if (currentStatus === "CONVERTED") {
    return (
      <Button variant="outline" disabled className="gap-2 bg-slate-50">
        <FiTrendingUp className="text-muted-foreground" />
        Already Converted
      </Button>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className="gap-2 shadow-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <FiTrendingUp />
        Convert to Deal
      </Button>

      <LeadConversionDialog
        leadId={leadId}
        leadName={leadName}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
