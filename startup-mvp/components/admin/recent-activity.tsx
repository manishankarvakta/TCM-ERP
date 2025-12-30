"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Activity {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: User;
}

interface RecentActivityProps {
  activities: Activity[];
}

const getActionIcon = (action: string) => {
  if (action.includes("CREATED")) return "➕";
  if (action.includes("UPDATED")) return "✏️";
  if (action.includes("DELETED")) return "🗑️";
  return "📝";
};

const formatAction = (action: string) => {
  return action
    .replace("ITEM_", "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getActionColor = (action: string) => {
  if (action.includes("CREATED")) return "text-green-600 dark:text-green-400";
  if (action.includes("UPDATED")) return "text-blue-600 dark:text-blue-400";
  if (action.includes("DELETED")) return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <CardDescription className="text-sm">System activity and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        <CardDescription className="text-sm">System activity and user actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
              <div className="text-2xl">{getActionIcon(activity.action)}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {activity.user.name || activity.user.email}
                  </span>
                  <span className={`text-xs font-medium ${getActionColor(activity.action)}`}>
                    {formatAction(activity.action)}
                  </span>
                </div>
                {activity.details && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activity.details}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

