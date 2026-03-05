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
import { FiSearch, FiEdit, FiTrash2, FiMoreVertical, FiRotateCw, FiStar } from "react-icons/fi";
import { 
  deleteQuotationTerms, 
  bulkUpdateQuotationTermsStatus, 
  deleteQuotationTermsPermanently, 
  restoreQuotationTerms 
} from "../../_actions/quotationTerms.action";
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

interface QuotationTerms {
  id: string;
  title: string;
  content: string;
  status: string;
  isDefault: boolean;
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

interface QuotationTermsListClientProps {
  initialTerms: QuotationTerms[];
  initialPagination: Pagination;
  initialSearch: string;
  isTrash?: boolean;
  onRefresh?: () => void;
}

export default function QuotationTermsListClient({
  initialTerms,
  initialPagination,
  initialSearch,
  isTrash = false,
  onRefresh,
}: QuotationTermsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [deleteTermsId, setDeleteTermsId] = useState<string | null>(null);
  const [restoreTermsId, setRestoreTermsId] = useState<string | null>(null);
  const [permanentDeleteTermsId, setPermanentDeleteTermsId] = useState<string | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("search", value);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/dashboard/settings?section=tos&${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteTermsId) return;
    startTransition(async () => {
      const result = await deleteQuotationTerms(deleteTermsId);
      if (result.success) {
        setDeleteTermsId(null);
        toast({ title: "Success", description: "Terms moved to trash" });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete", variant: "destructive" });
      }
    });
  };

  const handleRestore = async () => {
    if (!restoreTermsId) return;
    startTransition(async () => {
      const result = await restoreQuotationTerms(restoreTermsId);
      if (result.success) {
        setRestoreTermsId(null);
        toast({ title: "Success", description: "Terms restored" });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to restore", variant: "destructive" });
      }
    });
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTermsId) return;
    startTransition(async () => {
      const result = await deleteQuotationTermsPermanently([permanentDeleteTermsId]);
      if (result.success) {
        setPermanentDeleteTermsId(null);
        toast({ title: "Success", description: "Terms permanently deleted" });
        if (onRefresh) onRefresh();
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete", variant: "destructive" });
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedTerms(new Set(initialTerms.map((t) => t.id)));
    else setSelectedTerms(new Set());
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTerms);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedTerms(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedTerms.size === 0) return;
    const ids = Array.from(selectedTerms);
    startTransition(async () => {
      let result;
      if (action === "delete") result = await bulkUpdateQuotationTermsStatus(ids, "trash");
      else if (action === "restore" || action === "activate") result = await bulkUpdateQuotationTermsStatus(ids, "active");
      else if (action === "deactivate") result = await bulkUpdateQuotationTermsStatus(ids, "inactive");
      else if (action === "permanent-delete") result = await deleteQuotationTermsPermanently(ids);
      
      if (result?.success) {
        setSelectedTerms(new Set());
        toast({ title: "Success", description: `Updated successfully` });
        if (onRefresh) onRefresh();
        router.refresh();
      }
    });
  };

  const allSelected = selectedTerms.size === initialTerms.length && initialTerms.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search terms..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedTerms.size > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedTerms.size} selected
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending || selectedTerms.size === 0}>
                <FiMoreVertical className="w-4 h-4 mr-2" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isTrash ? (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("restore")}><FiRotateCw className="w-4 h-4 mr-2" /> Restore</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("permanent-delete")} className="text-destructive"><FiTrash2 className="w-4 h-4 mr-2" /> Delete Permanently</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleBulkAction("activate")}>Activate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>Deactivate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("delete")} className="text-destructive"><FiTrash2 className="w-4 h-4 mr-2" /> Move to Trash</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"><Checkbox checked={allSelected} onCheckedChange={handleSelectAll} /></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialTerms.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No terms found</TableCell></TableRow>
            ) : (
              initialTerms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell><Checkbox checked={selectedTerms.has(term.id)} onCheckedChange={(checked) => handleSelectItem(term.id, checked === true)} /></TableCell>
                  <TableCell className="font-medium">{term.title}</TableCell>
                  <TableCell>{term.isDefault && <FiStar className="fill-yellow-400 text-yellow-400" />}</TableCell>
                  <TableCell><Badge variant={term.status === "active" ? "default" : term.status === "inactive" ? "secondary" : "destructive"}>{term.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={term.creator.image || undefined} />
                        <AvatarFallback className="text-xs">{(term.creator.name || "U")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{term.creator.name || term.creator.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(term.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isTrash && (
                        <Button variant="ghost" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("editQuotationTerms", { detail: term }))}>
                          <FiEdit className="w-4 h-4" />
                        </Button>
                      )}
                      {isTrash ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setRestoreTermsId(term.id)}><FiRotateCw className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setPermanentDeleteTermsId(term.id)} className="text-destructive"><FiTrash2 className="w-4 h-4" /></Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTermsId(term.id)}><FiTrash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {initialPagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {initialPagination.page} of {initialPagination.totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/settings?section=tos&page=${initialPagination.page - 1}`)} disabled={initialPagination.page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/settings?section=tos&page=${initialPagination.page + 1}`)} disabled={initialPagination.page === initialPagination.totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Dialogs scaled down for brevity, logic matches CoverLetterList */}
      <AlertDialog open={!!deleteTermsId} onOpenChange={(open) => !open && setDeleteTermsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Move to Trash</AlertDialogTitle><AlertDialogDescription>Move this terms set to trash?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isPending}>Move to Trash</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!restoreTermsId} onOpenChange={(open) => !open && setRestoreTermsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Restore</AlertDialogTitle><AlertDialogDescription>Restore this terms set?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRestore} disabled={isPending}>Restore</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!permanentDeleteTermsId} onOpenChange={(open) => !open && setPermanentDeleteTermsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Permanently</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handlePermanentDelete} disabled={isPending} className="bg-destructive text-destructive-foreground">Delete Permanently</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
