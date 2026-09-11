"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createAppointmentLetter } from "../_actions/appointment-letter.action";
import { FiPlus, FiPrinter, FiFileText } from "react-icons/fi";
import { format } from "date-fns";
import Link from "next/link";

interface AppointmentLettersClientProps {
  initialLetters: any[];
  initialPagination: any;
  employees: any[];
}

export default function AppointmentLettersClient({ initialLetters, initialPagination, employees }: AppointmentLettersClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [probationMonths, setProbationMonths] = useState(6);

  const handleCreate = () => {
    if (!selectedEmployeeId || !joiningDate) {
      toast({ title: "Error", description: "Please select an employee and joining date", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const res = await createAppointmentLetter({
        employeeId: selectedEmployeeId,
        joiningDate: new Date(joiningDate),
        probationMonths,
      });

      if (res.success) {
        setCreateModalOpen(false);
        toast({ title: "Success", description: "Appointment letter created successfully!" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to create letter", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Letter Register</h2>
        <Button onClick={() => setCreateModalOpen(true)}>
          <FiPlus className="mr-2 h-4 w-4" /> Issue Appointment Letter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Letter Number</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Designation & Department</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLetters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No appointment letters found
                  </TableCell>
                </TableRow>
              ) : (
                initialLetters.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-medium">{l.letterNumber}</TableCell>
                    <TableCell>{l.employee?.name} ({l.employee?.employeeCode})</TableCell>
                    <TableCell>{l.designation} • {l.department}</TableCell>
                    <TableCell>{format(new Date(l.joiningDate), "PP")}</TableCell>
                    <TableCell>৳{Number(l.grossSalary).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/print/appointment-letter/${l.id}`} target="_blank">
                          <FiPrinter className="mr-1 h-3 w-3" /> Print
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue New Appointment Letter</DialogTitle>
            <DialogDescription>Generate formal appointment letter with atomic reference number</DialogDescription>
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
              <Label>Joining Date</Label>
              <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Probation Period (Months)</Label>
              <Input type="number" value={probationMonths} onChange={(e) => setProbationMonths(Number(e.target.value))} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending}>Generate & Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
