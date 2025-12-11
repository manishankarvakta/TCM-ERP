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
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiCheck, FiMoreVertical, FiEye, FiRotateCw } from "react-icons/fi";
import { deleteOrganization, bulkUpdateOrganizationStatus, deleteOrganizationsPermanently } from "../../_actions/organization.action";
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

interface Organization {
  id: string;
  name: string;
  details: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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

interface OrganizationsListClientProps {
  initialOrganizations: Organization[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  onRefresh?: () => void;
}

export default function OrganizationsListClient({
  initialOrganizations,
  initialPagination,
  initialSearch,
  isTrash = false,
  onRefresh,
}: OrganizationsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteOrganizationId, setDeleteOrganizationId] = useState<string | null>(null);
  const [restoreOrganizationId, setRestoreOrganizationId] = useState<string | null>(null);
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
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
    router.push(`/dashboard/settings?section=organization&${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteOrganizationId) return;

    startTransition(async () => {
      const result = await deleteOrganization(deleteOrganizationId);
      if (result.success) {
        setDeleteOrganizationId(null);
        toast({
          title: "Success",
          description: "Organization moved to trash",
        });
        // Trigger refresh callback if provided, otherwise use router
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete organization",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreOrganizationId) return;

    startTransition(async () => {
      const result = await bulkUpdateOrganizationStatus([restoreOrganizationId], "active");
      if (result.success) {
        setRestoreOrganizationId(null);
        toast({
          title: "Success",
          description: "Organization restored successfully",
        });
        // Trigger refresh callback if provided, otherwise use router
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore organization",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedOrganizations);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedOrganizations(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrganizations(new Set(initialOrganizations.map((org) => org.id)));
    } else {
      setSelectedOrganizations(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedOrganizations.size === 0) return;

    const orgIds = Array.from(selectedOrganizations);

    startTransition(async () => {
      let result;
      if (action === "trash") {
        result = await bulkUpdateOrganizationStatus(orgIds, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateOrganizationStatus(orgIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteOrganizationsPermanently(orgIds);
      } else {
        result = await bulkUpdateOrganizationStatus(orgIds, action as "active" | "inactive");
      }

      if (result.success) {
        setSelectedOrganizations(new Set());
        setBulkAction(null);
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
        });
        // Trigger refresh callback if provided, otherwise use router
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to perform bulk action",
          variant: "destructive",
        });
      }
    });
  };

  const allSelected = initialOrganizations.length > 0 && selectedOrganizations.size === initialOrganizations.length;
  const someSelected = selectedOrganizations.size > 0 && selectedOrganizations.size < initialOrganizations.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, details, address, phone, email, or website..."
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

        {/* Bulk Actions Dropdown */}
        <div className="flex items-center gap-2">
          {selectedOrganizations.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedOrganizations.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedOrganizations.size === 0}
              >
                <FiMoreVertical className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("trash");
                      handleBulkAction("trash");
                    }}
                    disabled={selectedOrganizations.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("active");
                      handleBulkAction("active");
                    }}
                    disabled={selectedOrganizations.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("inactive");
                      handleBulkAction("inactive");
                    }}
                    disabled={selectedOrganizations.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("restore");
                      handleBulkAction("restore");
                    }}
                    disabled={selectedOrganizations.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("delete-permanently");
                      handleBulkAction("delete-permanently");
                    }}
                    className="text-destructive"
                    disabled={selectedOrganizations.size === 0}
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
              <TableHead>Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed organizations found" : "No organizations found"}
                </TableCell>
              </TableRow>
            ) : (
              initialOrganizations.map((org) => {
                const isSelected = selectedOrganizations.has(org.id);
                const orgStatus = org.status || "active";
                
                return (
                  <TableRow key={org.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(org.id, checked as boolean)}
                        aria-label={`Select ${org.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      {org.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={org.logo}
                          alt={org.name}
                          className="h-10 w-10 object-cover rounded border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No logo</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.details || "-"}
                    </TableCell>
                    <TableCell>
                      {orgStatus === "trash" ? (
                        <Badge variant="destructive">Trash</Badge>
                      ) : orgStatus === "inactive" ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.creator.name || org.creator.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(org.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/settings?section=organization&view=${org.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/settings?section=organization&edit=${org.id}`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreOrganizationId(org.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Restore organization"
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteOrganizationId(org.id)}
                          className="text-destructive hover:text-destructive"
                          title={isTrash ? "Delete permanently" : "Move to trash"}
                          disabled={isPending}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
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
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}{" "}
            of {initialPagination.total} organizations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/settings?section=organization&${params.toString()}`);
              }}
              disabled={initialPagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {initialPagination.page} of {initialPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(initialPagination.totalPages, initialPagination.page + 1)));
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/settings?section=organization&${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreOrganizationId} onOpenChange={() => setRestoreOrganizationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the organization and make it active again. You can use it normally after restoration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isPending}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isPending ? "Restoring..." : "Restore Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrganizationId} onOpenChange={() => setDeleteOrganizationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Organization Permanently" : "Move Organization to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the organization and all associated data."
                : "This will move the organization to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteOrganizationId) {
                  const result = await deleteOrganizationsPermanently([deleteOrganizationId]);
                  if (result.success) {
                    setDeleteOrganizationId(null);
                    toast({
                      title: "Success",
                      description: "Organization deleted permanently",
                    });
                    // Trigger refetch by navigating to the same URL
                    const currentUrl = `/dashboard/settings?section=organization${searchParams.get("tab") ? `&tab=${searchParams.get("tab")}` : ""}${searchParams.get("page") ? `&page=${searchParams.get("page")}` : ""}`;
                    router.push(currentUrl);
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete organization",
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

