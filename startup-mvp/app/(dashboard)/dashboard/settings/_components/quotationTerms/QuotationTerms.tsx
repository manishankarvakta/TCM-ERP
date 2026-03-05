"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FiPlus } from "react-icons/fi";
import { getQuotationTerms } from "../../_actions/quotationTerms.action";
import QuotationTermsListClient from "./list";
import QuotationTermsForm from "./form";
import Link from "next/link";

export default function QuotationTerms() {
  const searchParams = useSearchParams();
  const [terms, setTerms] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerms, setEditingTerms] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const page = parseInt(searchParams.get("page") || "1");
  const tab = searchParams.get("tab") || "all";
  const searchQuery = searchParams.get("search") || "";

  const statusFilter = tab === "trash" ? "trash" : "all";

  useEffect(() => {
    const loadTerms = async () => {
      setIsLoading(true);
      const result = await getQuotationTerms(page, 10, searchQuery, statusFilter);
      if (result.success) {
        setTerms(result.quotationTerms || []);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        });
        setSearch(searchQuery);
      }
      setIsLoading(false);
    };

    loadTerms();
  }, [page, tab, searchQuery, refreshKey]);

  useEffect(() => {
    const handleEdit = (event: CustomEvent) => {
      setEditingTerms(event.detail);
      setIsDialogOpen(true);
    };

    window.addEventListener("editQuotationTerms" as any, handleEdit as EventListener);
    return () => {
      window.removeEventListener("editQuotationTerms" as any, handleEdit as EventListener);
    };
  }, []);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTerms(null);
  };
  const handleFormSuccess = () => {
    handleDialogClose();
    handleRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">TOS & Payment Terms</h1>
          <p className="text-sm text-muted-foreground">Manage your quotation terms, refund and termination policies</p>
        </div>
        {tab !== "trash" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTerms(null)}>
                <FiPlus className="mr-2 h-4 w-4" />
                Add New Terms
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTerms ? "Edit Terms" : "Add New Terms Set"}
                </DialogTitle>
                <DialogDescription>
                  Define your terms, payment conditions, refund and termination policies.
                </DialogDescription>
              </DialogHeader>
              <QuotationTermsForm
                mode={editingTerms ? "edit" : "create"}
                initialData={editingTerms || undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleDialogClose}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/settings?section=tos&tab=all&page=1">
              Active Terms
            </Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/settings?section=tos&tab=trash&page=1">
              Trash
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <QuotationTermsListClient
            initialTerms={terms}
            initialPagination={pagination}
            initialSearch={search}
            isTrash={false}
            onRefresh={handleRefresh}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <QuotationTermsListClient
            initialTerms={terms}
            initialPagination={pagination}
            initialSearch={search}
            isTrash={true}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
