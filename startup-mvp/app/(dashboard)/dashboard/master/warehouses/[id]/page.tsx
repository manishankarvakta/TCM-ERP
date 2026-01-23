import React from "react";
// import { getWarehouseById } from "../_actions/warehouse.action";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  FiEdit, 
  FiArrowLeft, 
  FiHome,
  FiInfo,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiMapPin
} from "react-icons/fi";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { getWarehouseById } from "../_actions/warehouse.action";

interface WarehouseDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WarehouseDetailsPage({ params }: WarehouseDetailsPageProps) {
  const { id } = await params;
  const result = await getWarehouseById(id);

  if (!result.success || !result.warehouse) {
    redirect("/dashboard/master/warehouses");
  }

  const warehouse = result.warehouse;
  const session = await auth();
  const userId = session?.user?.id;
  const canEdit = userId ? await hasPermission(userId, "master.warehouses", "edit") : false;

  const getLocationString = () => {
    const parts = [
      warehouse.address,
      warehouse.city,
      warehouse.state,
      warehouse.zip,
      warehouse.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No location specified";
  };

  return (
    <PageGuard permissionKey="master.warehouses" requiredOperation="view">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/master/warehouses">
                <FiArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FiHome className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{warehouse.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono text-muted-foreground">{warehouse.code}</span>
                </div>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/master/warehouses/${warehouse.id}/edit`}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Warehouse
              </Link>
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiInfo className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Basic Information</CardTitle>
                </div>
                <CardDescription>Warehouse details and location</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Warehouse Name</label>
                    <p className="text-sm font-medium">{warehouse.name}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Warehouse Code</label>
                    <p className="text-sm font-mono">{warehouse.code}</p>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Address</label>
                    <div className="flex items-start gap-2">
                      <FiMapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">{getLocationString()}</p>
                    </div>
                  </div>

                  {warehouse.address && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</label>
                      <p className="text-sm">{warehouse.address}</p>
                    </div>
                  )}

                  {warehouse.city && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</label>
                      <p className="text-sm">{warehouse.city}</p>
                    </div>
                  )}

                  {warehouse.state && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">State/Province</label>
                      <p className="text-sm">{warehouse.state}</p>
                    </div>
                  )}

                  {warehouse.zip && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ZIP/Postal Code</label>
                      <p className="text-sm">{warehouse.zip}</p>
                    </div>
                  )}

                  {warehouse.country && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</label>
                      <p className="text-sm">{warehouse.country}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar (1 column) */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Status</label>
                  <div>
                    {warehouse.status === "trash" ? (
                      <Badge variant="destructive" className="gap-1">
                        <FiXCircle className="h-3 w-3" />
                        Trash
                      </Badge>
                    ) : warehouse.status === "inactive" ? (
                      <Badge variant="secondary" className="gap-1">
                        <FiXCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1">
                        <FiCheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiClock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Metadata</CardTitle>
                </div>
                <CardDescription>Creation and update information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created By</label>
                  <div className="flex items-center gap-2">
                    <FiUser className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{warehouse.creator.name || warehouse.creator.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created At</label>
                  <div className="flex items-center gap-2">
                    <FiClock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{format(new Date(warehouse.createdAt), "PPp")}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</label>
                  <div className="flex items-center gap-2">
                    <FiClock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{format(new Date(warehouse.updatedAt), "PPp")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
