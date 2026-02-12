import React from "react";
import { getItems, getActiveCategories } from "./_actions/item.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import ItemsListClient from "./_components/items";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface ItemsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    category?: string;
  }>;
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const category = params.category || "all";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "trash" ? "trash" : tab === "active" ? "active" : tab === "inactive" ? "inactive" : "all";
  
  // Check permissions on server side for better performance
  const [result, categoriesResult, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getItems(page, 10, search, status, category === "all" ? null : category),
    getActiveCategories(),
    userId ? hasPermission(userId, "items.items", "view") : false,
    userId ? hasPermission(userId, "items.items", "edit") : false,
    userId ? hasPermission(userId, "items.items", "move-to-trash") : false,
    userId ? hasPermission(userId, "items.items", "delete-permanently") : false,
  ]);

  const categories = categoriesResult.success ? categoriesResult.categories : [];

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Service Catalog</h1>
            <p className="text-sm text-muted-foreground">Manage services in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load items"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="items.items">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Service Catalog</h1>
            <p className="text-sm text-muted-foreground">Manage services in your system</p>
          </div>
          {tab !== "trash" && (
            <Button asChild>
              <Link href="/dashboard/items/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Service
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href={`/dashboard/items?tab=all&page=1${category !== "all" ? `&category=${category}` : ""}`}>All Services</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href={`/dashboard/items?tab=active&page=1${category !== "all" ? `&category=${category}` : ""}`}>Active</Link>
            </TabsTrigger>
            <TabsTrigger value="inactive" asChild>
              <Link href={`/dashboard/items?tab=inactive&page=1${category !== "all" ? `&category=${category}` : ""}`}>Inactive</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href={`/dashboard/items?tab=trash&page=1${category !== "all" ? `&category=${category}` : ""}`}>Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <ItemsListClient
              initialItems={result.items || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialCategory={category}
              categories={categories}
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
          <TabsContent value="active" className="mt-4">
            <ItemsListClient
              initialItems={result.items || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialCategory={category}
              categories={categories}
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
          <TabsContent value="inactive" className="mt-4">
            <ItemsListClient
              initialItems={result.items || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialCategory={category}
              categories={categories}
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
            <ItemsListClient
              initialItems={result.items || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialCategory={category}
              categories={categories}
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
    </PageGuard>
  );
}
