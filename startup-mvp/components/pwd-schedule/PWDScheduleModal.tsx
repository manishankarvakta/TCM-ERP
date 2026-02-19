
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PWDScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  selectedLocation?: any;
}

export function PWDScheduleModal({ open, onClose, onSelect }: PWDScheduleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PWD Schedule (Stub)</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>This component is missing. Please implement the PWD Schedule modal.</p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
