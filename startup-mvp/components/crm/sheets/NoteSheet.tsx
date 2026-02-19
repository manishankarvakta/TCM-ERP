"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NoteForm } from "../forms/NoteForm";

interface NoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: any;
  entityType: string;
  entityId: string;
  mode?: "create" | "edit";
}

export function NoteSheet({
  open,
  onOpenChange,
  note,
  entityType,
  entityId,
  mode = "create",
}: NoteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "New Note" : "Edit Note"}
          </SheetTitle>
        </SheetHeader>
        <NoteForm
          note={note}
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
