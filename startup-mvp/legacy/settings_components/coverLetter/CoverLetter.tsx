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
import { getCoverLetters } from "../../_actions/coverLetter.action";
import CoverLettersListClient from "./list";
import CoverLetterForm from "./form";
import Link from "next/link";

export default function CoverLetter() {
  const searchParams = useSearchParams();
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoverLetter, setEditingCoverLetter] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const page = parseInt(searchParams.get("page") || "1");
  const tab = searchParams.get("tab") || "all";
  const searchQuery = searchParams.get("search") || "";

  const status = tab === "trash" ? "trash" : "all";

  useEffect(() => {
    const loadCoverLetters = async () => {
      setIsLoading(true);
      const result = await getCoverLetters(page, 10, searchQuery, status);
      if (result.success) {
        setCoverLetters(result.coverLetters || []);
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

    loadCoverLetters();
  }, [page, status, searchQuery, refreshKey]);

  useEffect(() => {
    const handleEdit = (event: CustomEvent) => {
      setEditingCoverLetter(event.detail);
      setIsDialogOpen(true);
    };

    window.addEventListener("editCoverLetter" as any, handleEdit as EventListener);
    return () => {
      window.removeEventListener("editCoverLetter" as any, handleEdit as EventListener);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCoverLetter(null);
  };

  const handleFormSuccess = () => {
    handleDialogClose();
    handleRefresh();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cover Letters</h1>
          <p className="text-sm text-muted-foreground">Manage cover letter templates</p>
        </div>
        {tab !== "trash" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCoverLetter(null)}>
                <FiPlus className="mr-2 h-4 w-4" />
                Add Cover Letter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCoverLetter ? "Edit Cover Letter" : "Add Cover Letter"}
                </DialogTitle>
                <DialogDescription>
                  {editingCoverLetter
                    ? "Update the cover letter details below."
                    : "Create a new cover letter template."}
                </DialogDescription>
              </DialogHeader>
              <CoverLetterForm
                mode={editingCoverLetter ? "edit" : "create"}
                initialData={editingCoverLetter || undefined}
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
            <Link href="/dashboard/settings?section=coverLetter&tab=all&page=1">
              All Cover Letters
            </Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/settings?section=coverLetter&tab=trash&page=1">
              Trash
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          {/* {isLoading ? (
            <div className="text-center py-8">Loading cover letters...</div>
          ) : (  */}
          <CoverLettersListClient
            initialCoverLetters={coverLetters}
            initialPagination={pagination}
            initialSearch={search}
            isTrash={false}
            onRefresh={handleRefresh}
          />
          {/* )} */}
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          {/* {isLoading ? (
            <div className="text-center py-8">Loading cover letters...</div>
          ) : (  */}
          <CoverLettersListClient
            initialCoverLetters={coverLetters}
            initialPagination={pagination}
            initialSearch={search}
            isTrash={true}
            onRefresh={handleRefresh}
          />
          {/* )} */}
        </TabsContent>
      </Tabs>
    </div>
  );
}

