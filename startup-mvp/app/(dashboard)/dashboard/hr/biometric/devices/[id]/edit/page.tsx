import React from "react";
import PageGuard from "@/components/permissions/page-guard";
import DeviceForm from "../../_components/device-form";
import { getBiometricDeviceById } from "../../_actions/device.action";
import { notFound } from "next/navigation";

interface EditDevicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditDevicePage({ params }: EditDevicePageProps) {
  const { id } = await params;
  
  const result = await getBiometricDeviceById(id);

  if (!result.success || !result.device) {
    notFound();
  }

  return (
    <PageGuard permissionKey="hr.biometric.manage">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Edit Biometric Device</h1>
          <p className="text-sm text-muted-foreground">Update existing device details</p>
        </div>

        <DeviceForm mode="edit" initialData={result.device} />
      </div>
    </PageGuard>
  );
}
