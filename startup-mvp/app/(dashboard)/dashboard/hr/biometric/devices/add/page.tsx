import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import DeviceForm from "../_components/device-form";
import { getActiveWarehouses } from "../_actions/device.action";

export default async function AddDevicePage() {
  const warehousesResult = await getActiveWarehouses();
  const warehouses = warehousesResult.success ? warehousesResult.warehouses : [];

  return (
    <PageGuard permissionKey="hr.biometric.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Add Biometric Device</h1>
          <p className="text-sm text-muted-foreground">Register a new device to the system</p>
        </div>

        <DeviceForm mode="create" warehouses={warehouses} />
      </div>
    </PageGuard>
  );
}
