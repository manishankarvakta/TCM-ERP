"use server";

import React from "react";
import DeviceForm from "./_components/device-form";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";

interface DeviceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeviceEditPage({ params }: DeviceEditPageProps) {
  const { id } = await params;
  
  const device = id !== "new" 
    ? await prisma.biometricDevice.findUnique({ where: { id } })
    : null;

  return (
    <PageGuard permissionKey="hr.devices">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {id === "new" ? "Add Biometric Device" : "Edit Biometric Device"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure connection settings for ZKTeco, eSSL, or FingerTec terminals
          </p>
        </div>

        <DeviceForm initialData={device} />
      </div>
    </PageGuard>
  );
}
