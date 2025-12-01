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
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiRotateCw } from "react-icons/fi";
import { deleteCoverLetter, bulkUpdateCoverLetterStatus, deleteCoverLettersPermanently, restoreCoverLetter } from "../../_actions/coverLetter.action";
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

interface CoverLetter {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CoverLettersListClientProps {
  initialCoverLetters: CoverLetter[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  onRefresh?: () => void;
}

export default function CoverLettersListClient({
  initialCoverLetters,
  initialPagination,
  initialSearch,
  isTrash = false,
  onRefresh,
}: CoverLettersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteCoverLetterId, setDeleteCoverLetterId] = useState<string | null>(null);
  const [restoreCoverLetterId, setRestoreCoverLetterId] = useState<string | null>(null);
  const [permanentDeleteCoverLetterId, setPermanentDeleteCoverLetterId] = useState<string | null>(null);
  const [selectedCoverLetters, setSelectedCoverLetters] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/settings?section=coverLetter&${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteCoverLetterId) return;

    startTransition(async () => {
      const result = await deleteCoverLetter(deleteCoverLetterId);
      if (result.success) {
        setDeleteCoverLetterId(null);
        toast({
          title: "Success",
          description: "Cover letter moved to trash",
        });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete cover letter",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreCoverLetterId) return;

    startTransition(async () => {
      const result = await restoreCoverLetter(restoreCoverLetterId);
      if (result.success) {
        setRestoreCoverLetterId(null);
        toast({
          title: "Success",
          description: "Cover letter restored",
        });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore cover letter",
          variant: "destructive",
        });
      }
    });
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteCoverLetterId) return;

    startTransition(async () => {
      const result = await deleteCoverLettersPermanently([permanentDeleteCoverLetterId]);
      if (result.success) {
        setPermanentDeleteCoverLetterId(null);
        toast({
          title: "Success",
          description: "Cover letter permanently deleted",
        });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete cover letter",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoverLetters(new Set(initialCoverLetters.map((cl) => cl.id)));
    } else {
      setSelectedCoverLetters(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCoverLetters);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedCoverLetters(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCoverLetters.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one cover letter",
        variant: "destructive",
      });
      return;
    }

    const ids = Array.from(selectedCoverLetters);
    setBulkAction(action);

    startTransition(async () => {
      let result;
      if (action === "delete") {
        result = await bulkUpdateCoverLetterStatus(ids, "trash");
      } else if (action === "restore") {
        result = await bulkUpdateCoverLetterStatus(ids, "active");
      } else if (action === "activate") {
        result = await bulkUpdateCoverLetterStatus(ids, "active");
      } else if (action === "deactivate") {
        result = await bulkUpdateCoverLetterStatus(ids, "inactive");
      } else if (action === "permanent-delete") {
        result = await deleteCoverLettersPermanently(ids);
      } else {
        result = { success: false, error: "Unknown action" };
      }

      if (result.success) {
        setSelectedCoverLetters(new Set());
        setBulkAction(null);
        toast({
          title: "Success",
          description: `Cover letters ${action}ed successfully`,
        });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${action} cover letters`,
          variant: "destructive",
        });
      }
    });
  };

  const someSelected = selectedCoverLetters.size > 0;
  const allSelected = selectedCoverLetters.size === initialCoverLetters.length && initialCoverLetters.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search cover letters..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        {/* Bulk Actions Dropdown - Always visible */}
        <div className="flex items-center gap-2">
          {selectedCoverLetters.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedCoverLetters.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedCoverLetters.size === 0}
              >
                <FiMoreVertical className="w-4 h-4 mr-2" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("restore")}
                    disabled={selectedCoverLetters.size === 0}
                  >
                    <FiRotateCw className="w-4 h-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("permanent-delete")}
                    className="text-destructive"
                    disabled={selectedCoverLetters.size === 0}
                  >
                    <FiTrash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("activate")}
                    disabled={selectedCoverLetters.size === 0}
                  >
                    Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("deactivate")}
                    disabled={selectedCoverLetters.size === 0}
                  >
                    Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("delete")}
                    className="text-destructive"
                    disabled={selectedCoverLetters.size === 0}
                  >
                    <FiTrash2 className="w-4 h-4 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Content Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialCoverLetters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No cover letters found
                </TableCell>
              </TableRow>
            ) : (
              initialCoverLetters.map((coverLetter) => {
                const isSelected = selectedCoverLetters.has(coverLetter.id);
                const creatorInitials = coverLetter.creator.name
                  ? coverLetter.creator.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : coverLetter.creator.email[0].toUpperCase();

                return (
                  <TableRow key={coverLetter.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectItem(coverLetter.id, checked === true)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{coverLetter.title}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate text-sm text-muted-foreground">
                        {coverLetter.content.substring(0, 100)}
                        {coverLetter.content.length > 100 && "..."}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          coverLetter.status === "active"
                            ? "default"
                            : coverLetter.status === "inactive"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {coverLetter.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={coverLetter.creator.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {creatorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {coverLetter.creator.name || coverLetter.creator.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(coverLetter.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Handle edit - will be passed to parent
                              const event = new CustomEvent("editCoverLetter", {
                                detail: coverLetter,
                              });
                              window.dispatchEvent(event);
                            }}
                          >
                            <FiEdit className="w-4 h-4" />
                          </Button>
                        )}
                        {isTrash ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRestoreCoverLetterId(coverLetter.id)}
                            >
                              <FiRotateCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPermanentDeleteCoverLetterId(coverLetter.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteCoverLetterId(coverLetter.id)}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </Button>
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
            {Math.min(initialPagination.page * initialPagination.limit, initialPagination.total)}{" "}
            of {initialPagination.total} cover letters
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, initialPagination.page - 1)));
                router.push(`/dashboard/settings?section=coverLetter&${params.toString()}`);
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
                router.push(`/dashboard/settings?section=coverLetter&${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCoverLetterId} onOpenChange={(open) => !open && setDeleteCoverLetterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move this cover letter to trash? You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreCoverLetterId} onOpenChange={(open) => !open && setRestoreCoverLetterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Cover Letter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this cover letter?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isPending}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!permanentDeleteCoverLetterId} onOpenChange={(open) => !open && setPermanentDeleteCoverLetterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this cover letter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

