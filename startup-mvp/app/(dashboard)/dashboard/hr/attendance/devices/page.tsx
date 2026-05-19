"use server";

import React from "react";
import { getBiometricDevices } from "../_actions/device.action";
import DeviceList from "./_components/device-list";
import PageGuard from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import Link from "next/link";

export default async function BiometricDevicesPage() {
  const result = await getBiometricDevices();

  return (
    <PageGuard permissionKey="hr.devices">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Biometric Device Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure and manage multiple biometric devices across branches
            </p>
          </div>
          <Link href="/dashboard/hr/attendance/devices/new">
            <Button>
              <FiPlus className="mr-2 h-4 w-4" /> Add New Device
            </Button>
          </Link>
        </div>

        <DeviceList devices={result.devices || []} />
      </div>
    </PageGuard>
  );
}
