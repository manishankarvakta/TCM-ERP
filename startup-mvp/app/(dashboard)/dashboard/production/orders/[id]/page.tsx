import React from "react";
import { getProductionOrderById, calculateRawMaterialsNeeded, validateStockAvailability } from "../_actions/production.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { FiPackage, FiList, FiEdit, FiBox, FiHome, FiFileText, FiClock, FiUser, FiCalendar, FiCheckCircle, FiXCircle, FiAlertCircle } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import ProductionOrderActions from "./_components/productionOrderActions";

interface ProductionOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductionOrderDetailPage({
  params,
}: ProductionOrderDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const [result, canEdit, canStart, canComplete, canCancel] = await Promise.all([
    getProductionOrderById(id),
    userId ? hasPermission(userId, "production.orders", "edit") : false,
    userId ? hasPermission(userId, "production.orders", "start") : false,
    userId ? hasPermission(userId, "production.orders", "complete") : false,
    userId ? hasPermission(userId, "production.orders", "cancel") : false,
  ]);

  if (!result.success || !result.order) {
    redirect("/dashboard/production/orders");
  }

  const order = result.order;

  // Calculate raw materials needed
  const materialsResult = await calculateRawMaterialsNeeded(order.bomId, order.quantity);
  const stockValidation = await validateStockAvailability(
    materialsResult.materials.map((m) => ({
      itemId: m.itemId,
      quantityNeeded: m.quantityNeeded,
    })),
    order.warehouseId
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PLANNED":
        return "secondary";
      case "IN_PROGRESS":
        return "default";
      case "COMPLETED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PLANNED":
        return "Planned";
      case "IN_PROGRESS":
        return "In Progress";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const finishedGoodQuantity = order.bom.quantityPerUnit * order.quantity;
  const totalCost = materialsResult.materials.reduce(
    (sum, m) => sum + m.quantityNeeded * m.costPrice,
    0
  );

  const hasInsufficientStock = stockValidation.results.some((r) => !r.isAvailable);

  return (
    <PageGuard permissionKey="production.orders" requiredOperation="view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{order.code}</h1>
              <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
                {getStatusLabel(order.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Production Order Details</p>
          </div>
          <div className="flex items-center gap-2">
            {order.status === "PLANNED" && canEdit && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/production/orders/${order.id}/edit`}>
                  <FiEdit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            <ProductionOrderActions
              order={order}
              canStart={canStart}
              canComplete={canComplete}
              canCancel={canCancel}
            />
          </div>
        </div>

        {/* Stock Warning Alert */}
        {hasInsufficientStock && order.status !== "COMPLETED" && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Insufficient Stock Warning
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Some raw materials have insufficient stock. Ensure stock is available before completing production.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiFileText className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Code</p>
                <p className="font-mono text-lg font-semibold">{order.code}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm">
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Production Quantity</p>
                <p className="text-2xl font-bold">
                  {order.quantity.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-base font-normal text-muted-foreground">units</span>
                </p>
              </div>
              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Ready Product */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiBox className="h-5 w-5" />
                Ready Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Item</p>
                <Link
                  href={`/dashboard/master/items/${order.item.id}`}
                  className="font-semibold text-lg hover:underline block"
                >
                  {order.item.name}
                </Link>
                <p className="text-xs text-muted-foreground font-mono">{order.item.code}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Quantity to Produce</p>
                <p className="text-2xl font-bold text-primary">
                  {finishedGoodQuantity.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    {order.item.unit.symbol}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.bom.quantityPerUnit.toFixed(2)} {order.item.unit.symbol} per unit × {order.quantity.toFixed(2)} units
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Production Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiList className="h-5 w-5" />
                Production Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Bill of Materials</p>
                <Link
                  href={`/dashboard/production/boms/${order.bom.id}`}
                  className="font-semibold hover:underline block"
                >
                  {order.bom.name}
                </Link>
                <p className="text-xs text-muted-foreground font-mono">{order.bom.code}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
                <Link
                  href={`/dashboard/master/warehouses/${order.warehouse.id}`}
                  className="font-semibold hover:underline block"
                >
                  {order.warehouse.name}
                </Link>
                <p className="text-xs text-muted-foreground font-mono">{order.warehouse.code}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Raw Materials Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiPackage className="h-5 w-5" />
              Raw Materials Required
            </CardTitle>
            <CardDescription>
              {materialsResult.materials.length} raw material{materialsResult.materials.length !== 1 ? "s" : ""} needed for this production order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {materialsResult.materials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FiPackage className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No raw materials defined in BOM</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Material</TableHead>
                        <TableHead className="text-right">Required per Unit</TableHead>
                        <TableHead className="text-right">Total Needed</TableHead>
                        <TableHead className="text-right">Available Stock</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialsResult.materials.map((material) => {
                        const validation = stockValidation.results.find(
                          (v) => v.itemId === material.itemId
                        );
                        const isAvailable = validation?.isAvailable ?? false;
                        const available = validation?.available ?? 0;
                        const totalMaterialCost = material.quantityNeeded * material.costPrice;
                        const shortfall = available < material.quantityNeeded 
                          ? material.quantityNeeded - available 
                          : 0;

                        return (
                          <TableRow 
                            key={material.itemId}
                            className={!isAvailable ? "bg-red-50 dark:bg-red-950/20" : ""}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FiPackage className={`h-4 w-4 ${isAvailable ? "text-muted-foreground" : "text-red-600"}`} />
                                <div>
                                  <Link
                                    href={`/dashboard/master/items/${material.itemId}`}
                                    className="font-medium hover:underline"
                                  >
                                    {material.itemName}
                                  </Link>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {material.itemCode}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {material.quantityRequired.toFixed(2)} {material.unitSymbol}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {material.quantityNeeded.toFixed(2)} {material.unitSymbol}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <div>
                                <span className={isAvailable ? "" : "text-red-600"}>
                                  {available.toFixed(2)} {material.unitSymbol}
                                </span>
                                {shortfall > 0 && (
                                  <p className="text-xs text-red-600 mt-0.5">
                                    Short: {shortfall.toFixed(2)} {material.unitSymbol}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {isAvailable ? (
                                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                  <FiCheckCircle className="h-4 w-4" />
                                  Available
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                  <FiXCircle className="h-4 w-4" />
                                  Insufficient
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ৳{material.costPrice.toLocaleString("en-BD", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              ৳{totalMaterialCost.toLocaleString("en-BD", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Raw Material Cost</p>
                        <p className="text-2xl font-bold">
                          ৳{totalCost.toLocaleString("en-BD", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Materials Available</p>
                        <p className="text-2xl font-bold text-green-600">
                          {stockValidation.results.filter((r) => r.isAvailable).length} / {materialsResult.materials.length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Estimated Cost per Unit</p>
                        <p className="text-2xl font-bold">
                          ৳{(totalCost / finishedGoodQuantity).toLocaleString("en-BD", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">per {order.item.unit.symbol}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline & Audit Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiClock className="h-5 w-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    order.status === "PLANNED" || order.status === "IN_PROGRESS" || order.status === "COMPLETED"
                      ? "bg-blue-600" : "bg-muted"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Planned</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">Production order created</p>
                  </div>
                </div>
                
                {order.status === "IN_PROGRESS" || order.status === "COMPLETED" ? (
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${
                      order.status === "COMPLETED" ? "bg-blue-600" : "bg-muted"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">In Progress</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.updatedAt), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Production started</p>
                    </div>
                  </div>
                ) : null}

                {order.status === "COMPLETED" && order.completedAt ? (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-green-600" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-green-600">Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.completedAt), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Stock updated successfully</p>
                    </div>
                  </div>
                ) : order.status === "CANCELLED" ? (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-red-600" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-red-600">Cancelled</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.updatedAt), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Production order cancelled</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Audit Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiUser className="h-5 w-5" />
                Audit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FiUser className="h-4 w-4" />
                  Created By
                </p>
                <p className="font-medium">{order.creator.name || order.creator.email}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FiCalendar className="h-4 w-4" />
                  Created At
                </p>
                <p>{format(new Date(order.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FiClock className="h-4 w-4" />
                  Last Updated
                </p>
                <p>{format(new Date(order.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
              </div>
              {order.completedAt && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FiCheckCircle className="h-4 w-4 text-green-600" />
                      Completed At
                    </p>
                    <p className="font-medium text-green-600">
                      {format(new Date(order.completedAt), "MMM d, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageGuard>
  );
}
