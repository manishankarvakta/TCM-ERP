import React from "react";
import { getLines } from "./_actions/line.action";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import LinesList from "./_components/lines-list";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import LineForm from "./_components/line-form";

interface LinesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
    action?: string;
    id?: string;
    floorId?: string;
  }>;
}

export default async function LinesPage({ searchParams }: LinesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const tab = params.tab || "all";
  const action = params.action || "";
  const id = params.id || "";
  const floorId = params.floorId || "";

  const session = await auth();
  const userId = session?.user?.id;

  const [result, canView, canEdit, canMoveToTrash] = await Promise.all([
    getLines(page, 10, search, tab === "trash" ? "trash" : "all", floorId),
    userId ? hasPermission(userId, "peoples.employees", "view") : false,
    userId ? hasPermission(userId, "peoples.employees", "edit") : false,
    userId ? hasPermission(userId, "peoples.employees", "move-to-trash") : false,
  ]);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Lines</h1>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{result.error || "Failed to load lines"}</p>
        </div>
      </div>
    );
  }

  if (action === "create" && canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/employees/lines">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Lines
            </Link>
          </Button>
        </div>
        <LineForm mode="create" />
      </div>
    );
  }

  if (action === "edit" && canEdit && id) {
    const lineToEdit = (result.lines as any[]).find(d => d.id === id);
    if (lineToEdit) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link href="/dashboard/employees/lines">
                <FiArrowLeft className="mr-2 h-4 w-4" />
                Back to Lines
              </Link>
            </Button>
          </div>
          <LineForm mode="edit" initialData={lineToEdit} />
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
            <h1 className="text-2xl font-semibold">Lines</h1>
            <p className="text-sm text-muted-foreground">Manage dynamic work lines for employee profiles</p>
          </div>
        </div>
        {tab !== "trash" && canEdit && (
          <Button asChild>
            <Link href="/dashboard/employees/lines?action=create">
              <FiPlus className="mr-2 h-4 w-4" />
              Add Line
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/dashboard/employees/lines?tab=all&page=1">All Lines</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/dashboard/employees/lines?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          <LinesList
            initialLines={(result.lines as any[]) || []}
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
