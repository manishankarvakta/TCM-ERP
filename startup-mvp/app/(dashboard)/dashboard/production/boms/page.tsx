import React from "react";
import { getBOMs, getActiveFinishedGoods } from "./_actions/bom.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import BOMsListClient from "./_components/boms";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface BOMsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    itemId?: string;
    tab?: string;
  }>;
}

export default async function BOMsPage({ searchParams }: BOMsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const status = params.status || "all";
  const itemId = params.itemId;
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side
  const [result, fgResult, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getBOMs(page, 10, {
      search,
      status: tab === "trash" ? "trash" : status === "all" ? undefined : status,
      itemId,
    }),
    getActiveFinishedGoods(),
    userId ? hasPermission(userId, "production.boms", "view") : false,
    userId ? hasPermission(userId, "production.boms", "edit") : false,
    userId ? hasPermission(userId, "production.boms", "move-to-trash") : false,
    userId ? hasPermission(userId, "production.boms", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <PageGuard permissionKey="production.boms" requiredOperation="view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Bill of Materials</h1>
              <p className="text-sm text-muted-foreground">Manage production recipes for finished goods</p>
            </div>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              {result.error || "Failed to load BOMs"}
            </p>
          </div>
        </div>
      </PageGuard>
    );
  }

  return (
    <PageGuard permissionKey="production.boms" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Bill of Materials</h1>
            <p className="text-sm text-muted-foreground">Manage production recipes for finished goods</p>
          </div>
          {tab !== "trash" && canEdit && (
            <Button asChild>
              <Link href="/dashboard/production/boms/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Create BOM
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/production/boms?tab=all&page=1">All BOMs</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/production/boms?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <BOMsListClient
              initialBOMs={result.boms || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialStatus={status}
              initialItemId={itemId}
              finishedGoods={fgResult.success ? fgResult.items || [] : []}
              isTrash={false}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <BOMsListClient
              initialBOMs={result.boms || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              initialStatus={status}
              initialItemId={itemId}
              finishedGoods={fgResult.success ? fgResult.items || [] : []}
              isTrash={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
