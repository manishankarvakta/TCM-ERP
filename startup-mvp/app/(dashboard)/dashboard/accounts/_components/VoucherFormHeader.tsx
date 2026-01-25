"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FiHelpCircle, FiClock } from "react-icons/fi";
import { generatePreviewVoucherNumber, getKeyboardShortcuts, formatDate } from "../_lib/voucher-form-helpers";
import { cn } from "@/lib/utils";

interface VoucherFormHeaderProps {
  voucherType: "PAYMENT" | "RECEIPT" | "CONTRA" | "JOURNAL";
  title: string;
  description?: string;
  className?: string;
}

const voucherTypeColors = {
  PAYMENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  RECEIPT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CONTRA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  JOURNAL: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const voucherTypeLabels = {
  PAYMENT: "Payment Voucher",
  RECEIPT: "Receipt Voucher",
  CONTRA: "Contra Voucher",
  JOURNAL: "Journal Voucher",
};

export default function VoucherFormHeader({
  voucherType,
  title,
  description,
  className,
}: VoucherFormHeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const previewNumber = generatePreviewVoucherNumber(voucherType);
  const shortcuts = getKeyboardShortcuts();

  return (
    <div className={cn("sticky top-0 z-10 bg-background border-b pb-4 mb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={voucherTypeColors[voucherType]} variant="secondary">
              {voucherTypeLabels[voucherType]}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {previewNumber}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Current Date/Time */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <FiClock className="h-4 w-4" />
            <span>{formatDate(new Date())}</span>
          </div>

          {/* Help Dialog */}
          <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <FiHelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Help & Keyboard Shortcuts</DialogTitle>
                <DialogDescription>
                  Quick reference for {voucherTypeLabels[voucherType]}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Keyboard Shortcuts */}
                <div>
                  <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.ctrl && (
                            <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                              Ctrl
                            </kbd>
                          )}
                          {shortcut.shift && (
                            <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                              Shift
                            </kbd>
                          )}
                          {shortcut.alt && (
                            <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                              Alt
                            </kbd>
                          )}
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded">
                            {shortcut.key}
                          </kbd>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voucher-specific help */}
                <div>
                  <h3 className="font-semibold mb-3">About {voucherTypeLabels[voucherType]}</h3>
                  <div className="text-sm text-muted-foreground space-y-2">
                    {voucherType === "PAYMENT" && (
                      <>
                        <p>
                          <strong>Purpose:</strong> Record payments made to suppliers for goods or services purchased.
                        </p>
                        <p>
                          <strong>Accounting Effect:</strong> Debits the supplier's Accounts Payable (AP) account
                          and credits the selected Cash/Bank account.
                        </p>
                        <p>
                          <strong>Common Uses:</strong> Paying supplier invoices, settling outstanding balances,
                          advance payments to suppliers.
                        </p>
                      </>
                    )}
                    {voucherType === "RECEIPT" && (
                      <>
                        <p>
                          <strong>Purpose:</strong> Record receipts received from clients for goods or services sold.
                        </p>
                        <p>
                          <strong>Accounting Effect:</strong> Debits the selected Cash/Bank account
                          and credits the client's Accounts Receivable (AR) account.
                        </p>
                        <p>
                          <strong>Common Uses:</strong> Receiving payment for sales invoices, collecting outstanding balances,
                          advance receipts from clients.
                        </p>
                      </>
                    )}
                    {voucherType === "CONTRA" && (
                      <>
                        <p>
                          <strong>Purpose:</strong> Record transfers between Cash and Bank accounts.
                        </p>
                        <p>
                          <strong>Accounting Effect:</strong> Debits the "To" account (receiving)
                          and credits the "From" account (sending).
                        </p>
                        <p>
                          <strong>Common Uses:</strong> Bank deposits, cash withdrawals, transferring funds between bank accounts.
                        </p>
                      </>
                    )}
                    {voucherType === "JOURNAL" && (
                      <>
                        <p>
                          <strong>Purpose:</strong> Record general journal entries for adjustments, corrections, and non-cash transactions.
                        </p>
                        <p>
                          <strong>Accounting Effect:</strong> Multiple debits and credits must balance (total DR = total CR).
                        </p>
                        <p>
                          <strong>Common Uses:</strong> Depreciation entries, accruals, prepaid expense amortization,
                          error corrections, adjusting entries.
                        </p>
                        <p>
                          <strong>Restrictions:</strong> Cannot use control accounts (AR, AP, Inventory) or Cash/Bank accounts.
                          Use specific modules for those.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> All vouchers are auto-posted upon creation and cannot be edited.
                    Please verify all information before submitting.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
