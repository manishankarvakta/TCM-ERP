"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, CheckCircle, Trash2, Printer } from "lucide-react";
import { numberToWords } from "@/lib/utils/number-to-words";
import { approveDamage, deleteDamage, trashDamage, restoreDamage } from "../../_actions/damage.action";
import ProtectedAction from "@/components/permissions/protected-action";
import { FiRotateCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DamageDetailsProps {
  initialData: any;
}

export default function DamageDetails({ initialData }: DamageDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleAction = async (actionFn: (id: string) => Promise<{success: boolean, error?: string}>, id: string, successMsg: string, redirect: boolean = false) => {
    setIsDeleting(true);
    try {
      const res = await actionFn(id);
      if (res.success) {
        toast({ title: "Success", description: successMsg });
        if (redirect) {
          router.push("/dashboard/inventory/damage");
        } else {
          router.refresh();
        }
      } else {
        toast({ title: "Error", description: res.error || "Failed to perform action.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await approveDamage(initialData.id);
      if (res.success) {
        toast({ title: "Success", description: "Damage approved and stock updated." });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Failed to approve damage.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };



  const totalAmount = initialData.items.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const totalItems = initialData.items.length;
  const totalQuantity = initialData.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only Invoice Header */}
      <div className="hidden print:block border-b border-slate-300 pb-2 mb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
              {initialData.warehouse?.name || "Ferrari Fashion"}
            </h1>
            {initialData.warehouse?.address ? (
              <>
                <p className="text-xs text-slate-600">{initialData.warehouse.address}</p>
                {(initialData.warehouse.city || initialData.warehouse.state || initialData.warehouse.zip || initialData.warehouse.country) && (
                  <p className="text-xs text-slate-600">
                    {[
                      initialData.warehouse.city,
                      initialData.warehouse.state,
                      initialData.warehouse.zip,
                      initialData.warehouse.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600">House #14, Road #04, Sector #03</p>
                <p className="text-xs text-slate-600">Uttara, Dhaka-1230, Bangladesh</p>
              </>
            )}
            <p className="text-xs text-slate-600">Phone: +880 1841 556677</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase text-slate-800">Stock Damage Report</h2>
            <div className="mt-2 text-xs space-y-0.5">
              <p><span className="font-semibold">Damage Number:</span> {initialData.damageNumber}</p>
              <p><span className="font-semibold">Date:</span> {format(new Date(initialData.date), "dd MMM yyyy")}</p>
              <p><span className="font-semibold">Status:</span> {initialData.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory/damage" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              Damage {initialData.damageNumber}
              <Badge variant={initialData.status === "COMPLETED" ? "default" : "secondary"}>
                {initialData.status}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Created on {format(new Date(initialData.createdAt), "dd MMM yyyy")} by {initialData.createdByUser?.name}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>

          {initialData.status === "DRAFT" && !initialData.isTrash && (
            <>
              <ProtectedAction
                permissionKey="inventory.damage"
                action="edit"
                href={`/dashboard/inventory/damage/${initialData.id}/edit`}
                buttonProps={{ disabled: isDeleting || isApproving, variant: "outline", size: "sm" }}
              />

              <ProtectedAction
                permissionKey="inventory.damage"
                action="move-to-trash"
                onClick={() => handleAction(trashDamage, initialData.id, "Moved to trash", true)}
                buttonProps={{ disabled: isDeleting, variant: "destructive", size: "sm" }}
              />

              <ProtectedAction
                permissionKey="inventory.damage"
                action="delete-permanently"
                onClick={() => setShowDeleteDialog(true)}
                buttonProps={{ disabled: isDeleting, variant: "destructive", size: "sm" }}
              />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={isApproving}>
                    <CheckCircle className="h-4 w-4 mr-2" /> 
                    {isApproving ? "Approving..." : "Approve Damage"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Damage?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Approving this will permanently reduce stock quantities for the items listed and create accounting entries. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove}>Approve</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {initialData.isTrash && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction(restoreDamage, initialData.id, "Restored successfully")}
                disabled={isDeleting}
              >
                <FiRotateCw className="h-4 w-4 mr-2" /> Restore
              </Button>
              <ProtectedAction
                permissionKey="inventory.damage"
                action="delete-permanently"
                onClick={() => setShowDeleteDialog(true)}
                buttonProps={{ disabled: isDeleting, variant: "destructive", size: "sm" }}
              />
              
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this draft damage record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleAction(deleteDamage, initialData.id, "Permanently deleted", true)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2 print:space-y-0">
        <Card className="print:shadow-none print:border-0 print:bg-transparent">
          <CardHeader className="pb-3 print:p-1.5 print:pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground print:text-xs">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 print:space-y-1 print:p-1.5">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground print:text-xs">Warehouse:</span>
              <span className="text-sm font-medium print:text-xs">{initialData.warehouse?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground print:text-xs">Date:</span>
              <span className="text-sm font-medium print:text-xs">{format(new Date(initialData.date), "dd MMM yyyy")}</span>
            </div>
            {initialData.voucher && (
              <div className="flex justify-between print:hidden">
                <span className="text-sm text-muted-foreground">Voucher:</span>
                <span className="text-sm font-medium text-primary">
                  <Link href={`/dashboard/accounts/vouchers/${initialData.voucher.id}`} className="hover:underline">
                    {initialData.voucher.voucherNumber}
                  </Link>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{initialData.notes || "No notes provided."}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="print:shadow-none print:border-0 print:bg-transparent">
        <CardHeader className="print:p-1.5 print:pb-0">
          <CardTitle className="print:text-xs">Damaged Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 print:p-1.5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="print:py-1 print:px-2 print:text-xs">Item</TableHead>
                <TableHead className="print:py-1 print:px-2 print:text-xs">SKU/Variant</TableHead>
                <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Qty Lost</TableHead>
                <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Unit Rate</TableHead>
                <TableHead className="text-right print:py-1 print:px-2 print:text-xs">Total Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="print:py-1.5 print:px-2 print:text-xs">
                    <div className="font-medium print:text-xs">{item.item.name}</div>
                    <div className="text-xs text-muted-foreground print:text-[10px]">{item.item.code}</div>
                  </TableCell>
                  <TableCell className="print:py-1.5 print:px-2 print:text-xs">
                    {item.variant ? (
                      <div className="text-sm print:text-xs">
                        {item.variant.sku} <span className="text-muted-foreground">({item.variant.size}, {item.variant.color})</span>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium print:py-1.5 print:px-2 print:text-xs">-{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right text-muted-foreground print:py-1.5 print:px-2 print:text-xs">৳{Number(item.unitRate).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium print:py-1.5 print:px-2 print:text-xs">৳{Number(item.amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={2} className="print:py-1.5 print:px-2 print:text-xs">Total</TableCell>
                <TableCell className="text-right text-red-600 print:py-1.5 print:px-2 print:text-xs">-{totalQuantity.toFixed(2)}</TableCell>
                <TableCell className="print:py-1.5 print:px-2"></TableCell>
                <TableCell className="text-right text-red-600 print:py-1.5 print:px-2 print:text-xs">৳{totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

        {/* Summaries Cards */}
        <div className="mt-6 print:mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
          <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
            <CardContent className="pt-6 print:p-1">
              <div className="space-y-1 print:space-y-0">
                <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Items</p>
                <p className="text-2xl font-bold print:text-sm">{totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50 print:bg-transparent print:shadow-none print:border-0">
            <CardContent className="pt-6 print:p-1">
              <div className="space-y-1 print:space-y-0">
                <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Quantity Lost</p>
                <p className="text-2xl font-bold print:text-sm">{totalQuantity.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20 print:bg-transparent print:shadow-none print:border-0">
            <CardContent className="pt-6 print:p-1">
              <div className="space-y-1 print:space-y-0">
                <p className="text-sm font-medium text-muted-foreground print:text-xs">Total Write-off Value</p>
                <p className="text-2xl font-bold text-destructive print:text-slate-900 print:text-base">
                  ৳{totalAmount.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Amount In Words */}
          <div className="border-t border-b border-slate-200 py-3 mt-6 print:py-1.5 print:mt-2">
            <p className="text-sm print:text-[11px] text-slate-800 text-left">
              <span className="font-bold italic">In Words: </span>
              <span className="italic">{numberToWords(totalAmount)}</span>
            </p>
          </div>

          {/* Note / Terms */}
          {initialData.notes && (
            <div className="mt-4 print:mt-2 text-left">
              <p className="text-xs font-semibold uppercase text-slate-500">Note / Terms:</p>
              <p className="text-sm print:text-xs text-slate-700 mt-1 whitespace-pre-wrap">{initialData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print-only Signatures */}
      <div className="hidden print:block mt-12 pt-4">
        <div className="flex justify-between gap-8 text-center">
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <p className="text-xs font-medium mb-1 text-slate-700">
              {initialData.createdByUser?.name || initialData.createdByUser?.email || "System"}
            </p>
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Prepared By</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Verified By</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-[50px]">
            <div className="border-t border-slate-300 w-3/4 mx-auto pt-2">
              <p className="text-[10px] font-semibold uppercase text-slate-500">Approved By</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only Footer */}
      <div className="hidden print:block mt-6 text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
        <p>Generated by Ferrari Fashion ERP on {format(new Date(), "PPpp")}</p>
      </div>
    </div>
  );
}
