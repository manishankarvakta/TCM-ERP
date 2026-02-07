"use client";

import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";

export default function VoucherPrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <FiPrinter className="mr-2 h-4 w-4" />
      Print Voucher
    </Button>
  );
}
