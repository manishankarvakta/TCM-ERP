"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitResignation, updateResignationStatus } from "../_actions/resignation.action";
import { FiPlus, FiCheck, FiX } from "react-icons/fi";
import { format } from "date-fns";

interface ResignationClientProps {
  initialResignations: any[];
  initialPagination: any;
  employees: any[];
}

export default function ResignationClient({ initialResignations, employees }: ResignationClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!selectedEmployeeId || !resignationDate) {
      toast({ title: "Error", description: "Please select employee and date", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const res = await submitResignation({
        employeeId: selectedEmployeeId,
        resignationDate: new Date(resignationDate),
        noticePeriodDays,
        reason,
      });

      if (res.success) {
        setCreateModalOpen(false);
        toast({ title: "Success", description: "Resignation submitted successfully!" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to submit", variant: "destructive" });
      }
    });
  };

  const handleStatusUpdate = (id: string, newStatus: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await updateResignationStatus(id, newStatus);
      if (res.success) {
        toast({ title: "Success", description: `Resignation ${newStatus.toLowerCase()}` });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to update", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending Review</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-600">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Resignation Requests</h2>
        <Button onClick={() => setCreateModalOpen(true)}>
          <FiPlus className="mr-2 h-4 w-4" /> Submit Resignation
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Resignation Date</TableHead>
                <TableHead>Notice Days</TableHead>
                <TableHead>Expected Release</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialResignations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No resignation requests recorded
                  </TableCell>
                </TableRow>
              ) : (
                initialResignations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee?.name} ({r.employee?.employeeCode})</TableCell>
                    <TableCell>{format(new Date(r.resignationDate), "PP")}</TableCell>
                    <TableCell>{r.noticePeriodDays} days</TableCell>
                    <TableCell className="font-semibold text-amber-700">{format(new Date(r.expectedReleaseDate), "PP")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason || "N/A"}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      {r.status === "PENDING" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => handleStatusUpdate(r.id, "APPROVED")} disabled={isPending} className="bg-emerald-600 h-7 text-xs">
                            <FiCheck className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(r.id, "REJECTED")} disabled={isPending} className="h-7 text-xs">
                            <FiX className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submit Resignation Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Resignation Request</DialogTitle>
            <DialogDescription>Record formal employee resignation and notice period</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode || "No Code"}) - {emp.designation || "Staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Resignation Submission Date</Label>
              <Input type="date" value={resignationDate} onChange={(e) => setResignationDate(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Notice Period (Days)</Label>
              <Input type="number" value={noticePeriodDays} onChange={(e) => setNoticePeriodDays(Number(e.target.value))} className="mt-1" />
            </div>

            <div>
              <Label>Reason for Resignation</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Personal reasons, career advancement..." className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
