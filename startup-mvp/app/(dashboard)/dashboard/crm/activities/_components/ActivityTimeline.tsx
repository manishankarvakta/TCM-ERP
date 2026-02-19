import { format, parseISO, isValid } from "date-fns";
import { useState } from "react";
import { 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  Layers,
  Activity as ActivityIcon,
  Target,
  DollarSign,
  UserPlus,
  ArrowRightCircle,
  Briefcase,
  FileUp,
  StickyNote,
  Pencil,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string | null;
  createdAt: Date | string;
  dueDate?: Date | string | null;
  completed?: boolean;
  Owner?: {
     id: string;
     name: string | null;
     email: string | null;
     image: string | null;
  } | null;
  metadata?: {
    eventType?: string;
    taskId?: string;
    noteId?: string;
    eventId?: string;
    docId?: string;
    opportunityId?: string;
    leadId?: string;
    contactId?: string;
    changes?: Array<{ field: string; to: string | number | null }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

interface ActivityTimelineProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

const getActivityIcon = (type: string, metadata?: Activity['metadata']) => {
  const iconClass = "h-4 w-4";
  
  // Check for specific event types in metadata
  if (metadata?.eventType) {
    switch (metadata.eventType) {
      case "LEAD_CREATED": return <UserPlus className={iconClass} />;
      case "LEAD_CONVERTED": return <ArrowRightCircle className={iconClass} />;
      case "OPPORTUNITY_CREATED": return <Briefcase className={iconClass} />;
      case "DOC_CREATED": return <FileText className={iconClass} />;
      case "NOTE_CREATED": return <StickyNote className={iconClass} />;
      case "TASK_CREATED": return <CheckCircle2 className={iconClass} />;
      case "TASK_COMPLETED": return <CheckCircle className={iconClass} />;
      case "EVENT_SCHEDULED": return <Calendar className={iconClass} />;
    }
  }
  
  // Fallback to type-based icons
  switch (type.toLowerCase()) {
    case "call": return <Phone className={iconClass} />;
    case "email": return <Mail className={iconClass} />;
    case "meeting": return <Users className={iconClass} />;
    case "task": return <CheckCircle2 className={iconClass} />;
    case "note": return <StickyNote className={iconClass} />;
    case "update": return <Pencil className={iconClass} />;
    case "created": return <Plus className={iconClass} />;
    case "file": return <FileUp className={iconClass} />;
    default: return <ActivityIcon className={iconClass} />;
  }
};

const getIconStyles = (type: string, metadata?: Activity['metadata']) => {
    // Specific event types
    if (metadata?.eventType) {
      switch (metadata.eventType) {
        case "LEAD_CREATED": return "text-emerald-600 border-emerald-200 bg-emerald-50";
        case "LEAD_CONVERTED": return "text-violet-600 border-violet-200 bg-violet-50";
        case "OPPORTUNITY_CREATED": return "text-blue-600 border-blue-200 bg-blue-50";
        case "DOC_CREATED": return "text-orange-600 border-orange-200 bg-orange-50";
        case "NOTE_CREATED": return "text-amber-600 border-amber-200 bg-amber-50";
        case "TASK_CREATED": return "text-green-600 border-green-200 bg-green-50";
        case "TASK_COMPLETED": return "text-teal-600 border-teal-200 bg-teal-50";
        case "EVENT_SCHEDULED": return "text-purple-600 border-purple-200 bg-purple-50";
      }
    }
    
    // Type-based styling
    switch (type.toLowerCase()) {
        case "call": return "text-blue-600 border-blue-200 bg-blue-50";
        case "email": return "text-indigo-600 border-indigo-200 bg-indigo-50";
        case "meeting": return "text-purple-600 border-purple-200 bg-purple-50";
        case "task": return "text-green-600 border-green-200 bg-green-50";
        case "note": return "text-amber-600 border-amber-200 bg-amber-50";
        case "update": return "text-blue-500 border-blue-100 bg-blue-50/50"; // Subtle for updates
        case "created": return "text-emerald-600 border-emerald-200 bg-emerald-50";
        default: return "text-slate-600 border-slate-200 bg-slate-50";
    }
};

const getFieldIcon = (fieldName: string) => {
    const name = fieldName.toLowerCase();
    const iconClass = "h-3.5 w-3.5 text-muted-foreground/50";
    if (name.includes("name") || name.includes("title")) return <Target className={iconClass} />;
    if (name.includes("amount") || name.includes("price") || name.includes("revenue") || name.includes("value")) return <DollarSign className={iconClass} />;
    if (name.includes("date") || name.includes("time") || name.includes("due")) return <Clock className={iconClass} />;
    if (name.includes("status") || name.includes("stage")) return <ActivityIcon className={iconClass} />;
    if (name.includes("priority")) return <AlertCircle className={iconClass} />;
    return <Layers className={iconClass} />;
};

const getTimelineIcon = (activity: Activity) => {
  const baseClass = "h-4 w-4";
  
  // Try to determine type from subjectType if available (though not in explicit interface)
  // or derived from type/metadata
  const typeLower = activity.type.toLowerCase();
  const metadataType = activity.metadata?.eventType?.toLowerCase() || "";
  const combinedType = `${typeLower} ${metadataType}`;

  if (combinedType.includes("doc")) return <FileText className={cn(baseClass, "text-orange-600")} />;
  if (combinedType.includes("note")) return <StickyNote className={cn(baseClass, "text-amber-600")} />;
  if (combinedType.includes("task")) return <CheckCircle2 className={cn(baseClass, "text-emerald-600")} />;
  if (combinedType.includes("event") || combinedType.includes("meeting")) return <Calendar className={cn(baseClass, "text-violet-600")} />;
  if (combinedType.includes("file")) return <Paperclip className={cn(baseClass, "text-blue-600")} />;
  if (combinedType.includes("system")) return <Settings className={cn(baseClass, "text-slate-600")} />;
  
  // Fallback: Neutral Dot
  return <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />;
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
    if (diffInHours < 24) return `about ${diffInHours}h ago`;
    
    return format(d, "MMM d, h:mm a");
};

// Utility to strip HTML for plain text preview
const stripHtml = (html: string | null | undefined) => {
    if (!html) return "";
    return html
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const ActivityItem = ({ 
    activity, 
    showHeader, 
    currentDate, 
    onClick 
}: { 
    activity: Activity; 
    showHeader: boolean; 
    currentDate: Date;
    onClick?: (activity: Activity) => void;
}) => {
    const isUpdate = activity.type.toLowerCase() === "update";
    const isNote = activity.metadata?.noteId || 
                   (activity.description && activity.description.trim().startsWith('<') && activity.description.trim().endsWith('>'));
    
    const typeLower = activity.type.toLowerCase();
    const metadataType = activity.metadata?.eventType?.toLowerCase() || "";
    const combinedType = `${typeLower} ${metadataType}`;
    const isEvent = combinedType.includes("event") || combinedType.includes("meeting");

    const hasMetadata = activity.metadata && Object.keys(activity.metadata).length > 0;
    const isClickable = onClick && (hasMetadata || !isUpdate);
    const [isExpanded, setIsExpanded] = useState(!isUpdate); // Updates collapsed by default, others expanded

    // Actor Avatar Logic
    const actorName = activity.Owner?.name || "System";
    const actorInitials = actorName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="relative group/timeline-item">
            {showHeader && (
                <div className="flex items-center gap-4 pt-8 pb-6 first:pt-2 pl-1">
                   <div className="flex items-center justify-center w-[32px]">
                        <div className="h-1.5 w-1.5 rounded-full bg-border" />
                   </div>
                   <span className="text-xs font-semibold text-muted-foreground/70 tracking-tight uppercase">
                    {format(currentDate, "MMMM d, yyyy")}
                   </span>
                   <div className="h-[1px] flex-1 bg-border/40" />
                </div>
            )}

            <div className="flex gap-4 pb-8 relative">
                {/* Vertical Line Connector (Background) */}
                <div className="absolute left-[15px] top-8 bottom-[-8px] w-[1px] bg-border/30 group-last/timeline-item:hidden" />

                {/* Left Column: Tool Icon */}
                <div className="relative z-10 w-[32px] shrink-0 flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-muted/30 border border-border flex items-center justify-center relative z-20 shadow-sm">
                        {getTimelineIcon(activity)}
                    </div>
                </div>

                {/* Right Column: Content */}
                <div className="flex-1 min-w-0 pl-2 pt-1">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h4 
                                    onClick={() => isClickable && onClick && onClick(activity)}
                                    className={cn(
                                        "text-[14px] font-semibold text-foreground tracking-tight",
                                        isClickable && "cursor-pointer hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4"
                                    )}
                                >
                                    {activity.subject}
                                </h4>
                                {(isUpdate || isNote) && (
                                    <button 
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="h-5 w-5 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                                    >
                                        {isExpanded ? 
                                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : 
                                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        }
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="text-xs text-muted-foreground/60 font-medium">
                                    {formatTimeAgo(activity.createdAt)}
                                </p>
                                <span className="text-[10px] text-muted-foreground/30">•</span>
                                <div className="flex items-center gap-1.5">
                                    <Avatar className="h-4 w-4 border border-border/50">
                                        <AvatarImage src={activity.Owner?.image || ""} />
                                        <AvatarFallback className="text-[8px] bg-primary/5 text-primary">
                                            {actorInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-foreground/80">{actorName}</span>
                                </div>

                                {isEvent && activity.dueDate && (
                                    <>
                                        <span className="text-[10px] text-muted-foreground/30">•</span>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-md">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {format(new Date(activity.dueDate), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description / Metadata Changes */}
                    {activity.description && (
                        <div className="mt-2">
                            {isExpanded ? (
                                <div className={cn(
                                    "grid transition-all duration-200 ease-in-out overflow-hidden shadow-none",
                                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                )}>
                                    <div className="min-h-0">
                                        <div className={cn(
                                            isUpdate ? 
                                                "bg-muted/10 rounded-lg border border-border/40 p-3.5 space-y-3" : 
                                                "text-[14px] text-foreground/70 leading-relaxed"
                                        )}>
                                            {/* Render structured changes from metadata if available */}
                                            {activity.metadata?.changes && Array.isArray(activity.metadata.changes) ? (
                                                <>
                                                    {activity.description !== "Updated record" && (
                                                        <p className="text-[13px] text-muted-foreground mb-2 font-medium">{activity.description}</p>
                                                    )}
                                                    <div className="space-y-2">
                                                        {activity.metadata.changes.map((change: { field: string; to: string | number | null }, i: number) => (
                                                            <div key={i} className="flex items-start gap-3 text-[13px]">
                                                                <div className="mt-0.5 bg-background p-1 rounded-md border shadow-sm">
                                                                    {getFieldIcon(change.field)}
                                                                </div>
                                                                <div className="flex-1 pt-0.5">
                                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                        <span className="font-medium text-foreground/80">{change.field}</span>
                                                                        <span className="text-muted-foreground/40 text-[10px]">CHANGED TO</span>
                                                                    </div>
                                                                    <div className="text-foreground font-medium mt-0.5">
                                                                        {change.to === null || change.to === "" ? (
                                                                            <span className="text-muted-foreground italic">Empty</span>
                                                                        ) : String(change.to)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                /* Fallback for legacy string descriptions or HTML notes */
                                                isNote ? (
                                                    <div 
                                                        className="text-[14px] leading-relaxed tiptap prose prose-sm dark:prose-invert max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: activity.description }}
                                                    />
                                                ) : (
                                                    activity.description.split('\n').filter(line => line.trim()).map((line, i) => {
                                                        const isArrowLine = line.includes('→') || line.includes('->');
                                                        if (isUpdate && isArrowLine) {
                                                            const parts = line.split(/[→]|(->)/).filter(p => p && p !== "->" && p !== "→");
                                                            const field = parts[0]?.trim();
                                                            const change = parts[parts.length - 1]?.trim();
                                                            
                                                            return (
                                                                <div key={i} className="flex items-start gap-3 text-[13px]">
                                                                    <div className="mt-0.5 bg-background p-1 rounded-md border shadow-sm">
                                                                        {getFieldIcon(field || "default")}
                                                                    </div>
                                                                    <div className="flex-1 pt-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-foreground/80">{field}</span>
                                                                            <span className="text-muted-foreground/40">→</span>
                                                                            <span className="text-foreground font-medium">
                                                                                {change || <span className="italic text-muted-foreground">Empty</span>}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return <p key={i} className="text-[14px] leading-relaxed">{line}</p>;
                                                    })
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Collapsed Preview for notes or long descriptions */
                                <div className="text-[13px] text-foreground/60 leading-relaxed line-clamp-2 italic cursor-pointer" onClick={() => setIsExpanded(true)}>
                                    {stripHtml(activity.description)}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!isExpanded && (isUpdate || isNote) && (
                         <div 
                            onClick={() => setIsExpanded(true)}
                            className="mt-1.5 flex items-center gap-1.5 text-xs text-primary/80 font-medium cursor-pointer hover:text-primary transition-colors w-fit select-none"
                        >
                            <span className="text-[10px]">▼</span> View details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ActivityTimeline({ activities, onActivityClick }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/5 mx-auto max-w-2xl">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
             <Layers className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground/80 mb-1">No timeline activity</h3>
        <p className="text-sm text-muted-foreground/60 max-w-[250px]">
            Actions, notes, and events will appear here as they happen.
        </p>
      </div>
    );
  }

  // Sort activities by creation date descending
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative pt-4 pb-12 px-2 max-w-3xl mx-auto">
      {/* Main Track Background - Dashed for subtle guidance */}
      <div className="absolute left-[34px] top-6 bottom-6 w-[1px] border-l border-dashed border-border/20 z-0" />

      <div className="space-y-0">
        {sortedActivities.map((activity, index) => {
          const currentDate = new Date(activity.createdAt);
          const prevDate = index > 0 ? new Date(sortedActivities[index - 1].createdAt) : null;
          
          const showHeader = !prevDate || 
            format(currentDate, "yyyy-MM-dd") !== format(prevDate, "yyyy-MM-dd");

          return (
            <ActivityItem 
                key={activity.id}
                activity={activity}
                showHeader={showHeader}
                currentDate={currentDate}
                onClick={onActivityClick}
            />
          );
        })}
      </div>
    </div>
  );
}
