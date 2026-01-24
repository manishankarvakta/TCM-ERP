import { getUnitById } from "../_actions/unit.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiEdit, FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";

interface UnitDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function UnitDetailsPage({ searchParams }: UnitDetailsPageProps) {
  const params = await searchParams;
  const id = params.id;

  if (!id) {
    notFound();
  }

  const result = await getUnitById(id);

  if (!result.success || !result.unit) {
    notFound();
  }

  const unit = result.unit;
  const unitStatus = unit.status || "active";

  return (
    <PageGuard permissionKey="master.units" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/master/units">
                <FiArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Unit Details</h1>
              <p className="text-sm text-muted-foreground">View unit information</p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/dashboard/master/units/${unit.id}`}>
              <FiEdit className="mr-2 h-4 w-4" />
              Edit Unit
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Unit Information</CardTitle>
            <CardDescription>Detailed information about the unit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Symbol</label>
                <p className="text-base font-medium">{unit.symbol}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Details</label>
                <p className="text-base">{unit.details}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div>
                  {unitStatus === "trash" ? (
                    <Badge variant="destructive">Trash</Badge>
                  ) : unitStatus === "inactive" ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Created By</label>
                <p className="text-base">{unit.creator?.name || unit.creator?.email || "Unknown"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-base">{format(new Date(unit.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-base">{format(new Date(unit.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
