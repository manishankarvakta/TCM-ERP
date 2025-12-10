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
import Link from "next/link";
import { FiSearch, FiEdit, FiTrash2, FiX, FiEye, FiMoreVertical, FiCheck, FiRotateCw } from "react-icons/fi";
import { deleteQuotation, bulkUpdateQuotationStatus, deleteQuotationsPermanently } from "@/app/actions/quotations";
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
import { cn } from "@/lib/utils";

interface Quotation {
  id: string;
  quotationNumber: string;
  subject: string;
  date: Date | string;
  status: string;
  isTrash?: boolean;
  total: any;
  client: {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    image: string | null;
  } | null;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  organization: {
    id: string;
    name: string | null;
  } | null;
  createdAt: Date;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface QuotationsListClientProps {
  initialQuotations: Quotation[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
}

export default function QuotationsListClient({
  initialQuotations,
  initialPagination,
  initialSearch,
  isTrash = false,
}: QuotationsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteQuotationId, setDeleteQuotationId] = useState<string | null>(null);
  const [restoreQuotationId, setRestoreQuotationId] = useState<string | null>(null);
  const [selectedQuotations, setSelectedQuotations] = useState<Set<string>>(new Set());
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
    router.push(`/dashboard/quotations?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteQuotationId) return;

    // Close dialog immediately to prevent blink
    setDeleteQuotationId(null);

    startTransition(async () => {
      const result = await deleteQuotation(deleteQuotationId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Quotation moved to trash",
        });
        // Use router.push to force navigation and prevent blink
        const params = new URLSearchParams(searchParams.toString());
        const tab = params.get('tab') || 'all';
        params.set('tab', tab);
        router.push(`/dashboard/quotations?${params.toString()}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete quotation",
          variant: "destructive",
        });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreQuotationId) return;

    // Close dialog immediately to prevent blink
    setRestoreQuotationId(null);

    startTransition(async () => {
      const result = await bulkUpdateQuotationStatus([restoreQuotationId], "DRAFT");
      if (result.success) {
        toast({
          title: "Success",
          description: "Quotation restored successfully",
        });
        // Use router.push to force navigation and prevent blink
        router.push('/dashboard/quotations?tab=DRAFT');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to restore quotation",
          variant: "destructive",
        });
      }
    });
  };

  const handleSelectQuotation = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedQuotations);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedQuotations(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotations(new Set(initialQuotations.map((q) => q.id)));
    } else {
      setSelectedQuotations(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedQuotations.size === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one quotation",
        variant: "destructive",
      });
      return;
    }

    const quotationIds = Array.from(selectedQuotations);

    startTransition(async () => {
      let result;
      
      if (action === "trash") {
        result = await bulkUpdateQuotationStatus(quotationIds, "TRASH");
      } else if (action === "restore") {
        result = await bulkUpdateQuotationStatus(quotationIds, "DRAFT");
      } else if (action === "delete-permanently") {
        result = await deleteQuotationsPermanently(quotationIds);
      } else if (["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "REVISED"].includes(action)) {
        result = await bulkUpdateQuotationStatus(quotationIds, action);
      } else {
        return;
      }

      if (result.success) {
        setSelectedQuotations(new Set());
        setBulkAction(null);
        toast({
          title: "Success",
          description: `Bulk action completed successfully`,
        });
        // Use router.push to force navigation and prevent blink
        const params = new URLSearchParams(searchParams.toString());
        const tab = params.get('tab') || 'all';
        params.set('tab', tab);
        router.push(`/dashboard/quotations?${params.toString()}`);
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
    return "?";
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "draft") {
      return <Badge variant="secondary">Draft</Badge>;
    } else if (statusLower === "sent") {
      return <Badge variant="default">Sent</Badge>;
    } else if (statusLower === "accepted") {
      return <Badge className="bg-green-600 hover:bg-green-700">Accepted</Badge>;
    } else if (statusLower === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    } else if (statusLower === "expired") {
      return <Badge variant="outline">Expired</Badge>;
    } else if (statusLower === "revised") {
      return <Badge className="bg-blue-600 hover:bg-blue-700">Revised</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const allSelected = initialQuotations.length > 0 && selectedQuotations.size === initialQuotations.length;
  const someSelected = selectedQuotations.size > 0 && selectedQuotations.size < initialQuotations.length;

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number, subject, or client..."
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
          {selectedQuotations.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedQuotations.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isPending || selectedQuotations.size === 0}
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
                    disabled={selectedQuotations.size === 0}
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Move to Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("DRAFT");
                      handleBulkAction("DRAFT");
                    }}
                    disabled={selectedQuotations.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Mark as Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("SENT");
                      handleBulkAction("SENT");
                    }}
                    disabled={selectedQuotations.size === 0}
                  >
                    <FiCheck className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setBulkAction("restore");
                      handleBulkAction("restore");
                    }}
                    disabled={selectedQuotations.size === 0}
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
                    disabled={selectedQuotations.size === 0}
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
              <TableHead>Quotation Number</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {isTrash ? "No trashed quotations found" : "No quotations found"}
                </TableCell>
              </TableRow>
            ) : (
              initialQuotations.map((quotation) => {
                const isSelected = selectedQuotations.has(quotation.id);
                
                return (
                  <TableRow key={quotation.id} className={cn(isSelected && "bg-muted/50")}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectQuotation(quotation.id, checked as boolean)}
                        aria-label={`Select ${quotation.quotationNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                    <TableCell>{quotation.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={quotation.client?.image || undefined} 
                            alt={quotation.client?.name || quotation.client?.company || "Client"} 
                          />
                          <AvatarFallback>
                            {getInitials(quotation.client?.name || null, quotation.client?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{quotation.client?.name || quotation.client?.company || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(quotation.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={quotation.submittedBy?.image || undefined} 
                            alt={quotation.submittedBy?.name || quotation.submittedBy?.email || "User"} 
                          />
                          <AvatarFallback>
                            {getInitials(quotation.submittedBy?.name || null, quotation.submittedBy?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{quotation.submittedBy?.name || quotation.submittedBy?.email || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(quotation.total || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0">
                        {!isTrash && (
                          <>
                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                              <Link href={`/dashboard/quotations/${quotation.id}`}>
                                <FiEye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                              <Link href={`/dashboard/quotations/${quotation.id}/edit`}>
                                <FiEdit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </>
                        )}
                        {isTrash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRestoreQuotationId(quotation.id)}
                            className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                            title="Restore quotation"
                            disabled={isPending}
                          >
                            <FiRotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteQuotationId(quotation.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
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
            of {initialPagination.total} quotations
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
                router.push(`/dashboard/quotations?${params.toString()}`);
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
                router.push(`/dashboard/quotations?${params.toString()}`);
              }}
              disabled={initialPagination.page === initialPagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreQuotationId} onOpenChange={() => setRestoreQuotationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the quotation from trash and change its status to Draft. You can edit and use it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!restoreQuotationId) return;
                // Close dialog immediately to prevent blink
                setRestoreQuotationId(null);
                handleRestore();
              }}
              disabled={isPending}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteQuotationId} onOpenChange={() => setDeleteQuotationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrash ? "Delete Quotation Permanently" : "Move Quotation to Trash"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrash
                ? "This action cannot be undone. This will permanently delete the quotation and all associated data."
                : "This will move the quotation to trash. You can restore it later from the Trash tab."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteQuotationId) return;
                
                // Close dialog immediately to prevent blink
                setDeleteQuotationId(null);
                
                startTransition(async () => {
                  let result;
                  
                  if (isTrash) {
                    result = await deleteQuotationsPermanently([deleteQuotationId]);
                    if (result.success) {
                      toast({
                        title: "Success",
                        description: "Quotation deleted permanently",
                      });
                      // Use router.push to force navigation and prevent blink
                      router.push('/dashboard/quotations?tab=trash');
                    } else {
                      toast({
                        title: "Error",
                        description: result.error || "Failed to delete quotation",
                        variant: "destructive",
                      });
                    }
                  } else {
                    result = await deleteQuotation(deleteQuotationId);
                    if (result.success) {
                      toast({
                        title: "Success",
                        description: "Quotation moved to trash",
                      });
                      // Use router.push to force navigation and prevent blink
                      const params = new URLSearchParams(searchParams.toString());
                      const tab = params.get('tab') || 'all';
                      params.set('tab', tab);
                      router.push(`/dashboard/quotations?${params.toString()}`);
                    } else {
                      toast({
                        title: "Error",
                        description: result.error || "Failed to move quotation to trash",
                        variant: "destructive",
                      });
                    }
                  }
                });
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

