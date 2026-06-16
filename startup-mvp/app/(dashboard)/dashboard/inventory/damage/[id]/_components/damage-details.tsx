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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Warehouse:</span>
              <span className="text-sm font-medium">{initialData.warehouse?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="text-sm font-medium">{format(new Date(initialData.date), "dd MMM yyyy")}</span>
            </div>
            {initialData.voucher && (
              <div className="flex justify-between">
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
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{initialData.notes || "No notes provided."}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Damaged Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU/Variant</TableHead>
                <TableHead className="text-right">Qty Lost</TableHead>
                <TableHead className="text-right">Unit Rate</TableHead>
                <TableHead className="text-right">Total Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.item.code}</div>
                  </TableCell>
                  <TableCell>
                    {item.variant ? (
                      <div className="text-sm">
                        {item.variant.sku} <span className="text-muted-foreground">({item.variant.size}, {item.variant.color})</span>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">-{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">৳{Number(item.unitRate).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">৳{Number(item.amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={4} className="text-right font-semibold">Total Write-off Value:</TableCell>
                <TableCell className="text-right font-bold text-red-600">৳{totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
