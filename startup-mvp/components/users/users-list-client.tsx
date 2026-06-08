"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiCircle, FiLogOut, FiMoreVertical, FiCheck, FiLock } from "react-icons/fi";
import { deleteUser, forceLogoutUser, bulkUpdateUserStatus, deleteUsersPermanently, toggleUserActiveStatus } from "@/app/actions/user.action";
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

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  status?: string;
  isActive?: string;
  inchargeId?: string | null;
  incharge?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  defaultWarehouse?: {
    name: string;
  } | null;
  createdAt: Date;
  sessions: Array<{
    id: string;
    expires: Date;
  }>;
  _count: {
    userLogs: number;
    sessions: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsersListClientProps {
  initialUsers: User[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

export default function UsersListClient({
  initialUsers,
  initialPagination,
  initialSearch,
  isTrash = false,
}: UsersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const basePath = getBasePathFromPathname(pathname || "");
  const [search, setSearch] = useState(initialSearch);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [logoutUserId, setLogoutUserId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
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
    // Preserve tab parameter
    const tab = searchParams.get("tab") || "all";
    if (tab) {
      params.set("tab", tab);
    }
    router.push(`/dashboard/users?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;

    startTransition(async () => {
      const result = await deleteUser(deleteUserId);
      if (result.success) {
        setDeleteUserId(null);
        toast({
          title: "Success",
          description: "User moved to trash",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user",
          variant: "destructive",
        });
      }
    });
  };

  const handleForceLogout = async () => {
    if (!logoutUserId) return;

    startTransition(async () => {
      const result = await forceLogoutUser(logoutUserId);
      if (result.success) {
        setLogoutUserId(null);
        toast({
          title: "Success",
          description: "User logged out successfully",
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to logout user",
          variant: "destructive",
        });
        setLogoutUserId(null);
      }
    });
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(initialUsers.map((u) => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    const userIds = Array.from(selectedUsers);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateUserStatus(userIds, "trash");
      } else if (action === "active") {
        result = await bulkUpdateUserStatus(userIds, "active");
      } else if (action === "inactive") {
        result = await bulkUpdateUserStatus(userIds, "inactive");
      } else if (action === "restore") {
        result = await bulkUpdateUserStatus(userIds, "active");
      } else if (action === "delete-permanently") {
        result = await deleteUsersPermanently(userIds);
      } else {
        return;
      }

      if (result.success) {
        setSelectedUsers(new Set());
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

  const handleToggleActive = async (userId: string) => {
    startTransition(async () => {
      const result = await toggleUserActiveStatus(userId);
      if (result.success) {
        toast({
          title: "Success",
          description: `User access ${result.isActive === "enabled" ? "enabled" : "disabled"}`,
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to toggle status",
          variant: "destructive",
        });
      }
    });
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

  const allSelected = initialUsers.length > 0 && selectedUsers.size === initialUsers.length;
  const someSelected = selectedUsers.size > 0 && selectedUsers.size < initialUsers.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
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

        {/* Bulk Actions Dropdown - Always visible on the right */}
        <div className="flex items-center gap-2">
          {selectedUsers.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedUsers.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedUsers.size === 0}
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
                    disabled={selectedUsers.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("active");
                      handleBulkAction("active");
                    }}
                    disabled={selectedUsers.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("inactive");
                      handleBulkAction("inactive");
                    }}
                    disabled={selectedUsers.size === 0}
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
                    disabled={selectedUsers.size === 0}
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
                    disabled={selectedUsers.size === 0}
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
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Incharge</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed users found" : "No users found"}
                </TableCell>
              </TableRow>
            ) : (
              initialUsers.map((user) => {
                const isLoggedIn = user.sessions && user.sessions.length > 0;
                const isSelected = selectedUsers.has(user.id);
                const userStatus = user.status || "active";
                
                return (
                  <TableRow key={user.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        aria-label={`Select ${user.name || user.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                          <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name || "No name"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.defaultWarehouse?.name || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.incharge ? (user.incharge.name || user.incharge.email) : "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive === "enabled"}
                        onCheckedChange={() => handleToggleActive(user.id)}
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {userStatus === "trash" ? (
                          <Badge variant="destructive">Trash</Badge>
                        ) : userStatus === "inactive" ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : (
                          <>
                            <div className={`h-2 w-2 rounded-full ${isLoggedIn ? "bg-green-500" : "bg-gray-300"}`} />
                            <span className="text-sm text-muted-foreground">
                              {isLoggedIn ? "Active" : "Offline"}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`${basePath}/users/${user.id}`}>View</Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`${basePath}/users/edit-user?id=${user.id}`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild title="Manage Permissions">
                              <Link href={`${basePath}/settings/permissions/users/${user.id}`}>
                                <FiLock className="h-4 w-4" />
                              </Link>
                            </Button>
                            {isLoggedIn && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLogoutUserId(user.id)}
                                className="text-orange-600 hover:text-orange-700"
                                title="Force logout user"
                                disabled={isPending}
                              >
                                <FiLogOut className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
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
            of {initialPagination.total} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                // Preserve tab parameter
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/users?${params.toString()}`);
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
                // Preserve tab parameter
                const tab = searchParams.get("tab") || "all";
                if (tab) {
                  params.set("tab", tab);
                }
                router.push(`/dashboard/users?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Force Logout Confirmation Dialog */}
      <AlertDialog open={!!logoutUserId} onOpenChange={() => setLogoutUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Logout User</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately log out the user from all active sessions. They will need to log in again to access their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLogout}
              disabled={isPending}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isPending ? "Logging out..." : "Logout User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete User Permanently" : "Move User to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the user and all associated data."
                : "This will move the user to trash. You can restore them later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (isTrash && deleteUserId) {
                  const result = await deleteUsersPermanently([deleteUserId]);
                  if (result.success) {
                    setDeleteUserId(null);
                    toast({
                      title: "Success",
                      description: "User deleted permanently",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: result.error || "Failed to delete user",
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
