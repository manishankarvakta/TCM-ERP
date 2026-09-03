"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiEdit } from "react-icons/fi";
import LeadSheet from "./LeadSheet";
import { useRouter } from "next/navigation";

interface LeadEditButtonProps {
  lead: any;
}

export function LeadEditButton({ lead }: LeadEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button 
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2 shadow-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        disabled={lead.status === "CONVERTED"}
      >
        <FiEdit className="h-4 w-4" />
        Edit Lead
      </Button>

      <LeadSheet
        categories={[]}
        open={isOpen}
        onOpenChange={setIsOpen}
        lead={lead}
        onSuccess={() => {
          setIsOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
