"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EventForm } from "../forms/EventForm";

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
  entityType: string;
  entityId: string;
  mode?: "create" | "edit";
}

export function EventSheet({
  open,
  onOpenChange,
  event,
  entityType,
  entityId,
  mode = "create",
}: EventSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "New Event" : "Edit Event"}
          </SheetTitle>
        </SheetHeader>
        <EventForm
          event={event}
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
