"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiEdit2, FiTrash2, FiPlus, FiPercent, FiDollarSign, FiChevronDown } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { deleteCoupon, getCoupons, bulkDeleteCoupons, bulkUpdateCouponStatus } from "../_actions/coupon.action";
import CouponForm from "./couponForm";

interface CouponsListProps {
  initialCoupons: any[];
}

export default function CouponsList({ initialCoupons }: CouponsListProps) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<any[]>(initialCoupons);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const refreshCoupons = async () => {
    const res = await getCoupons();
    if (res.success && res.coupons) {
      setCoupons(res.coupons);
      setSelectedIds([]);
    }
  };

  const handleEdit = (coupon: any) => {
    setCouponToEdit(coupon);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const res = await deleteCoupon(id);
      if (res.success) {
        toast({
          title: "Success",
          description: "Coupon deleted successfully",
        });
        refreshCoupons();
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to delete coupon",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete coupon",
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async (action: "ACTIVE" | "INACTIVE" | "DELETE") => {
    if (selectedIds.length === 0) return;

    if (action === "DELETE" && !confirm(`Are you sure you want to delete ${selectedIds.length} coupons?`)) {
      return;
    }

    try {
      let res;
      if (action === "DELETE") {
        res = await bulkDeleteCoupons(selectedIds);
      } else {
        res = await bulkUpdateCouponStatus(selectedIds, action);
      }

      if (res.success) {
        toast({
          title: "Success",
          description: "Bulk action completed successfully",
        });
        refreshCoupons();
      } else {
        toast({
          title: "Error",
          description: res.error || "Bulk action failed",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(coupons.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Coupon Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage discounts coupons for POS and ecommerce checkout</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedIds.length}) <FiChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction("ACTIVE")}>
                  Mark as Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("INACTIVE")}>
                  Mark as Inactive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("DELETE")} className="text-red-600 focus:text-red-600">
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => { setCouponToEdit(null); setIsFormOpen(true); }}>
            <FiPlus className="mr-2 h-4 w-4" />
            Create Coupon
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.length === coupons.length && coupons.length > 0}
                  onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Total Limit</TableHead>
              <TableHead>Per User Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No coupons found. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(coupon.id)}
                      onCheckedChange={(checked) => handleToggleSelectOne(coupon.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">{coupon.code}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {coupon.discountType === "PERCENTAGE" ? (
                        <>
                          <FiPercent className="h-3 w-3 text-blue-500" />
                          Percentage
                        </>
                      ) : (
                        <>
                          <FiDollarSign className="h-3 w-3 text-green-500" />
                          Flat
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === "PERCENTAGE" 
                      ? `${coupon.value}%` 
                      : `$${Number(coupon.value).toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    {coupon.expiryDate 
                      ? new Date(coupon.expiryDate).toLocaleDateString() 
                      : "Never expires"}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {coupon.uses || 0}
                  </TableCell>
                  <TableCell>
                    {coupon.usageLimit !== null && coupon.usageLimit !== undefined ? coupon.usageLimit : "Unlimited"}
                  </TableCell>
                  <TableCell>
                    {coupon.userLimit !== null && coupon.userLimit !== undefined ? coupon.userLimit : "Unlimited"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.status === "ACTIVE" ? "default" : "secondary"}>
                      {coupon.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                        <FiEdit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
                        <FiTrash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CouponForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        couponToEdit={couponToEdit}
        onSuccess={refreshCoupons}
      />
    </div>
  );
}
