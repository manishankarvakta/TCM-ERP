"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { 
  PhoneIcon, 
  MailIcon, 
  UsersIcon, 
  FileTextIcon, 
  CheckSquare, 
  CalendarIcon,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  type: string; // "call" | "meeting" | "email" | "note" | "task";
  subject: string;
  description?: string | null;
  createdAt: Date | string;
  dueDate?: Date | string | null;
  completed?: boolean;
  owner?: {
    name: string | null;
    email: string | null;
  } | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "call": return <PhoneIcon className="h-4 w-4" />;
    case "email": return <MailIcon className="h-4 w-4" />;
    case "meeting": return <UsersIcon className="h-4 w-4" />;
    case "task": return <CheckSquare className="h-4 w-4" />;
    default: return <FileTextIcon className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
    switch (type) {
      case "call": return "bg-blue-100 text-blue-600 border-blue-200";
      case "email": return "bg-indigo-100 text-indigo-600 border-indigo-200";
      case "meeting": return "bg-purple-100 text-purple-600 border-purple-200";
      case "task": return "bg-emerald-100 text-emerald-600 border-emerald-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No activities found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;
        const icon = getActivityIcon(activity.type);
        const colorClass = getActivityColor(activity.type);

        return (
          <div key={activity.id} className="relative flex gap-4">
             {/* Timeline Line */}
            {!isLast && (
              <span 
                className="absolute left-[19px] top-10 h-full w-px bg-border" 
                aria-hidden="true" 
              />
            )}

            {/* Icon Bubble */}
            <div className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm",
                "bg-background"
            )}>
               <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border", colorClass)}>
                    {icon}
               </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2 pb-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <span className="font-semibold">{activity.subject}</span>
                         {activity.completed && (
                            <Badge variant="secondary" className="gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> Done
                            </Badge>
                         )}
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.createdAt ? format(new Date(activity.createdAt), "MMM d, h:mm a") : "-"}
                    </time>
                </div>
                
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {activity.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                                {activity.owner?.name?.substring(0,2).toUpperCase() || "??"}
                            </AvatarFallback>
                        </Avatar>
                        <span>{activity.owner?.name || "Unknown"}</span>
                    </div>

                    {activity.dueDate && (
                         <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Due: {format(new Date(activity.dueDate), "MMM d")}</span>
                         </div>
                    )}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
