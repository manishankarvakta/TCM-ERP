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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw, FiBook } from "react-icons/fi";
import { deleteClient, bulkUpdateClientStatus, deleteClientsPermanently } from "../_actions/client.action";
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

interface Client {
  id: string;
  name: string | null;
  clientCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  company: string | null;
  image: string | null;
  status: string;
  clientType?: string | null;
  membershipTier?: string | null;
  membershipPoints?: number | null;
  warehouseId?: string | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdBy: string;
  dueAmount: number;
  createdByUser: {
    id: string;
    name: string | null;
    email: string;
  };
  ChartOfAccount: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ClientsListClientProps {
  initialClients: Client[];
  initialPagination: Pagination;
  initialSearch: string;
  initialWarehouse?: string;
  warehouses?: Array<{ id: string; name: string; code: string }>;
  isTrash?: boolean;
  userId?: string;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
    viewLedger?: boolean;
  };
}

export default function ClientsListClient({
  initialClients = [],
  initialPagination,
  initialSearch,
  initialWarehouse = "all",
  warehouses = [],
  isTrash = false,
  userId: providedUserId,
  permissions,
}: ClientsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [restoreClientId, setRestoreClientId] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    const windowSize = 2;
    pages.push(1);
    const startRange = Math.max(2, currentPage - windowSize);
    const endRange = Math.min(totalPages - 1, currentPage + windowSize);
    if (startRange > 2) {
      pages.push("...");
    }
    for (let i = startRange; i <= endRange; i++) {
      pages.push(i);
    }
    if (endRange < totalPages - 1) {
      pages.push("...");
    }
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/clients?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit.toString());
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/clients?${params.toString()}`);
  };

  const renderLimitSelector = () => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <Select
          value={String(initialPagination.limit)}
          onValueChange={(val: string) => handleLimitChange(Number(val))}
          disabled={isPending}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue placeholder={String(initialPagination.limit)} />
          </SelectTrigger>
          <SelectContent>
            {[20, 50, 100, 200].map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderPaginationButtons = () => {
    if (initialPagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(initialPagination.page - 1)}
          disabled={initialPagination.page === 1 || isPending}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers(initialPagination.page, initialPagination.totalPages).map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
                  ...
                </span>
              );
            }
            const isCurrent = p === initialPagination.page;
            return (
              <Button
                key={`page-${p}`}
                variant={isCurrent ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => handlePageChange(p as number)}
                disabled={isPending}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(initialPagination.page + 1)}
          disabled={initialPagination.page === initialPagination.totalPages || isPending}
        >
          Next
        </Button>
      </div>
    );
  };

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
    router.push(`/dashboard/clients?${params.toString()}`);
  };

  const handleWarehouseFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("warehouse", value);
    } else {
      params.delete("warehouse");
    }
    params.set("page", "1");
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/clients?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteClientId) return;

    startTransition(async () => {
      const result = await deleteClient(deleteClientId);
      if (result.success) {
        setDeleteClientId(null);
        toast({
          title: "Success",
          description: "Client moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete client",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreClientId) return;

    startTransition(async () => {
      const result = await bulkUpdateClientStatus([restoreClientId], "active");
      if (result.success) {
        setRestoreClientId(null);
        toast({
          title: "Success",
          description: "Client restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore client",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectClient = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedClients);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedClients(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(initialClients.map((client) => client.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedClients.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one client",
        variant: "destructive",
      });
      return;
    }

    const clientIds = Array.from(selectedClients);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateClientStatus(clientIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateClientStatus(clientIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateClientStatus(clientIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateClientStatus(clientIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteClientsPermanently(clientIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedClients(new Set());
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
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

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "C";
  };

  const allSelected = initialClients.length > 0 && selectedClients.size === initialClients.length;

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Reduce table padding and font size for clean print layout */
          .print-bordered th,
          .print-bordered td {
            padding: 4px 6px !important;
            font-size: 8.5pt !important;
          }
        }
      `}} />
      {/* Search and Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or company..."
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

        {/* Warehouse Filter */}
        <Select
          value={initialWarehouse}
          onValueChange={(value) => handleWarehouseFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bulk Actions Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedClients.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedClients.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedClients.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("trash")}
                    disabled={selectedClients.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("active")}
                    disabled={selectedClients.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("inactive")}
                    disabled={selectedClients.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedClients.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedClients.size === 0}
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
        <Table className="print-bordered">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 print:hidden">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="print:w-[12%] whitespace-nowrap">Client Code</TableHead>
              <TableHead className="print:w-[18%] whitespace-nowrap">Client</TableHead>
              <TableHead className="print:w-[20%]">Email</TableHead>
              <TableHead className="print:w-[15%] whitespace-nowrap">Phone</TableHead>
              <TableHead className="print:w-[15%]">Company</TableHead>
              <TableHead className="print:hidden">Warehouse</TableHead>
              <TableHead className="print:w-[10%] whitespace-nowrap">Type</TableHead>
              <TableHead className="print:hidden">Membership</TableHead>
              <TableHead className="print:hidden">Status</TableHead>
              <TableHead className="text-right print:w-[10%] whitespace-nowrap">Due</TableHead>
              <TableHead className="text-right print:hidden">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed clients found" : "No clients found"}
                </TableCell>
              </TableRow>
            ) : (
              initialClients.map((client) => {
                const isSelected = selectedClients.has(client.id);
                const clientStatus = client.status || "active";
                
                return (
                  <TableRow key={client.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell className="print:hidden">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                        aria-label={`Select ${client.name || client.email}`}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground print:text-black whitespace-nowrap">
                      {client.clientCode || "-"}
                    </TableCell>
                    <TableCell className="print:whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 print:hidden">
                          <AvatarImage src={client.image || undefined} alt={client.name || client.email || "Client"} />
                          <AvatarFallback>{getInitials(client.name, client.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{client.name || "No name"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground print:text-black">{client.email || "-"}</TableCell>
                    <TableCell className="text-muted-foreground print:text-black whitespace-nowrap">{client.phone || "-"}</TableCell>
                    <TableCell className="text-muted-foreground print:text-black">{client.company || "-"}</TableCell>
                    <TableCell className="print:hidden">
                      {client.warehouse ? (
                        <Badge variant="outline" className="text-xs">
                          {client.warehouse.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="print:text-black print:whitespace-nowrap">
                      <div className="print:hidden">
                        {client.clientType?.toLowerCase() === "wholesale" ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                            Wholesale
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Regular
                          </Badge>
                        )}
                      </div>
                      <span className="hidden print:inline text-black">
                        {client.clientType?.toLowerCase() === "wholesale" ? "Wholesale" : "Regular"}
                      </span>
                    </TableCell>
                    <TableCell className="print:hidden">
                      {client.membershipTier && client.membershipTier !== "NONE" ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 w-fit text-[10px] font-bold">
                            {client.membershipTier}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Points: {client.membershipPoints ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="print:hidden">
                      {clientStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : clientStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap print:text-black print:font-bold">
                      <span
                        className={cn(
                          (client.dueAmount ?? 0) > 0
                            ? "font-semibold text-amber-600 print:text-black"
                            : "text-muted-foreground print:text-black"
                        )}
                      >
                        <span className="print:hidden">৳</span>
                        {(client.dueAmount ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="peoples.clients"
                              action="ledger"
                              href={`/dashboard/clients/ledger?id=${client.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.viewLedger}
                            />
                            <ProtectedAction
                              permissionKey="peoples.clients"
                              action="edit"
                              href={`/dashboard/clients/${client.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.edit}
                            />
                            <ProtectedAction
                              permissionKey="peoples.clients"
                              action="view"
                              href={`/dashboard/clients/details?id=${client.id}`}
                              userId={providedUserId || undefined}
                              hasAccess={permissions?.view}
                            />
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRestoreClientId(client.id);
                              handleRestore();
                            }}
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <ProtectedAction
                          permissionKey="peoples.clients"
                          action={isTrash ? "delete-permanently" : "move-to-trash"}
                          onClick={() => setDeleteClientId(client.id)}
                          userId={providedUserId || undefined}
                          hasAccess={isTrash ? permissions?.deletePermanently : permissions?.moveToTrash}
                          buttonProps={{
                            disabled: isPending,
                            className: "text-destructive hover:text-destructive",
                            title: isTrash ? "Delete permanently" : "Move to trash",
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(initialPagination.totalPages > 1 || initialPagination.total > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
              {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
              {initialPagination.total} clients
            </div>
            {renderLimitSelector()}
          </div>
          {renderPaginationButtons()}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Client Permanently" : "Move Client to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the client and all associated data."
                : "This will move the client to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteClientId) {
                  const result = await deleteClientsPermanently([deleteClientId]);
                  if (result.success) {
                    setDeleteClientId(null);
                    toast({
                      title: "Success",
                      description: "Client deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete client",
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
    </div>
  );
}

