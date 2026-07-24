import React from "react";
import { getSupplierById } from "../_actions/supplier.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowLeft, FiEdit, FiImage, FiBook } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import DocumentSection from "@/components/documents/documentSection";

interface SupplierDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function SupplierDetailsPage({ searchParams }: SupplierDetailsPageProps) {
  const params = await searchParams;
  const supplierId = params.id;

  if (!supplierId) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id;
  const canViewLedger = userId ? await hasPermission(userId, "peoples.suppliers", "ledger") : false;

  const result = await getSupplierById(supplierId);

  if (!result.success || !result.supplier) {
    notFound();
  }

  const supplier = result.supplier;
  const supplierStatus = supplier.status || "active";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/suppliers">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Suppliers
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {canViewLedger && (
            <Button variant="outline" asChild className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary">
              <Link href={`/dashboard/suppliers/ledger?id=${supplier.id}`}>
                <FiBook className="mr-2 h-4 w-4" />
                Supplier Ledger
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/dashboard/suppliers/${supplier.id}`}>
              <FiEdit className="mr-2 h-4 w-4" />
              Edit Supplier
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
          <CardDescription>View complete information about this supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Details (3 columns) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Supplier Code</label>
                  <p className="text-sm font-medium">{(supplier as any).supplierCode || "-"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-medium">{supplier.name || "-"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{supplier.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-sm">{supplier.phone || "-"}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-sm">{supplier.company || "-"}</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="text-sm">
                    {supplier.address || "-"}
                    {supplier.city && `, ${supplier.city}`}
                    {supplier.state && `, ${supplier.state}`}
                    {supplier.zip && ` ${supplier.zip}`}
                    {supplier.country && `, ${supplier.country}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    {supplierStatus === "trash" ? (
                      <Badge variant="destructive">Trash</Badge>
                    ) : supplierStatus === "inactive" ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Created By</label>
                  <p className="text-sm">{supplier.createdByUser.name || supplier.createdByUser.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm">{format(new Date(supplier.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{format(new Date(supplier.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Right Side - Image (1 column) */}
            <div className="lg:col-span-1">
              {supplier.image ? (
                <div className="sticky top-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Supplier Photo</label>
                    <div className="relative w-full aspect-square rounded-lg border overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={supplier.image}
                        alt={supplier.name || supplier.email || ""}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Supplier Photo</label>
                    <div className="relative w-full aspect-square rounded-lg border bg-muted flex flex-col items-center justify-center gap-2">
                      <FiImage className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No photo</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Attached Documents Section */}
      <DocumentSection
        documents={Array.isArray((supplier as any).documents) ? (supplier as any).documents : []}
        readOnly={true}
        title="Supplier Transaction & Dealing Documents"
        description="Attached invoices, contracts, tax certificates, or photo records for this supplier."
      />
    </div>
  );
}

