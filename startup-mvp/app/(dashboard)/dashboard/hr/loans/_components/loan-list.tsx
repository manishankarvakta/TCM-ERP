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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { LoanStatus } from "@prisma/client";
import { FiEye } from "react-icons/fi";

interface LoanListProps {
  initialLoans: any[];
}

export default function LoanList({ initialLoans }: LoanListProps) {
  const getStatusColor = (status: LoanStatus) => {
    switch (status) {
      case "APPROVED": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200";
      case "PENDING": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200";
      case "REJECTED": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200";
      case "CLOSED": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="rounded-md border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Installment</TableHead>
            <TableHead className="font-semibold">Remaining</TableHead>
            <TableHead className="font-semibold">Start Date</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-right font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialLoans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                No loans found.
              </TableCell>
            </TableRow>
          ) : (
            initialLoans.map((loan) => (
              <TableRow key={loan.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{loan.employee.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{loan.employee.employeeCode}</span>
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  ${Number(loan.amount).toLocaleString()}
                </TableCell>
                <TableCell>${Number(loan.monthlyInstallment).toLocaleString()}</TableCell>
                <TableCell>${Number(loan.remainingBalance).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {format(new Date(loan.issueDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${getStatusColor(loan.status)} border px-2 py-0.5 font-medium`}>
                    {loan.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 hover:text-primary">
                    <Link href={`/dashboard/hr/loans/${loan.id}`}>
                      <FiEye className="mr-1 h-3.5 w-3.5" />
                      Details
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
