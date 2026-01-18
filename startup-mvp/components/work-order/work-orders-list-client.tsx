"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiEye, FiRotateCw } from "react-icons/fi";
import { moveWorkOrderToTrash, restoreWorkOrder, deleteWorkOrderPermanently } from "@/app/actions/work-orders";
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
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { WorkOrderStatus } from "@prisma/client";

interface WorkOrder {
  id: string;
  code: string;
  quotationId: string;
  amount: number;
  advance: number | null;
  balance: number;
  status: WorkOrderStatus;
  isTrash?: boolean;
  createdAt: Date;
  quotation: {
    id: string;
    quotationNumber: string;
    subject: string;
    client: {
      id: string;
      name: string | null;
      company: string | null;
    } | null;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WorkOrdersListClientProps {
  initialWorkOrders: WorkOrder[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

const statusColors: Record<WorkOrderStatus, string> = {
  PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-800",
  HOLD: "bg-yellow-100 text-yellow-800",
};

export default function WorkOrdersListClient({
  initialWorkOrders,
  initialPagination,
  initialSearch,
  isTrash = false,
}: WorkOrdersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Determine base path based on current route
  const basePath = pathname?.startsWith("/admin") ? "/admin" : "/dashboard";
  
  const [search, setSearch] = useState(initialSearch);
  const [deleteWorkOrderId, setDeleteWorkOrderId] = useState<string | null>(null);
  const [restoreWorkOrderId, setRestoreWorkOrderId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`${basePath}/work-orders?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteWorkOrderId) return;
    setDeleteWorkOrderId(null);

    startTransition(async () => {
      const result = await moveWorkOrderToTrash(deleteWorkOrderId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Work order moved to trash",
        });
        const params = new URLSearchParams(searchParams.toString());
        const tab = params.get('tab') || 'all';
        params.set('tab', tab);
        router.push(`${basePath}/work-orders?${params.toString()}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete work order",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreWorkOrderId) return;
    setRestoreWorkOrderId(null);

    startTransition(async () => {
      const result = await restoreWorkOrder(restoreWorkOrderId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Work order restored",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore work order",
          variant: "destructive",
        });
      }
    });
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    setPermanentDeleteId(null);

    startTransition(async () => {
      const result = await deleteWorkOrderPermanently(permanentDeleteId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Work order permanently deleted",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete work order",
          variant: "destructive",
        });
      }
    });
  };

  const getStatusBadge = (status: WorkOrderStatus) => {
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
    return (
      <Badge className={colorClass}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch("")}
          >
            <FiX className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Quotation</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Advance</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialWorkOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No work orders found
                </TableCell>
              </TableRow>
            ) : (
              initialWorkOrders.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell className="font-medium">{workOrder.code}</TableCell>
                  <TableCell>
                    {workOrder.quotation ? (
                      <div>
                        <div className="font-medium">{workOrder.quotation.quotationNumber}</div>
                        <div className="text-sm text-gray-500">{workOrder.quotation.subject}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {workOrder.quotation?.client?.name || workOrder.quotation?.client?.company || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(workOrder.amount)}</TableCell>
                  <TableCell className="text-right">
                    {workOrder.advance ? formatCurrency(workOrder.advance) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(workOrder.balance)}
                  </TableCell>
                  <TableCell>{getStatusBadge(workOrder.status)}</TableCell>
                  <TableCell>{formatDate(workOrder.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isTrash && (
                        <>
                          <Button variant="ghost" size="sm" asChild title="View">
                            <Link href={`${basePath}/work-orders/${workOrder.id}`}>
                              <FiEye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild title="Edit">
                            <Link href={`${basePath}/work-orders/${workOrder.id}/edit`}>
                              <FiEdit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteWorkOrderId(workOrder.id)}
                            className="text-destructive hover:text-destructive"
                            title="Move to Trash"
                            disabled={isPending}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {isTrash && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreWorkOrderId(workOrder.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Restore"
                            disabled={isPending}
                          >
                            <FiRotateCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPermanentDeleteId(workOrder.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete Permanently"
                            disabled={isPending}
                          >
                            <FiX className="w-4 h-4" />
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

      {/* Pagination */}
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} work orders
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`${basePath}/work-orders?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page >= initialPagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page + 1));
                router.push(`${basePath}/work-orders?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteWorkOrderId} onOpenChange={() => setDeleteWorkOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this work order to trash? It can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={!!restoreWorkOrderId} onOpenChange={() => setRestoreWorkOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this work order?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this work order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

