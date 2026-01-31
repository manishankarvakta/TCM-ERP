"use client";

import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2, Search, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { approveAdjustment, deleteAdjustment } from "../_actions/adjustment.action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface AdjustmentListProps {
  adjustments: any[];
  pagination: any;
  searchParams: any;
}

export default function AdjustmentList({
  adjustments,
  pagination,
  searchParams
}: AdjustmentListProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState(params.get("search") || "");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [approveId, setApproveId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleApprove = async () => {
    if (!approveId) return;
    
    setLoadingId(approveId);
    try {
      const result = await approveAdjustment(approveId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Adjustment approved successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve adjustment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
      setApproveId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setLoadingId(deleteId);
    try {
      const result = await deleteAdjustment(deleteId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Adjustment deleted successfully",
        });
        router.refresh();
      } else {
         toast({
          title: "Error",
          description: result.error || "Failed to delete adjustment",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
      setDeleteId(null);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(params.toString());
    if (search) {
      newParams.set("search", search);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1");
    router.push(`?${newParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search adjustment number..." 
                className="pl-8 w-[300px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
         </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No adjustments found
                </TableCell>
              </TableRow>
            ) : (
              adjustments.map((adj) => (
                <TableRow key={adj.id}>
                  <TableCell className="font-medium">{adj.adjustmentNumber}</TableCell>
                  <TableCell>{format(new Date(adj.date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{adj.warehouse?.name}</TableCell>
                  <TableCell>
                    <Badge variant={
                      adj.status === "COMPLETED" ? "default" : 
                      adj.status === "DRAFT" ? "secondary" : "destructive"
                    }>
                      {adj.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{adj._count.items}</TableCell>
                  <TableCell>{adj.createdByUser?.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       {/* View/Edit logic could be added here */}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0"
                              onClick={() => router.push(`/dashboard/inventory/adjustments/${adj.id}`)}
                              title="View"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {adj.status === "DRAFT" && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => setApproveId(adj.id)}
                                  disabled={loadingId === adj.id}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                   size="sm" 
                                   variant="outline" 
                                   className="h-8 w-8 p-0"
                                   onClick={() => setDeleteId(adj.id)}
                                   disabled={loadingId === adj.id}
                                   title="Delete"
                                >
                                   <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(params.toString());
                newParams.set("page", String(Math.max(1, pagination.page - 1)));
                router.push(`?${newParams.toString()}`);
              }}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newParams = new URLSearchParams(params.toString());
                newParams.set("page", String(Math.min(pagination.totalPages, pagination.page + 1)));
                router.push(`?${newParams.toString()}`);
              }}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}


      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve and post this adjustment? This action cannot be undone.
              Stock levels will be updated and accounting entries will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={!!loadingId}
              className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
            >
              {loadingId ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft adjustment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={!!loadingId}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loadingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
