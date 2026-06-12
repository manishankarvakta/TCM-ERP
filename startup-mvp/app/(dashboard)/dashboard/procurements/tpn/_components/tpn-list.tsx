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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiSearch,
  FiTrash2,
  FiX,
  FiMoreVertical,
  FiRotateCw,
  FiEye,
  FiTruck,
  FiCheckSquare
} from "react-icons/fi";
import {
  deleteTPN,
  bulkUpdateTPNStatus,
  deleteTPNsPermanently,
  shipTPN,
  receiveTPN
} from "../_actions/tpn.action";
import ProtectedAction from "@/components/permissions/protected-action";
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
import type { TransferStatus } from "@prisma/client";

interface TPN {
  id: string;
  tpnNumber: string;
  date: Date;
  status: TransferStatus;
  isTrash: boolean;
  sourceWarehouse: { name: string } | null;
  destinationWarehouse: { name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TpnListClientProps {
  initialTPNs: TPN[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
    approve: boolean;
  };
  warehouses?: any[];
  userContext?: {
    isNormalUser: boolean;
    defaultWarehouseId: string | null;
  };
}

const STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: "Draft",
  SHIPPED: "Shipped",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export default function TpnListClient({
  initialTPNs = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  userId: providedUserId,
  permissions,
  warehouses = [],
  userContext,
}: TpnListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteTPNId, setDeleteTPNId] = useState<string | null>(null);
  const [restoreTPNId, setRestoreTPNId] = useState<string | null>(null);
  const [shipId, setShipId] = useState<string | null>(null);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [selectedTPNs, setSelectedTPNs] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/procurements/tpn?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteTPNId) return;

    startTransition(async () => {
      const result = await deleteTPN(deleteTPNId);
      if (result.success) {
        setDeleteTPNId(null);
        toast({
          title: "Success",
          description: "TPN moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete TPN",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreTPNId) return;

    startTransition(async () => {
      const result = await bulkUpdateTPNStatus([restoreTPNId], "restore");
      if (result.success) {
        setRestoreTPNId(null);
        toast({
          title: "Success",
          description: "TPN restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore TPN",
          variant: "destructive",
        });
      }
    });
  };

  const handleShip = async () => {
    if (!shipId) return;
    
    startTransition(async () => {
      const result = await shipTPN(shipId);
      if (result.success) {
        setShipId(null);
        toast({
          title: "Success",
          description: "TPN shipped successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to ship TPN",
          variant: "destructive",
        });
      }
    });
  };

  const handleReceive = async () => {
    if (!receiveId) return;
    
    startTransition(async () => {
      const result = await receiveTPN(receiveId);
      if (result.success) {
        setReceiveId(null);
        toast({
          title: "Success",
          description: "TPN received successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to receive TPN",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectTPN = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTPNs);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTPNs(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTPNs(new Set(initialTPNs.map((tpn) => tpn.id)));
    } else {
      setSelectedTPNs(new Set());
    }
  };

  const handleBulkAction = async (action: "trash" | "restore" | "delete-permanently") => {
    if (selectedTPNs.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one TPN",
        variant: "destructive",
      });
      return;
    }

    const tpnIds = Array.from(selectedTPNs);

    startTransition(async () => {
      let result;

      if (action === "trash") {
        result = await bulkUpdateTPNStatus(tpnIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateTPNStatus(tpnIds, "restore");
      } else {
        result = await deleteTPNsPermanently(tpnIds);
      }

      if (result.success) {
        setSelectedTPNs(new Set());
        toast({
          title: "Success",
          description: "Bulk action completed successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to perform bulk action",
          variant: "destructive",
        });
      }
    });
  };

  const allSelected =
    initialTPNs.length > 0 && selectedTPNs.size === initialTPNs.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by TPN number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => handleSearch("")}
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isTrash && (
          <Select
            value={searchParams.get("warehouseId") || (userContext?.isNormalUser ? userContext.defaultWarehouseId || "all" : "all")}
            onValueChange={(val) => {
              const params = new URLSearchParams(searchParams.toString());
              if (val && val !== "all") {
                params.set("warehouseId", val);
              } else {
                params.delete("warehouseId");
              }
              params.set("page", "1");
              router.push(`/dashboard/procurements/tpn?${params.toString()}`);
            }}
            disabled={userContext?.isNormalUser}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses?.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2">
          {selectedTPNs.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedTPNs.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || selectedTPNs.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <DropdownMenuItem
                  onClick={() => handleBulkAction("trash")}
                  disabled={selectedTPNs.size === 0}
                >
                  <FiTrash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedTPNs.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedTPNs.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>TPN Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialTPNs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed transfer notes found" : "No transfer notes found"}
                </TableCell>
              </TableRow>
            ) : (
              initialTPNs.map((tpn) => {
                const isSelected = selectedTPNs.has(tpn.id);

                return (
                  <TableRow key={tpn.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectTPN(tpn.id, checked as boolean)
                        }
                        aria-label={`Select ${tpn.tpnNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {tpn.tpnNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(tpn.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{tpn.sourceWarehouse?.name}</TableCell>
                    <TableCell>{tpn.destinationWarehouse?.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        tpn.status === "RECEIVED" ? "default" : 
                        tpn.status === "SHIPPED" ? "secondary" : 
                        tpn.status === "CANCELLED" ? "destructive" : "outline"
                      }>
                        {STATUS_LABELS[tpn.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="procurements.tpn"
                              action="view"
                              href={`/dashboard/procurements/tpn/${tpn.id}`}
                              userId={providedUserId}
                              hasAccess={permissions?.view}
                            />
                            
                            {tpn.status === "DRAFT" && permissions?.approve && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
                                onClick={() => setShipId(tpn.id)}
                                disabled={isPending}
                                title="Ship"
                              >
                                <FiTruck className="h-4 w-4" />
                              </Button>
                            )}
      
                            {tpn.status === "SHIPPED" && permissions?.approve && (
                              <Button
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                                onClick={() => setReceiveId(tpn.id)}
                                disabled={isPending}
                                title="Receive"
                              >
                                <FiCheckSquare className="h-4 w-4" />
                              </Button>
                            )}

                            {tpn.status === "DRAFT" && (
                              <ProtectedAction
                                permissionKey="procurements.tpn"
                                action="move-to-trash"
                                onClick={() => setDeleteTPNId(tpn.id)}
                                userId={providedUserId}
                                hasAccess={permissions?.moveToTrash}
                                buttonProps={{
                                  disabled: isPending,
                                  className: "text-destructive hover:text-destructive",
                                  title: "Move to trash",
                                }}
                              />
                            )}
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreTPNId(tpn.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                            title="Restore"
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        {isTrash && (
                          <ProtectedAction
                            permissionKey="procurements.tpn"
                            action="delete-permanently"
                            onClick={() => setDeleteTPNId(tpn.id)}
                            userId={providedUserId}
                            hasAccess={permissions?.deletePermanently}
                            buttonProps={{
                              disabled: isPending,
                              className: "text-destructive hover:text-destructive",
                              title: "Delete permanently",
                            }}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} transfers
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/procurements/tpn?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === initialPagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page + 1));
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/procurements/tpn?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTPNId} onOpenChange={() => setDeleteTPNId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete TPN Permanently" : "Move TPN to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the transfer note."
                : "This will move the transfer note to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteTPNId) {
                  const result = await deleteTPNsPermanently([deleteTPNId]);
                  if (result.success) {
                    setDeleteTPNId(null);
                    toast({
                      title: "Success",
                      description: "TPN deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete TPN",
                      variant: "destructive",
                    });
                  }
                } else {
                  handleDelete();
                }
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (isTrash ? "Deleting..." : "Moving...") : isTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!shipId} onOpenChange={() => setShipId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ship TPN</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ship this transfer note? Stock will be deducted from the source warehouse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleShip();
              }}
              disabled={isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isPending ? "Shipping..." : "Ship"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!receiveId} onOpenChange={() => setReceiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Receive TPN</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to receive this transfer note? Stock will be added to the destination warehouse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleReceive();
              }}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? "Receiving..." : "Receive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
