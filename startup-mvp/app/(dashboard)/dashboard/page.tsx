export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BeautifulDashboard from "@/components/dashboard/BeautifulDashboard";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex-1 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Please log in to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = session.user.id;
  const userName = session.user.name || "User";
  const userRole = session.user.role?.toLowerCase() || "user";

  // Fetch user default warehouse
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      defaultWarehouseId: true,
      defaultWarehouse: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Fetch list of active warehouses
  const warehouses = await prisma.warehouse.findMany({
    where: {
      isTrash: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <BeautifulDashboard 
      userId={userId} 
      userName={userName} 
      userRole={userRole}
      defaultWarehouse={dbUser?.defaultWarehouse || null}
      warehouses={warehouses}
    />
  );
}
