import React from "react";
import { getPayrolls, generatePayroll } from "./_actions/payroll.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus, FiSettings } from "react-icons/fi";
import PayrollListClient from "./_components/payroll-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import PayrollHeaderActions from "./_components/payroll-header-actions";
import { validateHRMAccountingSetup } from "@/lib/hr/payroll-settings-guard";
import { AlertCircle } from "lucide-react";

interface PayrollPageProps {
  searchParams: Promise<{
    page?: string;
    year?: string;
    status?: string;
  }>;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const year = params.year ? parseInt(params.year) : undefined;
  const statusParam = params.status || "ALL";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canCreate, canEdit, canDelete, canDeletePermanently] = await Promise.all([
    getPayrolls(page, 10, year, statusParam === "ALL" ? undefined : statusParam as any),
    userId ? hasPermission(userId, "hr.payroll", "view") : false,
    userId ? hasPermission(userId, "hr.payroll", "create") : false,
    userId ? hasPermission(userId, "hr.payroll", "edit") : false,
    userId ? hasPermission(userId, "hr.payroll", "move-to-trash") : false,
    userId ? hasPermission(userId, "hr.payroll", "delete-permanently") : false,
  ]);

  const hrGuard = await validateHRMAccountingSetup("PAYROLL_GENERATE");

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Payroll</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load payroll records"}</p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="hr.payroll" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Payroll Engine</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate, approve, and post monthly employee salaries. Draft payroll uses current policy settings and stored attendance calculations.
            </p>
          </div>
          <PayrollHeaderActions canCreate={canCreate} canEdit={canEdit} />
        </div>

        {!hrGuard.ok && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-destructive">HRM setup incomplete</h3>
              <ul className="list-disc list-inside text-sm text-destructive mt-1 space-y-1">
                {hrGuard.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="text-sm text-destructive mt-2">Please configure these before generating or posting payroll.</p>
            </div>
          </div>
        )}

        <Tabs defaultValue={statusParam} className="w-full">
          <TabsList>
            <TabsTrigger value="ALL" asChild>
              <Link href="/dashboard/hr/payroll?status=ALL&page=1">All</Link>
            </TabsTrigger>
            <TabsTrigger value="DRAFT" asChild>
              <Link href="/dashboard/hr/payroll?status=DRAFT&page=1">Draft</Link>
            </TabsTrigger>
            <TabsTrigger value="APPROVED" asChild>
              <Link href="/dashboard/hr/payroll?status=APPROVED&page=1">Approved</Link>
            </TabsTrigger>
            <TabsTrigger value="POSTED" asChild>
              <Link href="/dashboard/hr/payroll?status=POSTED&page=1">Posted</Link>
            </TabsTrigger>
            <TabsTrigger value="TRASH" asChild>
              <Link href="/dashboard/hr/payroll?status=TRASH&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={statusParam} className="mt-4">
            <PayrollListClient
              initialPayrolls={(result.payrolls as any) || []}
              initialPagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
              permissions={{
                view: canView,
                edit: canEdit,
                delete: canDelete,
                deletePermanently: canDeletePermanently,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
