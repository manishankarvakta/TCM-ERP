"use client";

import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";

export default function ChallanPrintButton() {
  return (
    <Button variant="default" onClick={() => window.print()}>
      <FiPrinter className="mr-2 h-4 w-4" />
      Print Challan
    </Button>
  );
}
