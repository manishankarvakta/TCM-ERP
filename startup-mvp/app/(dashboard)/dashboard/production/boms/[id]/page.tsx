import React from "react";
import { getBOMById } from "../_actions/bom.action";
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
import { FiPackage, FiList, FiEdit, FiTrash2 } from "react-icons/fi";
import { format } from "date-fns";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";

interface BOMDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BOMDetailPage({ params }: BOMDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const [result, canEdit, canDelete] = await Promise.all([
    getBOMById(id),
    userId ? hasPermission(userId, "production.boms", "edit") : false,
    userId ? hasPermission(userId, "production.boms", "move-to-trash") : false,
  ]);

  if (!result.success || !result.bom) {
    redirect("/dashboard/production/boms");
  }

  const bom = result.bom;

  return (
    <PageGuard permissionKey="production.boms" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{bom.name}</h1>
            <p className="text-sm text-muted-foreground">Bill of Materials Details</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/production/boms/${bom.id}/edit`}>
                  <FiEdit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" asChild>
                <Link href={`/dashboard/production/boms?delete=${bom.id}`}>
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Delete
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>BOM Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Code</p>
                <p className="font-mono">{bom.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{bom.name}</p>
              </div>
              {bom.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{bom.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={bom.status === "active" ? "default" : "secondary"}>
                  {bom.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Item</p>
                <Link
                  href={`/dashboard/master/items/${bom.item.id}`}
                  className="font-medium hover:underline"
                >
                  {bom.item.name}
                </Link>
                <p className="text-xs text-muted-foreground font-mono">{bom.item.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantity Per Unit</p>
                <p className="text-lg font-semibold">
                  {bom.quantityPerUnit.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {bom.item.unit.symbol}
                </p>
                <p className="text-xs text-muted-foreground">
                  Quantity of {bom.item.name} produced per BOM unit
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiList className="h-5 w-5" />
              Raw Materials ({bom.items.length})
            </CardTitle>
            <CardDescription>Raw materials required for production</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Raw Material</TableHead>
                    <TableHead className="text-right">Quantity Required</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No raw materials defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    bom.items.map((item) => {
                      const unitCost = item.item.costPrice || 0;
                      const totalCost = unitCost * item.quantityRequired;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FiPackage className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <Link
                                  href={`/dashboard/master/items/${item.item.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {item.item.name}
                                </Link>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {item.item.code}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.quantityRequired.toLocaleString("en-BD", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {item.item.unit.symbol}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ৳{unitCost.toLocaleString("en-BD", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ৳{totalCost.toLocaleString("en-BD", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {bom.items.length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Raw Material Cost:</span>
                  <span className="text-lg font-semibold">
                    ৳
                    {bom.items
                      .reduce((sum, item) => {
                        const unitCost = item.item.costPrice || 0;
                        return sum + unitCost * item.quantityRequired;
                      }, 0)
                      .toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cost per {bom.item.name}: ৳
                  {(
                    bom.items.reduce((sum, item) => {
                      const unitCost = item.item.costPrice || 0;
                      return sum + unitCost * item.quantityRequired;
                    }, 0) / bom.quantityPerUnit
                  ).toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p>{bom.creator.name || bom.creator.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created At</p>
              <p>{format(new Date(bom.createdAt), "MMM d, yyyy HH:mm")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p>{format(new Date(bom.updatedAt), "MMM d, yyyy HH:mm")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
