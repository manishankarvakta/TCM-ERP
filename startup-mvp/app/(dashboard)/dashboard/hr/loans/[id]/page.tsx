import React from "react";
import { getLoanById } from "../_actions/loan.action";
import LoanDetailsClient from "./_components/loan-details-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function LoanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const session = await auth();
  if (!session?.user) return null;

  const result = await getLoanById(id);
  
  if (!result.success || !result.loan) {
    notFound();
  }

  const canApprove = await hasPermission(session.user.id, "hr.loans", "approve");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/hr/loans">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Application Details</h1>
          <p className="text-muted-foreground text-sm">Review and manage the employee loan application.</p>
        </div>
      </div>

      <LoanDetailsClient 
        loan={result.loan} 
        permissions={{ approve: canApprove }} 
      />
    </div>
  );
}
