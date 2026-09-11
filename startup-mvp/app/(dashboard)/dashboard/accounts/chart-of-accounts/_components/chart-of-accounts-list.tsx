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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FiSearch, FiX, FiRotateCw, FiTrash2, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ProtectedAction from "@/components/permissions/protected-action";
import {
  updateChartOfAccount,
  deleteChartOfAccountsPermanently,
  bulkUpdateChartOfAccountsStatus,
} from "../_actions/chart-of-accounts.action";

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  parent: {
    id: string;
    code: string;
    name: string;
  } | null;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  childCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ChartOfAccountsListClientProps {
  initialAccounts: ChartOfAccount[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  permissions?: {
    view: boolean;
    edit: boolean;
    moveToTrash: boolean;
    deletePermanently: boolean;
  };
}

export default function ChartOfAccountsListClient({
  initialAccounts = [],
  initialPagination,
  initialSearch,
  isTrash = false,
  permissions,
}: ChartOfAccountsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "move-to-trash" | "restore" | "delete-permanently" | "bulk-move-to-trash" | "bulk-restore" | "bulk-delete-permanently" | null;
    targetId?: string;
    targetName?: string;
  }>({
    open: false,
    type: null,
  });

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
    router.push(`/dashboard/accounts/chart-of-accounts?${params.toString()}`);
  };

  const handleSelectAccount = (accountId: string, checked: boolean) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(accountId);
      } else {
        next.delete(accountId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccounts(new Set(initialAccounts.map((a) => a.id)));
    } else {
      setSelectedAccounts(new Set());
    }
  };

  const allSelected = initialAccounts?.length > 0 && selectedAccounts.size === initialAccounts.length;

  const openConfirm = (
    type: "move-to-trash" | "restore" | "delete-permanently" | "bulk-move-to-trash" | "bulk-restore" | "bulk-delete-permanently",
    targetId?: string,
    targetName?: string
  ) => {
    setConfirmModal({
      open: true,
      type,
      targetId,
      targetName,
    });
  };

  const executeConfirmedAction = () => {
    const { type, targetId } = confirmModal;
    setConfirmModal({ open: false, type: null });

    if (!type) return;

    startTransition(async () => {
      let result: { success: boolean; error?: string; count?: number } = { success: false };

      if (type === "move-to-trash" && targetId) {
        result = await updateChartOfAccount(targetId, { status: "trash" });
      } else if (type === "restore" && targetId) {
        result = await updateChartOfAccount(targetId, { status: "active" });
      } else if (type === "delete-permanently" && targetId) {
        result = await deleteChartOfAccountsPermanently([targetId]);
      } else if (type === "bulk-move-to-trash") {
        result = await bulkUpdateChartOfAccountsStatus(Array.from(selectedAccounts), "trash");
        if (result.success) setSelectedAccounts(new Set());
      } else if (type === "bulk-restore") {
        result = await bulkUpdateChartOfAccountsStatus(Array.from(selectedAccounts), "active");
        if (result.success) setSelectedAccounts(new Set());
      } else if (type === "bulk-delete-permanently") {
        result = await deleteChartOfAccountsPermanently(Array.from(selectedAccounts));
        if (result.success) setSelectedAccounts(new Set());
      }

      if (result.success) {
        toast({
          title: "Success",
          description: "Action executed successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Action failed to execute",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkStatusChange = (newStatus: "active" | "inactive") => {
    if (selectedAccounts.size === 0) return;
    startTransition(async () => {
      const result = await bulkUpdateChartOfAccountsStatus(
        Array.from(selectedAccounts),
        newStatus
      );
      if (result.success) {
        toast({
          title: "Success",
          description: `Updated ${result.count} account(s) status to ${newStatus}`,
        });
        setSelectedAccounts(new Set());
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update accounts",
          variant: "destructive",
        });
      }
    });
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "ASSET":
        return "bg-blue-100 text-blue-800";
      case "LIABILITY":
        return "bg-red-100 text-red-800";
      case "EQUITY":
        return "bg-green-100 text-green-800";
      case "REVENUE":
        return "bg-purple-100 text-purple-800";
      case "EXPENSE":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getModalText = () => {
    switch (confirmModal.type) {
      case "move-to-trash":
        return {
          title: "Move Account to Trash",
          description: `Are you sure you want to move account "${confirmModal.targetName}" to trash?`,
          actionText: "Move to Trash",
          destructive: true,
        };
      case "restore":
        return {
          title: "Restore Account",
          description: `Are you sure you want to restore account "${confirmModal.targetName}" to active status?`,
          actionText: "Restore Account",
          destructive: false,
        };
      case "delete-permanently":
        return {
          title: "Delete Account Permanently",
          description: `Are you sure you want to PERMANENTLY delete account "${confirmModal.targetName}"? This action CANNOT be undone.`,
          actionText: "Delete Permanently",
          destructive: true,
        };
      case "bulk-move-to-trash":
        return {
          title: "Bulk Move to Trash",
          description: `Are you sure you want to move ${selectedAccounts.size} selected account(s) to trash?`,
          actionText: "Move Selected to Trash",
          destructive: true,
        };
      case "bulk-restore":
        return {
          title: "Bulk Restore Accounts",
          description: `Are you sure you want to restore ${selectedAccounts.size} selected account(s) to active status?`,
          actionText: "Restore Selected",
          destructive: false,
        };
      case "bulk-delete-permanently":
        return {
          title: "Bulk Delete Permanently",
          description: `Are you sure you want to PERMANENTLY delete ${selectedAccounts.size} selected account(s)? This action CANNOT be undone.`,
          actionText: "Delete Selected Permanently",
          destructive: true,
        };
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to proceed?",
          actionText: "Confirm",
          destructive: false,
        };
    }
  };

  const modalText = getModalText();

  return (
    <div className="space-y-4">
      {/* Search & Bulk Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or description..."
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

        {selectedAccounts.size > 0 && (
          <div className="flex items-center gap-2 bg-muted/60 p-1.5 px-3 rounded-lg border text-sm">
            <Badge variant="secondary" className="font-semibold">
              {selectedAccounts.size} Selected
            </Badge>

            {!isTrash ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange("active")}
                  disabled={isPending}
                  className="h-8 gap-1"
                >
                  <FiCheckCircle className="h-3.5 w-3.5 text-green-600" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusChange("inactive")}
                  disabled={isPending}
                  className="h-8 gap-1"
                >
                  <FiXCircle className="h-3.5 w-3.5 text-amber-600" />
                  Deactivate
                </Button>
                {permissions?.moveToTrash && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openConfirm("bulk-move-to-trash")}
                    disabled={isPending}
                    className="h-8 gap-1"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Move to Trash
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openConfirm("bulk-restore")}
                  disabled={isPending}
                  className="h-8 gap-1"
                >
                  <FiRotateCw className="h-3.5 w-3.5" />
                  Restore
                </Button>
                {permissions?.deletePermanently && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openConfirm("bulk-delete-permanently")}
                    disabled={isPending}
                    className="h-8 gap-1"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </Button>
                )}
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedAccounts(new Set())}
              disabled={isPending}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Children</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed accounts found" : "No accounts found"}
                </TableCell>
              </TableRow>
            ) : (
              initialAccounts.map((account) => {
                const isSelected = selectedAccounts.has(account.id);
                const accountStatus = account.status || "active";
                
                return (
                  <TableRow key={account.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectAccount(account.id, checked as boolean)}
                        aria-label={`Select ${account.code}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {account.code}
                    </TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>
                      <Badge className={getAccountTypeColor(account.type)}>
                        {account.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.parent ? `${account.parent.code} - ${account.parent.name}` : "-"}
                    </TableCell>
                    <TableCell>
                      {account.childCount > 0 ? (
                        <Badge variant="outline" className="font-medium">
                          {account.childCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          accountStatus === "active"
                            ? "default"
                            : accountStatus === "inactive"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {accountStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(account.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="accounts.chart-of-accounts"
                              action="view"
                              href={`/dashboard/accounts/chart-of-accounts/${account.id}`}
                              hasAccess={permissions?.view}
                              buttonProps={{
                                variant: "ghost",
                                size: "sm",
                                className: "h-8 w-8 p-0",
                                title: "View",
                              }}
                            />
                            <ProtectedAction
                              permissionKey="accounts.chart-of-accounts"
                              action="edit"
                              href={`/dashboard/accounts/chart-of-accounts/${account.id}/edit`}
                              hasAccess={permissions?.edit}
                              buttonProps={{
                                variant: "ghost",
                                size: "sm",
                                className: "h-8 w-8 p-0",
                                title: "Edit",
                              }}
                            />
                            <ProtectedAction
                              permissionKey="accounts.chart-of-accounts"
                              action="move-to-trash"
                              onClick={() => openConfirm("move-to-trash", account.id, `${account.code} - ${account.name}`)}
                              hasAccess={permissions?.moveToTrash}
                              buttonProps={{
                                variant: "ghost",
                                size: "sm",
                                className: "h-8 w-8 p-0 text-destructive hover:text-destructive",
                                title: "Move to trash",
                                disabled: isPending,
                              }}
                            />
                          </>
                        )}
                        {isTrash && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openConfirm("restore", account.id, `${account.code} - ${account.name}`)}
                              disabled={isPending}
                              className="h-8 w-8 p-0"
                              title="Restore"
                            >
                              <FiRotateCw className="h-4 w-4" />
                            </Button>
                            <ProtectedAction
                              permissionKey="accounts.chart-of-accounts"
                              action="delete-permanently"
                              onClick={() => openConfirm("delete-permanently", account.id, `${account.code} - ${account.name}`)}
                              hasAccess={permissions?.deletePermanently}
                              buttonProps={{
                                variant: "ghost",
                                size: "sm",
                                className: "h-8 w-8 p-0 text-destructive hover:text-destructive",
                                title: "Delete permanently",
                                disabled: isPending,
                              }}
                            />
                          </>
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

      {/* Pagination */}
      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} accounts
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1 || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/accounts/chart-of-accounts?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page >= initialPagination.totalPages || isPending}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page + 1));
                router.push(`/dashboard/accounts/chart-of-accounts?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AlertDialog
        open={confirmModal.open}
        onOpenChange={(open) => !open && setConfirmModal({ open: false, type: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{modalText.title}</AlertDialogTitle>
            <AlertDialogDescription>{modalText.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmedAction}
              disabled={isPending}
              className={cn(modalText.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {modalText.actionText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

