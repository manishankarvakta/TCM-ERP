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
import { FiSearch, FiEdit, FiTrash2, FiX, FiMoreVertical, FiEye, FiRotateCw, FiCheck, FiCircle } from "react-icons/fi";
import { deleteGroup, deleteGroupPermanently, bulkUpdateGroupStatus, deleteGroupsPermanently, restoreGroup } from "../_actions/group.action";
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

interface Group {
  id: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  status: string;
  createdBy: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  items: Array<{
    id: string;
    sl: number;
    code: string | null;
    description: string | null;
    unitPrice: number;
    amount: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GroupsListClientProps {
  initialGroups?: Group[];
  initialPagination?: Pagination;
  initialSearch?: string;
  isTrash?: boolean;
}

export default function GroupsListClient({
  initialGroups = [],
  initialPagination,
  initialSearch = "",
  isTrash = false,
}: GroupsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [permanentDeleteGroupId, setPermanentDeleteGroupId] = useState<string | null>(null);
  const [restoreGroupId, setRestoreGroupId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const allSelected = initialGroups.length > 0 && selectedGroups.size === initialGroups.length;
  const someSelected = selectedGroups.size > 0 && selectedGroups.size < initialGroups.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(new Set(initialGroups.map((g) => g.id)));
    } else {
      setSelectedGroups(new Set());
    }
  };

  const handleSelectGroup = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedGroups);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedGroups(newSelected);
  };

  const handleDelete = (id: string) => {
    setDeleteGroupId(id);
  };

  const handleRestore = (id: string) => {
    setRestoreGroupId(id);
  };

  const confirmRestore = () => {
    if (!restoreGroupId) return;
    
    const id = restoreGroupId;
    setRestoreGroupId(null);

    startTransition(async () => {
      const result = await restoreGroup(id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Group restored successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore group",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkAction = async (action: string) => {
    if (selectedGroups.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one group",
        variant: "destructive",
      });
      return;
    }

    const groupIds = Array.from(selectedGroups);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateGroupStatus(groupIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateGroupStatus(groupIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateGroupStatus(groupIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateGroupStatus(groupIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteGroupsPermanently(groupIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedGroups(new Set());
        setBulkAction(null);
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

  const confirmDelete = () => {
    if (!deleteGroupId) return;
    
    const id = deleteGroupId;
    setDeleteGroupId(null);

    startTransition(async () => {
      const result = await deleteGroup(id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Group moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete group",
          variant: "destructive",
        });
      }
    });
  };

  const confirmPermanentDelete = () => {
    if (!permanentDeleteGroupId) return;
    
    const id = permanentDeleteGroupId;
    setPermanentDeleteGroupId(null);

    startTransition(async () => {
      const result = await deleteGroupPermanently(id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Group permanently deleted",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete group permanently",
          variant: "destructive",
        });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "trash") {
      return <Badge variant="destructive">Trash</Badge>;
    } else if (status === "inactive") {
      return <Badge variant="secondary">Inactive</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const params = new URLSearchParams(searchParams.toString());
                params.set("search", search);
                params.set("page", "1");
                router.push(`/dashboard/items/groups?${params.toString()}`);
              }
            }}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                setSearch("");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("search");
                params.set("page", "1");
                router.push(`/dashboard/items/groups?${params.toString()}`);
              }}
            >
              <FiX className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Bulk Actions Dropdown */}
        <div className="flex items-center gap-2">
          {selectedGroups.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedGroups.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedGroups.size === 0}
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
                    disabled={selectedGroups.size === 0}
                    className="text-destructive"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("active")}
                    disabled={selectedGroups.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("inactive")}
                    disabled={selectedGroups.size === 0}
                  >
                    <FiCircle className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedGroups.size === 0}
                  >
                    <FiRotateCw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete-permanently")}
                    className="text-destructive"
                    disabled={selectedGroups.size === 0}
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
              <TableHead>Code</TableHead>
              <TableHead>Items Count</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed groups found" : "No groups found"}
                </TableCell>
              </TableRow>
            ) : (
              initialGroups.map((group) => {
                const isSelected = selectedGroups.has(group.id);
                const groupStatus = group.status || "active";
                const groupLabel = group.code || "Untitled Group";
                
                return (
                  <TableRow key={group.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectGroup(group.id, checked as boolean)}
                        aria-label={`Select ${groupLabel}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{group.code || "-"}</TableCell>
                    <TableCell>{group.items.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {group.creator.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={group.creator.image}
                            alt={group.creator.name || group.creator.email}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {getInitials(group.creator.name, group.creator.email)}
                          </div>
                        )}
                        <span className="text-sm">
                          {group.creator.name || group.creator.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(groupStatus)}</TableCell>
                    <TableCell>{format(new Date(group.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0">
                        {!isTrash && (
                          <>
                            <ProtectedAction
                              permissionKey="items.groups"
                              action="view"
                              href={`/dashboard/items/groups/${group.id}`}
                              buttonProps={{ className: "h-8 w-8 p-0" }}
                            />
                            <ProtectedAction
                              permissionKey="items.groups"
                              action="edit"
                              href={`/dashboard/items/groups/${group.id}/edit`}
                              buttonProps={{ className: "h-8 w-8 p-0" }}
                            />
                            <ProtectedAction
                              permissionKey="items.groups"
                              action="move-to-trash"
                              onClick={() => handleDelete(group.id)}
                              buttonProps={{ className: "h-8 w-8 p-0 text-destructive" }}
                            />
                          </>
                        )}
                        {isTrash && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(group.id)}
                              className="h-8 w-8 p-0"
                            >
                              <FiRotateCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPermanentDeleteGroupId(group.id)}
                              className="h-8 w-8 p-0"
                            >
                              <FiTrash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
      {initialPagination && initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((initialPagination.page - 1) * initialPagination.limit) + 1} to{" "}
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)} of{" "}
            {initialPagination.total} groups
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(initialPagination.page - 1));
                router.push(`/dashboard/items/groups?${params.toString()}`);
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
                router.push(`/dashboard/items/groups?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => !open && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this group to trash? This action can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!permanentDeleteGroupId} onOpenChange={(open) => !open && setPermanentDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this group? This action cannot be undone and all associated items will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPermanentDelete} className="bg-destructive text-destructive-foreground">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreGroupId} onOpenChange={(open) => !open && setRestoreGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this group? It will be moved back to active status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

