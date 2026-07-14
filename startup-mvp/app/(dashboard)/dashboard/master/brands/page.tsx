import React from "react";
import { getBrands } from "./_actions/brand.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import BrandsListClient from "./_components/brands";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageGuard from "@/components/permissions/page-guard";

interface BrandsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side for better performance
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getBrands(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "master.brands", "view") : false,
    userId ? hasPermission(userId, "master.brands", "edit") : false,
    userId ? hasPermission(userId, "master.brands", "move-to-trash") : false,
    userId ? hasPermission(userId, "master.brands", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Brands</h1>
            <p className="text-sm text-muted-foreground">Manage brands in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load brands"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageGuard permissionKey="master.brands" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Brands</h1>
            <p className="text-sm text-muted-foreground">Manage brands in your system</p>
          </div>
          {tab !== "trash" && canEdit && (
            <Button asChild>
              <Link href="/dashboard/master/brands/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Brand
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/master/brands?tab=all&page=1">All Brands</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/master/brands?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <BrandsListClient
              initialBrands={result.brands || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={false}
            />
          </TabsContent>
          <TabsContent value="trash" className="mt-4">
            <BrandsListClient
              initialBrands={result.brands || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
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
