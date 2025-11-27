import React from "react";
import { getUserById, getUserLogs } from "@/app/actions/user.action";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiEdit, FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import ActivityLog from "@/components/users/ActivityLog";
import { Input } from "@/components/ui/input";
import { AtSign, Bold, Italic, Underline, MoreHorizontal } from "lucide-react";

interface UserDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailsPage({ params }: UserDetailsPageProps) {
  const { id } = await params;

  const userResult = await getUserById(id);
  const logsResult = await getUserLogs(id, { limit: 20 });

  if (!userResult.success || !userResult.user) {
    notFound();
  }

  const user = userResult.user;
  const logs = logsResult.success ? logsResult.logs || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/users">
              <FiArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{user.name || "User"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/users/edit-user?id=${user.id}`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      {/* User Info */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Name</div>
            <div className="font-medium">{user.name || "Not set"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Role</div>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Member Since</div>
            <div className="font-medium">
              {format(new Date(user.createdAt), "MMM d, yyyy")}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-semibold">{user._count.userLogs}</div>
          <div className="text-sm text-muted-foreground">Activity Logs</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-semibold">{user._count.sessions}</div>
          <div className="text-sm text-muted-foreground">Sessions</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-semibold">{user._count.accounts}</div>
          <div className="text-sm text-muted-foreground">Connected Accounts</div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="space-y-4">
        {/* Comment Input */}
        {/* <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Comment or type '/' for comments"
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <AtSign className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Underline className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div> */}

        {/* Activity Log Title */}
        <h2 className="text-lg font-semibold">Activity Log</h2>

        {/* Activity Timeline */}
        <div className="border rounded-lg p-6">
          <ActivityLog logs={logs} />
        </div>
      </div>
    </div>
  );
}
