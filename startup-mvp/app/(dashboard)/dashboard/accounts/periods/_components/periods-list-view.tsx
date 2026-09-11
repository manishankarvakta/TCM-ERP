"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Lock, Unlock, Plus, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { createPeriod, lockPeriod, unlockPeriod } from "../_actions/period.action";

interface AccountingPeriod {
  id: string;
  periodName: string;
  startDate: Date | string;
  endDate: Date | string;
  isClosed: boolean;
  closedAt?: Date | string | null;
  closedBy?: string | null;
}

interface PeriodsListViewProps {
  initialPeriods: AccountingPeriod[];
  canCreate: boolean;
}

export default function PeriodsListView({
  initialPeriods = [],
  canCreate,
}: PeriodsListViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName || !startDate || !endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const res = await createPeriod({
        periodName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      if (res.success) {
        toast({
          title: "Success",
          description: "Accounting period created successfully",
        });
        setIsOpen(false);
        setPeriodName("");
        setStartDate("");
        setEndDate("");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to create accounting period",
          variant: "destructive",
        });
      }
    });
  };

  const handleToggleLock = async (id: string, currentlyClosed: boolean) => {
    startTransition(async () => {
      const action = currentlyClosed ? unlockPeriod : lockPeriod;
      const res = await action(id);

      if (res.success) {
        toast({
          title: "Success",
          description: currentlyClosed
            ? "Period unlocked successfully"
            : "Period locked successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: res.error || "Action failed",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounting Periods</h1>
          <p className="text-sm text-muted-foreground">
            Manage fiscal calendar months and lock closed periods to prevent unauthorized postings
          </p>
        </div>

        {canCreate && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Fiscal Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Accounting Period</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePeriod} className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Period Name</label>
                  <Input
                    placeholder="e.g. FY2026 - Q1 or Jan 2026"
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Creating..." : "Create Period"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  No accounting periods found. Click &quot;New Fiscal Period&quot; to define your first period.
                </TableCell>
              </TableRow>
            ) : (
              initialPeriods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.periodName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {format(new Date(period.startDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {format(new Date(period.endDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {period.isClosed ? (
                      <Badge variant="destructive" className="flex w-fit items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Locked / Closed
                      </Badge>
                    ) : (
                      <Badge variant="default" className="flex w-fit items-center gap-1 bg-emerald-600">
                        <Unlock className="h-3 w-3" />
                        Open
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canCreate && (
                      <Button
                        size="sm"
                        variant={period.isClosed ? "outline" : "destructive"}
                        onClick={() => handleToggleLock(period.id, period.isClosed)}
                        disabled={isPending}
                      >
                        {period.isClosed ? (
                          <>
                            <Unlock className="mr-1 h-3.5 w-3.5" /> Unlock Period
                          </>
                        ) : (
                          <>
                            <Lock className="mr-1 h-3.5 w-3.5" /> Lock Period
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
