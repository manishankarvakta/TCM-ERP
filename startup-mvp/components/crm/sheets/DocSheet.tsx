"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DocForm } from "../forms/DocForm";

interface DocSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc?: any;
  entityType: string;
  entityId: string;
  mode?: "create" | "edit";
}

export function DocSheet({
  open,
  onOpenChange,
  doc,
  entityType,
  entityId,
  mode = "create",
}: DocSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "New Document" : "Edit Document"}
          </SheetTitle>
        </SheetHeader>
        <DocForm
          doc={doc}
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
