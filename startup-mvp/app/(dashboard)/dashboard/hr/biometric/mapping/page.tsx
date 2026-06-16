import React from "react";
import { getEmployeeDeviceMappings } from "./_actions/mapping.action";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import MappingListClient from "./_components/mapping-list";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface MappingPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function EmployeeDeviceMappingPage({ searchParams }: MappingPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "all" ? "all" : tab;

  // Check permissions on server side
  const [result, canView, canManage] = await Promise.all([
    getEmployeeDeviceMappings(page, 10, search, status),
    userId ? hasPermission(userId, "hr.biometric.view", "view") : false,
    userId ? hasPermission(userId, "hr.biometric.manage", "manage") : false,
  ]);

  // Fetch lists for the Add/Edit modals
  const [employees, devices] = await Promise.all([
    prisma.employee.findMany({
      where: { status: "active" },
      select: { id: true, name: true, employeeCode: true, department: true, designation: true },
      orderBy: { name: "asc" },
    }),
    prisma.biometricDevice.findMany({
      where: { isActive: true },
      select: { id: true, name: true, serialNumber: true, location: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employee Device Mapping</h1>
            <p className="text-sm text-muted-foreground">Map ERP employees to biometric device PIN/User IDs.</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load mappings"}</p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="hr.biometric.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Employee Device Mapping</h1>
          <p className="text-sm text-muted-foreground">Map ERP employees to biometric device PIN/User IDs.</p>
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/hr/biometric/mapping?tab=all&page=1">All</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href="/dashboard/hr/biometric/mapping?tab=active&page=1">Active</Link>
            </TabsTrigger>
            <TabsTrigger value="inactive" asChild>
              <Link href="/dashboard/hr/biometric/mapping?tab=inactive&page=1">Inactive</Link>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={tab} className="mt-4">
            <MappingListClient
              initialMappings={result.mappings || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              employees={employees}
              devices={devices}
              permissions={{
                view: canView,
                manage: canManage,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
