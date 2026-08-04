import React from "react";
import { getBiometricDevices } from "./_actions/device.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import DevicesListClient from "./_components/devices-list";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface DevicesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function BiometricDevicesPage({ searchParams }: DevicesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "all" ? "all" : tab;

  // Check permissions on server side
  const [result, canView, canManage] = await Promise.all([
    getBiometricDevices(page, 10, search, status),
    userId ? hasPermission(userId, "hr.biometric.view", "view") : false,
    userId ? hasPermission(userId, "hr.biometric.manage", "manage") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Biometric Devices</h1>
            <p className="text-sm text-muted-foreground">Manage your ZKTeco biometric attendance devices</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load devices"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="hr.biometric.view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Biometric Devices</h1>
            <p className="text-sm text-muted-foreground">Manage ZKTeco and biometric attendance devices.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/hr/biometric/unmapped-logs">
                Unprocessed Biometrics
              </Link>
            </Button>
            {canManage && (
              <Button asChild>
                <Link href="/dashboard/hr/biometric/devices/add">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Device
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/hr/biometric/devices?tab=all&page=1">All</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href="/dashboard/hr/biometric/devices?tab=active&page=1">Active</Link>
            </TabsTrigger>
            <TabsTrigger value="inactive" asChild>
              <Link href="/dashboard/hr/biometric/devices?tab=inactive&page=1">Inactive</Link>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={tab} className="mt-4">
            <DevicesListClient
              initialDevices={result.devices || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              permissions={{
                manage: canManage,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
