"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FiPrinter } from "react-icons/fi";

export default function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <FiPrinter className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}
