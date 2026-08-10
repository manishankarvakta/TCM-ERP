import React from "react";
import { getFloors } from "./_actions/floor.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import FloorsList from "./_components/floors-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import FloorForm from "./_components/floor-form";

interface FloorsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    action?: string;
    id?: string;
  }>;
}

export default async function FloorsPage({ searchParams }: FloorsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const action = params.action || "";
  const id = params.id || "";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canMoveToTrash] = await Promise.all([
    getFloors(page, 10, search, tab === "trash" ? "trash" : "all"),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Floors</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load floors"}</p>
        </div>
      </div>
    );
  }

  // Show form if action is create or edit
  if (action === "create" && canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/employees/floors">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Floors
            </Link>
          </Button>
        </div>
        <FloorForm mode="create" />
      </div>
    );
  }

  if (action === "edit" && canEdit && id) {
    const floorToEdit = (result.floors as any[]).find(d => d.id === id);
    if (floorToEdit) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/employees/floors">
                <FiArrowLeft className="mr-2 h-4 w-4" />
                Back to Floors
              </Link>
            </Button>
          </div>
          <FloorForm mode="edit" initialData={floorToEdit} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/employees">
              <FiArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Floors</h1>
            <p className="text-sm text-muted-foreground">Manage dynamic floor locations for employee profiles</p>
          </div>
        </div>
        {tab !== "trash" && canEdit && (
          <Button asChild>
            <Link href="/dashboard/employees/floors?action=create">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Floor
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/employees/floors?tab=all&page=1">All Floors</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/employees/floors?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          <FloorsList
            initialFloors={(result.floors as any[]) || []}
            initialPagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }}
            initialSearch={search}
            isTrash={tab === "trash"}
            userId={userId}
            permissions={{
              view: canView,
              edit: canEdit,
              moveToTrash: canMoveToTrash,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
