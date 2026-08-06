"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FiPlus, FiSettings } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { generatePayroll } from "../_actions/payroll.action";
import { getPayrollWarningsAction } from "../_actions/payroll-warnings.action";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface PayrollHeaderActionsProps {
  canCreate: boolean;
  canEdit: boolean;
}

export default function PayrollHeaderActions({ canCreate, canEdit }: PayrollHeaderActionsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [warnings, setWarnings] = useState<any[]>([]);
  const router = useRouter();

  const handlePreCheck = async () => {
    setIsChecking(true);
    const result = await getPayrollWarningsAction(Number(selectedMonth), Number(selectedYear));
    setIsChecking(false);

    if (result.success && result.data && result.data.warnings.length > 0) {
      setWarnings(result.data.warnings);
      setGenerateModalOpen(false);
      setShowWarningModal(true);
    } else {
      handleGenerate();
    }
  };

  const handleGenerate = () => {
    setShowWarningModal(false);
    setGenerateModalOpen(false);
    startTransition(async () => {
      const result = await generatePayroll(Number(selectedMonth), Number(selectedYear));
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Payroll generated successfully.",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate payroll.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      <div className="flex gap-2">
        {canEdit && (
          <Button variant="outline" asChild>
            <Link href="/dashboard/hr/shifts">
              <FiSettings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => setGenerateModalOpen(true)} disabled={isPending || isChecking}>
            <FiPlus className="mr-2 h-4 w-4" />
            {isChecking ? "Checking..." : isPending ? "Generating..." : "Generate Payroll"}
          </Button>
        )}
      </div>

      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
            <DialogDescription>
              Select the month and year for which you want to generate payroll.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1;
                    const name = new Date(0, i).toLocaleString("default", { month: "long" });
                    return (
                      <SelectItem key={m} value={String(m)}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePreCheck} disabled={isPending || isChecking}>
              {isChecking ? "Checking..." : isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Payroll Generation Warnings</DialogTitle>
            <DialogDescription>
              We detected unresolved attendance issues for this payroll period. You can resolve them or generate anyway.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 py-4 max-h-[60vh] overflow-y-auto">
            {warnings.map((w, i) => (
              <Alert key={i} variant={w.severity === "critical" ? "destructive" : "default"} className={w.severity === "warning" ? "border-yellow-500 bg-yellow-50 text-yellow-900" : ""}>
                <AlertCircle className={`h-4 w-4 ${w.severity === "warning" ? "text-yellow-600" : ""}`} />
                <AlertTitle className="capitalize flex items-center justify-between">
                  <span>{w.type.replace(/_/g, " ")} ({w.count})</span>
                  {w.href && (
                    <Link href={w.href} className="text-xs underline text-blue-600 hover:text-blue-800">
                      View Details
                    </Link>
                  )}
                </AlertTitle>
                <AlertDescription className="mt-1">
                  {w.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} variant="destructive">
              Generate Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

