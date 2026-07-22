"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiAlertTriangle, FiEdit } from "react-icons/fi";
import { createFine, updateFine, getActiveEmployeesSimple } from "../_actions/fine.action";
import { toast } from "sonner";

interface AddFineDialogProps {
  initialData?: {
    id: string;
    amount: number;
    fineDate: string | Date;
    reason: string;
    employee: { id: string; name: string };
  } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function AddFineDialog({
  initialData,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
  trigger,
}: AddFineDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (externalOnOpenChange || (() => {})) : setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; employeeCode: string | null; designation: string | null }>>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [fineDate, setFineDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");

  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      getActiveEmployeesSimple().then((res) => {
        if (res.success && res.employees) {
          setEmployees(res.employees);
        }
      });

      if (initialData) {
        setEmployeeId(initialData.employee.id);
        setAmount(initialData.amount.toString());
        const d = new Date(initialData.fineDate);
        setFineDate(d.toISOString().split("T")[0]);
        setReason(initialData.reason);
      } else {
        setEmployeeId("");
        setAmount("");
        setFineDate(new Date().toISOString().split("T")[0]);
        setReason("");
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !amount || !reason.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);
    let res;
    if (isEditing && initialData) {
      res = await updateFine(initialData.id, {
        employeeId,
        amount: parseFloat(amount),
        fineDate,
        reason,
      });
    } else {
      res = await createFine({
        employeeId,
        amount: parseFloat(amount),
        fineDate,
        reason,
      });
    }
    setLoading(false);

    if (res.success) {
      toast.success(res.message || (isEditing ? "Fine updated successfully." : "Fine recorded successfully."));
      setOpen(false);
      if (onSuccess) onSuccess();
    } else {
      toast.error(res.error || "Failed to save fine.");
    }
  };

  const employeeOptions = employees.map((emp) => ({
    label: emp.name,
    value: emp.id,
    description: [emp.employeeCode, emp.designation].filter(Boolean).join(" • "),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <FiAlertTriangle className="mr-2 h-4 w-4" />
              Issue Fine / Penalty
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {isEditing ? (
              <>
                <FiEdit className="text-primary h-5 w-5" />
                Edit Fine / Penalty Record
              </>
            ) : (
              <>
                <FiAlertTriangle className="text-destructive h-5 w-5" />
                Issue Employee Fine / Penalty
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <SearchableSelect
              options={employeeOptions}
              value={employeeId}
              onValueChange={(val) => setEmployeeId(val || "")}
              placeholder="Search and select employee..."
              searchPlaceholder="Type name, code, designation..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Fine Amount (BDT) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fineDate">Penalty Date *</Label>
              <Input
                id="fineDate"
                type="date"
                value={fineDate}
                onChange={(e) => setFineDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Description *</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for imposing this fine or penalty..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={isEditing ? "default" : "destructive"} disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Fine" : "Record Fine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
