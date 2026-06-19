import { prisma } from "@/lib/prisma";
import CsvImportClient from "./csv-import-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Biometric CSV Import",
};

export default async function CsvImportPage() {
  const devices = await prisma.biometricDevice.findMany({
    where: { isActive: true },
    select: { id: true, name: true, serialNumber: true },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Biometric CSV Import</h1>
        <p className="text-muted-foreground">
          Manually import ZKTeco MB360 attendance logs via CSV fallback.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Import Attendance Data</CardTitle>
            <CardDescription>
              Upload a CSV file containing your biometric device's ATTLOG export.
              Ensure the columns match: PIN, Time, DeviceID, Status, Verified, WorkCode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImportClient devices={devices} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
