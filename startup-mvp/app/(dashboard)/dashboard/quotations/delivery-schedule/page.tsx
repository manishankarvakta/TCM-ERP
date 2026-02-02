
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiShoppingCart } from "react-icons/fi";

export default function DeliverySchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Schedule</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Management</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="bg-muted p-4 rounded-full">
            <FiShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">Coming Soon</h3>
          <p className="text-center text-muted-foreground max-w-md">
            The global delivery schedule view is under development. 
            Currently, you can manage delivery schedules directly from individual Orders.
          </p>
          <Button asChild>
            <Link href="/dashboard/quotations/orders">
              Go to Orders
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
