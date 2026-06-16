import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import DeviceForm from "../_components/device-form";

export default function AddDevicePage() {
  return (
    <PageGuard permissionKey="hr.biometric.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Add Biometric Device</h1>
          <p className="text-sm text-muted-foreground">Register a new device to the system</p>
        </div>

        <DeviceForm mode="create" />
      </div>
    </PageGuard>
  );
}
