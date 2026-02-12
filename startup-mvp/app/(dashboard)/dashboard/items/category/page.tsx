import React from "react";
import { getCategories } from "./_actions/category.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import CategoriesListClient from "./_components/categories";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface CategoriesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side for better performance
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getCategories(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "items.category", "view") : false,
    userId ? hasPermission(userId, "items.category", "edit") : false,
    userId ? hasPermission(userId, "items.category", "move-to-trash") : false,
    userId ? hasPermission(userId, "items.category", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Categories</h1>
            <p className="text-sm text-muted-foreground">Manage service categories in your system</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage service categories in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/dashboard/items/category/add">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Service Category
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/items/category?tab=all&page=1">All Categories</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/items/category?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <CategoriesListClient
            initialCategories={result.categories || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <CategoriesListClient
            initialCategories={result.categories || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={true}
            userId={userId || undefined}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

