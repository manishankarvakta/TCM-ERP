"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import CashBankFormDialog from "./cash-bank-form-dialog";

export default function AddCashBankAccountModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow"
      >
        <FiPlus className="mr-2 h-4 w-4" />
        Add Account
      </Button>

      <CashBankFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
