import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import AttendanceImportClient from "./_components/attendance-import-client";

export const metadata = {
  title: "Import Attendance - HR Dashboard",
};

export default async function AttendanceImportPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const canEdit = userId ? await hasPermission(userId, "hr.attendance", "edit") : false;

  if (!canEdit) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">
            Permission denied: You do not have permission to import attendance records.
          </p>
        </div>
      </div>
    );
  }

  const devices = await prisma.biometricDevice.findMany({
    where: { isActive: true },
    select: { id: true, name: true, serialNumber: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container mx-auto py-6">
      <AttendanceImportClient devices={devices} />
    </div>
  );
}
