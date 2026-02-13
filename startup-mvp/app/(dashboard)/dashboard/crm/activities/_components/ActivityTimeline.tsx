import { format, parseISO, isValid } from "date-fns";
import { 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  CheckSquare, 
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Tag,
  Calendar,
  Layers,
  Activity as ActivityIcon,
  User,
  History,
  Link as LinkIcon,
  Target,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string | null;
  createdAt: Date | string;
  dueDate?: Date | string | null;
  completed?: boolean;
}

interface ActivityTimelineProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

const getActivityIcon = (type: string) => {
  const iconClass = "h-4 w-4"; // Increased size
  switch (type.toLowerCase()) {
    case "call": return <Phone className={iconClass} />;
    case "email": return <Mail className={iconClass} />;
    case "meeting": return <Users className={iconClass} />;
    case "task": return <CheckSquare className={iconClass} />;
    case "note": return <FileText className={iconClass} />;
    case "update": return <LinkIcon className={iconClass} />;
    case "created": return <Plus className={iconClass} />;
    default: return <ActivityIcon className={iconClass} />;
  }
};

const getIconStyles = (type: string) => {
    switch (type.toLowerCase()) {
        case "call": return "bg-blue-50 text-blue-600 border-blue-100";
        case "email": return "bg-indigo-50 text-indigo-600 border-indigo-100";
        case "meeting": return "bg-purple-50 text-purple-600 border-purple-100";
        case "task": return "bg-green-50 text-green-600 border-green-100";
        case "note": return "bg-amber-50 text-amber-600 border-amber-100";
        case "update": return "bg-slate-50 text-slate-600 border-slate-100";
        case "created": return "bg-emerald-50 text-emerald-600 border-emerald-100";
        default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
};

const getFieldIcon = (fieldName: string) => {
    const name = fieldName.toLowerCase();
    const iconClass = "h-3.5 w-3.5 text-muted-foreground/40";
    if (name.includes("name")) return <Target className={iconClass} />;
    if (name.includes("amount") || name.includes("price") || name.includes("revenue")) return <DollarSign className={iconClass} />;
    if (name.includes("date") || name.includes("time") || name.includes("due")) return <Calendar className={iconClass} />;
    return <Layers className={iconClass} />;
};

const formatTimeAgo = (date: Date | string) => {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "recently";
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 1) return "about an hour ago";
    if (diffInHours < 24) return `about ${diffInHours} hours ago`;
    
    return format(d, "MMM d");
};

export default function ActivityTimeline({ activities, onActivityClick }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/5 mx-4">
        <History className="h-8 w-8 text-muted-foreground/10 mb-3" />
        <p className="text-sm text-muted-foreground/60 font-medium">No activity recorded yet.</p>
      </div>
    );
  }

  // Sort activities by creation date descending
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative pt-2 pb-8 px-4">
      {/* Vertical Timeline Track - Ultra-thin per screenshot */}
      <div className="absolute left-[30px] top-6 bottom-4 w-[1px] bg-border/20" />

      <div className="space-y-0">
        {sortedActivities.map((activity, index) => {
          const currentDate = new Date(activity.createdAt);
          const prevDate = index > 0 ? new Date(sortedActivities[index - 1].createdAt) : null;
          
          const showHeader = !prevDate || 
            format(currentDate, "MMMM yyyy") !== format(prevDate, "MMMM yyyy");

          const isUpdate = activity.type.toLowerCase() === "update";
          const isClickable = !isUpdate && onActivityClick;

          return (
            <div key={activity.id} className="relative">
              {showHeader && (
                <div className="flex items-center gap-4 pt-10 pb-8 first:pt-0 pl-1">
                   <span className="text-[11px] font-medium text-muted-foreground/40 tracking-tight whitespace-nowrap">
                    {format(currentDate, "MMMM yyyy")}
                   </span>
                   <div className="h-[1px] flex-1 bg-border/10" />
                </div>
              )}

              <div className="flex gap-6 pb-12 group/item last:pb-8">
                {/* Icon Container - Round, Colored, Bigger per user request */}
                <div className="relative z-10 w-[32px] shrink-0 flex justify-center pt-0.5 ml-[-4px]">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-transform group-hover/item:scale-105",
                    getIconStyles(activity.type)
                  )}>
                    {getActivityIcon(activity.type)}
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                        <h4 
                          onClick={() => isClickable && onActivityClick(activity)}
                          className={cn(
                            "text-[14px] font-bold text-foreground/80 tracking-tight transition-colors",
                            isClickable && "cursor-pointer hover:text-primary hover:underline"
                          )}
                        >
                          {activity.subject}
                        </h4>
                        {isUpdate && (
                             <div className="h-5 w-5 rounded-md border border-border/40 flex items-center justify-center bg-muted/5 ml-0.5 cursor-pointer hover:bg-muted/10 transition-colors">
                                <ChevronUp className="h-3 w-3 text-muted-foreground/40" />
                             </div>
                        )}
                    </div>
                    <time className="text-[12px] text-muted-foreground/40 font-normal mt-0.5">
                        {formatTimeAgo(activity.createdAt)}
                    </time>
                  </div>

                  {activity.description && (
                    <div className={cn(
                      "mt-4",
                      isUpdate ? 
                        "bg-muted/5 rounded-[12px] border border-border/30 p-5 space-y-4" : 
                        "text-[14px] text-foreground/70 leading-relaxed font-normal"
                    )}>
                      {activity.description.split('\n').map((line, i) => {
                          const isArrowLine = line.includes('→') || line.includes('->');
                          if (isUpdate && isArrowLine) {
                              const parts = line.split(/[→]|(->)/);
                              const field = parts[0];
                              const change = parts[parts.length - 1];
                              
                              return (
                                <div key={i} className="flex items-center gap-3.5">
                                    <div className="w-4 flex justify-center">
                                        {getFieldIcon(field)}
                                    </div>
                                    <div className="flex items-center gap-2 text-[13px]">
                                        <span className="text-muted-foreground/50 font-normal">{field.trim()}</span>
                                        <span className="text-muted-foreground/20">→</span>
                                        <span className="text-foreground/80 font-medium tracking-tight">{change?.trim()}</span>
                                    </div>
                                </div>
                              );
                          }
                          return <p key={i} className="text-[14px]">{line}</p>;
                      })}
                    </div>
                  )}

                  {!activity.description && activity.subject.toLowerCase().includes("created") && (
                     <p className="text-[14px] text-foreground/50 mt-1.5 font-normal tracking-tight">
                         {activity.subject.replace("You created ", "").replace(" was created by You", "")} <span className="text-muted-foreground/40">was created by</span> <span className="text-foreground/70 font-medium">You</span>
                     </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Ending plus icon per screenshot */}
        <div className="relative mt-2">
             <div className="relative z-10 w-[32px] flex justify-center ml-[-4px]">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/20 bg-background text-muted-foreground/30 shadow-sm">
                    <Plus className="h-3 w-3" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
