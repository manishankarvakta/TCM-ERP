import React from "react";
import { getGRNById } from "../../_actions/grn.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { FiArrowLeft, FiFileText, FiPackage, FiUser, FiCalendar, FiClock, FiHome } from "react-icons/fi";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import type { GRNStatus } from "@prisma/client";

interface GRNDetailsPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<GRNStatus, string> = {
  DRAFT: "Draft",
  COMPLETED: "Completed",
};

export default async function GRNDetailsPage({ params }: GRNDetailsPageProps) {
  const { id } = await params;

  const result = await getGRNById(id);

  if (!result.success || !result.grn) {
    notFound();
  }

  const grn = result.grn;

  const getStatusBadgeVariant = (status: GRNStatus) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "COMPLETED":
        return "default";
      default:
        return "secondary";
    }
  };

  const sourceType = grn.purchaseId ? "Purchase" : grn.tpnId ? "TPN" : "Unknown";
  const sourceNumber = grn.purchase?.purchaseNumber || grn.tpn?.tpnNumber || "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{grn.grnNumber}</h1>
            <Badge variant={getStatusBadgeVariant(grn.status)} className="text-sm px-3 py-1">
              {STATUS_LABELS[grn.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Goods Receipt Note Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/procurements/grn">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRN Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiFileText className="h-5 w-5" />
              GRN Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">GRN Number</p>
              <p className="font-mono text-lg font-semibold">{grn.grnNumber}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusBadgeVariant(grn.status)} className="text-sm">
                {STATUS_LABELS[grn.status]}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(grn.date), "MMM d, yyyy")}
              </p>
            </div>
            {grn.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{grn.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Source Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiPackage className="h-5 w-5" />
              Source Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Source Type</p>
              <p className="font-medium">{sourceType}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Source Document</p>
              {grn.purchaseId ? (
                <Link
                  href={`/dashboard/procurements/purchases/${grn.purchaseId}/view`}
                  className="font-mono text-primary hover:underline"
                >
                  {sourceNumber}
                </Link>
              ) : grn.tpnId ? (
                <Link
                  href={`/dashboard/inventory/transfers/${grn.tpnId}/view`}
                  className="font-mono text-primary hover:underline"
                >
                  {sourceNumber}
                </Link>
              ) : (
                <p className="font-mono">{sourceNumber}</p>
              )}
            </div>
            {grn.purchase?.supplier && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                  <Link
                    href={`/dashboard/suppliers/${grn.purchase.supplier.id}`}
                    className="font-medium hover:underline block"
                  >
                    {grn.purchase.supplier.name || grn.purchase.supplier.company || grn.purchase.supplier.email}
                  </Link>
                </div>
              </>
            )}
            {grn.tpn?.sourceWarehouse && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Source Warehouse</p>
                  <p className="font-medium">{grn.tpn.sourceWarehouse.name}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Warehouse Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiHome className="h-5 w-5" />
              Destination Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
              <Link
                href={`/dashboard/master/warehouses/${grn.warehouse.id}`}
                className="font-semibold hover:underline block"
              >
                {grn.warehouse.name}
              </Link>
              <p className="text-xs text-muted-foreground font-mono">{grn.warehouse.code}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRN Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPackage className="h-5 w-5" />
            Received Items
          </CardTitle>
          <CardDescription>
            {grn.items.length} item{grn.items.length !== 1 ? "s" : ""} in this receipt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grn.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiPackage className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items in this GRN</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Details</TableHead>
                    <TableHead className="text-right">Received Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grn.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.item ? (
                          <Link
                            href={`/dashboard/master/items/${item.item.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {item.item.code}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.item?.name || "Unknown Item"}
                            {item.variant ? ` - ${item.variant.name}` : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {Number(item.receivedQuantity).toFixed(2)}
                        {item.item?.unit?.symbol && ` ${item.item.unit.symbol}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiUser className="h-4 w-4" />
                Created By
              </p>
              <p className="font-medium">
                {grn.creator?.name || grn.creator?.email || "System"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Created At
              </p>
              <p>{format(new Date(grn.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Last Updated
              </p>
              <p>{format(new Date(grn.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
