import React from "react";
import { getHolidays } from "./_actions/holiday.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import HolidaysListClient from "./_components/holidays";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface HolidaysPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function HolidaysPage({ searchParams }: HolidaysPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";

  const session = await auth();
  const userId = session?.user?.id;

  // Check permissions on server side for better performance
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getHolidays(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "hr.holidays", "view") : false,
    userId ? hasPermission(userId, "hr.holidays", "edit") : false,
    userId ? hasPermission(userId, "hr.holidays", "move-to-trash") : false,
    userId ? hasPermission(userId, "hr.holidays", "delete-permanently") : false,
  ]);

  // Handle errors
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Holidays</h1>
            <p className="text-sm text-muted-foreground">Manage company holidays</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Failed to load holidays"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Holidays</h1>
          <p className="text-sm text-muted-foreground">Manage company holidays and off-days</p>
        </div>
        {tab !== "trash" && canEdit && (
          <Button asChild>
            <Link href="/dashboard/hr/holidays/add">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Holiday
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/hr/holidays?tab=all&page=1">All Holidays</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/hr/holidays?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <HolidaysListClient
            initialHolidays={result.holidays || []}
            initialPagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
            initialSearch={search}
            isTrash={false}
            userId={userId}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
              deletePermanently: canDeletePermanently,
            }}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <HolidaysListClient
            initialHolidays={result.holidays || []}
            initialPagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
            initialSearch={search}
            isTrash={true}
            userId={userId}
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
