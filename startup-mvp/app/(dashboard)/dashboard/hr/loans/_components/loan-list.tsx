"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LoanStatus } from "@prisma/client";

interface LoanListProps {
  initialLoans: any[];
}

export default function LoanList({ initialLoans }: LoanListProps) {
  const getStatusColor = (status: LoanStatus) => {
    switch (status) {
      case "APPROVED": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "REJECTED": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "CLOSED": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Installment</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialLoans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No loans found.
              </TableCell>
            </TableRow>
          ) : (
            initialLoans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">
                  {loan.employee.employeeName}
                  <div className="text-xs text-muted-foreground">{loan.employee.employeeId}</div>
                </TableCell>
                <TableCell>{Number(loan.amount).toLocaleString()}</TableCell>
                <TableCell>{Number(loan.monthlyInstallment).toLocaleString()}</TableCell>
                <TableCell>{Number(loan.remainingBalance).toLocaleString()}</TableCell>
                <TableCell>{format(new Date(loan.startDate), "MMM dd, yyyy")}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(loan.status)}>
                    {loan.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
