import React from "react";
import { getItems } from "./_actions/item.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import ItemsListClient from "./_components/items";
import ExportItemsButton from "./_components/ExportItemsButton";
import { auth } from "@/lib/auth";
import PrintHeader, { PrintStyle } from "../../procurements/_components/print-header";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";
import { ItemType } from "@prisma/client";

interface ItemsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    itemType?: string;
    limit?: string;
  }>;
};

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "20");
  const search = params.search || "";
  const tab = params.tab || "all";
  const itemType = params.itemType as ItemType | undefined;

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side for better performance
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getItems(page, limit, search, tab === "trash" ? "trash" : "all", itemType),
    userId ? hasPermission(userId, "master.items", "view") : false,
    userId ? hasPermission(userId, "master.items", "edit") : false,
    userId ? hasPermission(userId, "master.items", "move-to-trash") : false,
    userId ? hasPermission(userId, "master.items", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <PageGuard permissionKey="master.items">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Items</h1>
              <p className="text-sm text-muted-foreground">Manage items in your system</p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load items"}
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permissionKey="master.items">
      <div className="space-y-6">
        <PrintStyle />
        <PrintHeader docTitle="Items Catalog" docNumber="ITEMS-LIST" hideBarcode={true} />
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-semibold">Items</h1>
            <p className="text-sm text-muted-foreground">Manage items in your system</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportItemsButton search={search} tab={tab} itemType={itemType} />
            {tab !== "trash" && canEdit && (
              <Button asChild>
                <Link href="/dashboard/master/items/add">
                  <FiPlus className="mr-2 h-4 w-4" />
                  Add Item
                </Link>
              </Button>
            )}
          </div>
        </div>


        <Tabs defaultValue={tab} className="w-full">
          <TabsList className="print:hidden">
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/master/items?tab=all&page=1">All Items</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/master/items?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
          <ItemsListClient
            initialItems={(result.items as any) || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            initialItemType={itemType || "all"}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <ItemsListClient
            initialItems={(result.items as any) || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            initialItemType="all"
            isTrash={true}
          />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
