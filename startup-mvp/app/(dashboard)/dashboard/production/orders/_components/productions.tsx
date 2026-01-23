"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { FiSearch, FiEdit, FiEye, FiMoreVertical, FiPlay, FiCheck, FiX } from "react-icons/fi";
import { startProductionOrder, completeProductionOrder, cancelProductionOrder } from "../_actions/production.action";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProductionOrderStatus } from "@prisma/client";

interface ProductionOrder {
  id: string;
  code: string;
  bomId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  status: ProductionOrderStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  bom: {
    id: string;
    code: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    code: string;
    unit: {
      symbol: string;
    };
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductionsListClientProps {
  initialOrders: ProductionOrder[];
  initialPagination: Pagination;
  initialSearch: string;
  initialStatus?: ProductionOrderStatus | "all";
  initialWarehouseId?: string;
  warehouses?: Array<{ id: string; name: string; code: string }>;
  canEdit?: boolean;
  canStart?: boolean;
  canComplete?: boolean;
  canCancel?: boolean;
}

export default function ProductionsListClient({
  initialOrders,
  initialPagination,
  initialSearch,
  initialStatus = "all",
  initialWarehouseId,
  warehouses = [],
  canEdit = false,
  canStart = false,
  canComplete = false,
  canCancel = false,
}: ProductionsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | "all">(initialStatus);
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouseId || "");
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"start" | "complete" | "cancel" | null>(null);

  const getStatusBadgeVariant = (status: ProductionOrderStatus) => {
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

  const getStatusLabel = (status: ProductionOrderStatus) => {
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

  const handleSearch = (value: string) => {
    setSearchInput(value);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`/dashboard/production/orders?${params.toString()}`);
    });
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as ProductionOrderStatus | "all");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value !== "all") {
        params.set("status", value);
      } else {
        params.delete("status");
      }
      params.set("page", "1");
      router.push(`/dashboard/production/orders?${params.toString()}`);
    });
  };

  const handleWarehouseFilter = (value: string) => {
    const actualValue = value === "all" ? "" : value;
    setWarehouseFilter(actualValue);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (actualValue) {
        params.set("warehouseId", actualValue);
      } else {
        params.delete("warehouseId");
      }
      params.set("page", "1");
      router.push(`/dashboard/production/orders?${params.toString()}`);
    });
  };

  const handleStart = async (orderId: string) => {
    const result = await startProductionOrder(orderId);
    if (result.success) {
      toast({
        title: "Success",
        description: "Production order started successfully",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to start production order",
        variant: "destructive",
      });
    }
    setActionOrderId(null);
    setActionType(null);
  };

  const handleComplete = async (orderId: string) => {
    const result = await completeProductionOrder(orderId);
    if (result.success) {
      toast({
        title: "Success",
        description: "Production order completed successfully. Stock has been updated.",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete production order",
        variant: "destructive",
      });
    }
    setActionOrderId(null);
    setActionType(null);
  };

  const handleCancel = async (orderId: string) => {
    const result = await cancelProductionOrder(orderId);
    if (result.success) {
      toast({
        title: "Success",
        description: "Production order cancelled successfully",
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to cancel production order",
        variant: "destructive",
      });
    }
    setActionOrderId(null);
    setActionType(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by code, item, BOM, or warehouse..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {warehouses.length > 0 && (
          <Select value={warehouseFilter || "all"} onValueChange={handleWarehouseFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>BOM</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No production orders found
                </TableCell>
              </TableRow>
            ) : (
              initialOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {order.item.code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.bom.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {order.bom.code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{order.warehouse.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {order.quantity.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {order.item.unit.symbol}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <FiMoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/production/orders/${order.id}`}>
                            <FiEye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {order.status === "PLANNED" && canEdit && (
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/production/orders/${order.id}/edit`}>
                              <FiEdit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {order.status === "PLANNED" && canStart && (
                          <DropdownMenuItem
                            onClick={() => {
                              setActionOrderId(order.id);
                              setActionType("start");
                            }}
                          >
                            <FiPlay className="mr-2 h-4 w-4" />
                            Start
                          </DropdownMenuItem>
                        )}
                        {order.status === "IN_PROGRESS" && canComplete && (
                          <DropdownMenuItem
                            onClick={() => {
                              setActionOrderId(order.id);
                              setActionType("complete");
                            }}
                          >
                            <FiCheck className="mr-2 h-4 w-4" />
                            Complete
                          </DropdownMenuItem>
                        )}
                        {(order.status === "PLANNED" || order.status === "IN_PROGRESS") &&
                          canCancel && (
                            <DropdownMenuItem
                              onClick={() => {
                                setActionOrderId(order.id);
                                setActionType("cancel");
                              }}
                              className="text-destructive"
                            >
                              <FiX className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}{" "}
            of {initialPagination.total} orders
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1 || isPending}
              onClick={() => {
                startTransition(() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(initialPagination.page - 1));
                  router.push(`/dashboard/production/orders?${params.toString()}`);
                });
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page >= initialPagination.totalPages || isPending}
              onClick={() => {
                startTransition(() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(initialPagination.page + 1));
                  router.push(`/dashboard/production/orders?${params.toString()}`);
                });
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Action Dialogs */}
      <AlertDialog
        open={actionType === "start" && actionOrderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionOrderId(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Production Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to start this production order? This will change the status to
              "In Progress".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionOrderId && handleStart(actionOrderId)}>
              Start
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionType === "complete" && actionOrderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionOrderId(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Production Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete this production order? This will:
              <ul className="list-disc list-inside mt-2">
                <li>Deduct raw materials from stock</li>
                <li>Add finished goods to stock</li>
                <li>Update stock ledger</li>
                <li>Mark the order as completed</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionOrderId && handleComplete(actionOrderId)}>
              Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionType === "cancel" && actionOrderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionOrderId(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Production Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this production order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionOrderId && handleCancel(actionOrderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
