import { prisma } from "./lib/prisma";
import { biometricDeviceSchema } from "./app/(dashboard)/dashboard/hr/biometric/devices/_schemas/device.schema";

async function run() {
  const data = {
    name: "Test Update",
    serialNumber: "SN12345",
    ipAddress: "",
    port: 4370,
    location: "",
    deviceType: "ATTENDANCE",
    connectionMode: "ADMS",
    isActive: true,
    warehouseId: "",
  };

  try {
    const validatedData = biometricDeviceSchema.parse(data);
    console.log("Validated:", validatedData);

    // try updating
    const d = await prisma.biometricDevice.findFirst();
    if (!d) {
      console.log("No device");
      return;
    }
    const update = await prisma.biometricDevice.update({
      where: { id: d.id },
      data: {
        name: validatedData.name,
        serialNumber: validatedData.serialNumber,
        ipAddress: validatedData.ipAddress || null,
        port: validatedData.port || 4370,
        location: validatedData.location || null,
        deviceType: validatedData.deviceType || "ATTENDANCE",
        connectionMode: validatedData.connectionMode || "ADMS",
        isActive: validatedData.isActive,
        warehouseId: validatedData.warehouseId || null,
      },
    });
    console.log("Update success:", update.id);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

run();
