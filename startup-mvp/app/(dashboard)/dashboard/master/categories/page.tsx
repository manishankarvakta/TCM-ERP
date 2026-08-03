import React from "react";
import { getCategories } from "./_actions/category.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import CategoriesListClient from "./_components/categories";
import ExportCategoriesButton from "./_components/ExportCategoriesButton";
import { auth } from "@/lib/auth";
import PrintHeader, { PrintStyle } from "../../procurements/_components/print-header";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface CategoriesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    limit?: string;
  }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side for better performance
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getCategories(page, limit, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "master.categories", "view") : false,
    userId ? hasPermission(userId, "master.categories", "edit") : false,
    userId ? hasPermission(userId, "master.categories", "move-to-trash") : false,
    userId ? hasPermission(userId, "master.categories", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <p className="text-sm text-muted-foreground">Manage categories in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load categories"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="master.categories" requiredOperation="view">
      <div className="space-y-6">
        <PrintStyle />
        <PrintHeader docTitle="Categories List" docNumber="CAT-LIST" hideBarcode={true} />
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <p className="text-sm text-muted-foreground">Manage categories in your system</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCategoriesButton search={search} tab={tab} />
            {tab !== "trash" && canEdit && (
              <Button asChild>
                <Link href="/dashboard/master/categories/add">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Category
                </Link>
              </Button>
            )}
          </div>
        </div>


        <Tabs defaultValue={tab} className="w-full">
          <TabsList className="print:hidden">
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/master/categories?tab=all&page=1">All Categories</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/master/categories?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <CategoriesListClient
              initialCategories={result.categories || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <CategoriesListClient
              initialCategories={result.categories || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
