import React from "react";
import { getUnits } from "../_actions/unit.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import UnitsListClient from "../_components/items";

interface UnitsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function UnitsPage({ searchParams }: UnitsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const status = tab === "trash" ? "trash" : "all";
  const result = await getUnits(page, 10, search, status);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Units</h1>
            <p className="text-sm text-muted-foreground">Manage units in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load units"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Units</h1>
          <p className="text-sm text-muted-foreground">Manage units in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/dashboard/items/units/add">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Unit
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/items/units?tab=all&page=1">All Units</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/items/units?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <UnitsListClient
            initialUnits={result.units || []}
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
          <UnitsListClient
            initialUnits={result.units || []}
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
  );
}
