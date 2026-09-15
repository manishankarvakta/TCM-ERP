import React from "react";
import { getLeaveApplicationById } from "../_actions/leave-application.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import LeaveDetailsClient from "./_components/leave-details-client";
import PageGuard from "@/components/permissions/page-guard";

interface LeaveDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LeaveDetailsPage({ params }: LeaveDetailsPageProps) {
  const { id } = await params;
  
  const [session, result, organization] = await Promise.all([
    auth(),
    getLeaveApplicationById(id),
    prisma.organization.findFirst({ where: { status: "active" } }).catch(() => null)
  ]);

  if (!result.success || !result.leaveApplication) {
    notFound();
  }

  const userId = session?.user?.id;
  const canEdit = userId ? await hasPermission(userId, "hr.leave", "edit") : false;
  const canApproveGeneric = userId ? await hasPermission(userId, "hr.leave", "approve") : false;
  const canApproveManager = userId ? await hasPermission(userId, "hr.leave", "approve_manager") : false;
  const canApproveHR = userId ? await hasPermission(userId, "hr.leave", "approve_hr") : false;
  const canReject = userId ? await hasPermission(userId, "hr.leave", "reject") : false;

  const permissions = {
    edit: canEdit,
    approveManager: canApproveManager || canApproveGeneric,
    approveHR: canApproveHR || canApproveGeneric,
    reject: canReject || canApproveGeneric,
  };

  return (
    <PageGuard permissionKey="hr.leave" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/hr/leave">
              <FiArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Leave Request Detail</h1>
            <p className="text-sm text-muted-foreground">Reference: {result.leaveApplication.id}</p>
          </div>
        </div>

        <LeaveDetailsClient 
          leaveApplication={result.leaveApplication} 
          organization={organization}
          permissions={permissions} 
        />
      </div>
    </PageGuard>
  );
}

