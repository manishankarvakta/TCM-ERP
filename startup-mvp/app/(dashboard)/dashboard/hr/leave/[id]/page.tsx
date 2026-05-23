import React from "react";
import { getLeaveApplicationById } from "../_actions/leave-application.action";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
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
  
  const [session, result] = await Promise.all([
    auth(),
    getLeaveApplicationById(id)
  ]);

  if (!result.success || !result.leaveApplication) {
    notFound();
  }

  const userId = session?.user?.id;
  const canEdit = userId ? await hasPermission(userId, "hr.leave", "edit") : false;

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
          permissions={{ edit: canEdit }} 
        />
      </div>
    </PageGuard>
  );
}
