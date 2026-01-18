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
import { FiSearch, FiX, FiRotateCw } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ProtectedAction from "@/components/permissions/protected-action";
import { updateChartOfAccount, deleteChartOfAccountsPermanently } from "../_actions/chart-of-accounts.action";

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

  const handleMoveToTrash = (accountId: string) => {
    startTransition(async () => {
      const result = await updateChartOfAccount(accountId, { status: "trash" });
      if (result.success) {
        toast({
          title: "Success",
          description: "Account moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to move account to trash",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = (accountId: string) => {
    startTransition(async () => {
      const result = await updateChartOfAccount(accountId, { status: "active" });
      if (result.success) {
        toast({
          title: "Success",
          description: "Account restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore account",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeletePermanently = (accountId: string) => {
    startTransition(async () => {
      const result = await deleteChartOfAccountsPermanently([accountId]);
      if (result.success) {
        toast({
          title: "Success",
          description: "Account deleted permanently",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete account permanently",
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

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
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
                              onClick={() => handleMoveToTrash(account.id)}
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
                              onClick={() => handleRestore(account.id)}
                              disabled={isPending}
                              className="h-8 w-8 p-0"
                              title="Restore"
                            >
                              <FiRotateCw className="h-4 w-4" />
                            </Button>
                            <ProtectedAction
                              permissionKey="accounts.chart-of-accounts"
                              action="delete-permanently"
                              onClick={() => handleDeletePermanently(account.id)}
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
    </div>
  );
}

