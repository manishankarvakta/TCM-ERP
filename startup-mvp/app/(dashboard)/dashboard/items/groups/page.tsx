import { getGroups } from "./_actions/group.action";
import GroupsListClient from "./_components/groupsListClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import PageGuard from "@/components/permissions/page-guard";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface GroupsPageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    search?: string;
  }>;
}

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const params = await searchParams;
  const tab = params.tab || "all";
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  const session = await auth();
  const userId = session?.user?.id;

  const status = tab === "all" ? "all" : tab === "active" ? "active" : tab === "inactive" ? "inactive" : "trash";
  const isTrash = tab === "trash";

  // Check permissions on server side for better performance
  const [result, canView, canEdit, canMoveToTrash, canDeletePermanently] = await Promise.all([
    getGroups(page, 10, search, status),
    userId ? hasPermission(userId, "items.groups", "view") : false,
    userId ? hasPermission(userId, "items.groups", "edit") : false,
    userId ? hasPermission(userId, "items.groups", "move-to-trash") : false,
    userId ? hasPermission(userId, "items.groups", "delete-permanently") : false,
  ]);

  return (
    <PageGuard permissionKey="items.groups">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Groups</h1>
            <p className="text-sm text-muted-foreground">Manage group templates for quotations</p>
          </div>
          {!isTrash && (
            <Button asChild>
              <Link href="/dashboard/items/groups/add">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Group
              </Link>
            </Button>
          )}
        </div>

        <Tabs defaultValue={tab} className="w-full">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/dashboard/items/groups?tab=all&page=1">All</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href="/dashboard/items/groups?tab=active&page=1">Active</Link>
            </TabsTrigger>
            <TabsTrigger value="inactive" asChild>
              <Link href="/dashboard/items/groups?tab=inactive&page=1">Inactive</Link>
            </TabsTrigger>
            <TabsTrigger value="trash" asChild>
              <Link href="/dashboard/items/groups?tab=trash&page=1">Trash</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <GroupsListClient
              initialGroups={result.groups || []}
              initialPagination={result.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              }}
              initialSearch={search}
              isTrash={isTrash}
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

