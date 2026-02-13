"use client";

import { useState } from "react";
import { 
    CheckSquare, 
    FileText, 
    Clock, 
    Filter, 
    Search, 
    MoreHorizontal,
    ChevronRight,
    User,
    Calendar as CalendarIcon,
    AlertCircle,
    CheckCircle2,
    Circle,
    ArrowUpCircle,
    ArrowDownCircle,
    MinusCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActivityManagerProps {
    activities: any[];
}

export default function ActivityManager({ activities: initialActivities }: ActivityManagerProps) {
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    const activities = initialActivities.filter(a => {
        const matchesType = filter === "all" || a.type === filter;
        const matchesSearch = a.subject.toLowerCase().includes(search.toLowerCase()) || 
                             a.description?.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case "URGENT": return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
            case "HIGH": return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
            case "NORMAL": return <MinusCircle className="h-4 w-4 text-blue-500" />;
            case "LOW": return <ArrowDownCircle className="h-4 w-4 text-slate-400" />;
            default: return null;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "task": return <CheckSquare className="h-4 w-4 text-blue-500" />;
            case "note": return <FileText className="h-4 w-4 text-amber-500" />;
            case "call": return <Phone className="h-4 w-4 text-emerald-500" />;
            case "meeting": return <CalendarIcon className="h-4 w-4 text-purple-500" />;
            default: return <Clock className="h-4 w-4 text-slate-500" />;
        }
    };

    const getLink = (activity: any) => {
        if (activity.leadId) return `/dashboard/crm/leads/${activity.leadId}`;
        if (activity.opportunityId) return `/dashboard/crm/opportunities/${activity.opportunityId}`;
        if (activity.contactId) return `/dashboard/crm/contacts/${activity.contactId}`;
        return "#";
    };

    const getEntityName = (activity: any) => {
        if (activity.lead) return `Lead: ${activity.lead.name}`;
        if (activity.opportunity) return `Opp: ${activity.opportunity.title}`;
        if (activity.contact) return `Contact: ${activity.contact.firstName} ${activity.contact.lastName}`;
        return "General";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                    <Button 
                        variant={filter === "all" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setFilter("all")}
                        className="h-8 text-xs font-semibold"
                    >
                        All
                    </Button>
                    <Button 
                        variant={filter === "task" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setFilter("task")}
                        className="h-8 text-xs font-semibold"
                    >
                        <CheckSquare className="mr-2 h-3.5 w-3.5" />
                        Tasks
                    </Button>
                    <Button 
                        variant={filter === "note" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => setFilter("note")}
                        className="h-8 text-xs font-semibold"
                    >
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        Notes
                    </Button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search activities..." 
                        className="pl-9 bg-background"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {activities.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No activities found</h3>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <Card key={activity.id} className="group hover:shadow-md transition-all duration-200 border-border/50 overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex items-stretch">
                                    <div className={cn(
                                        "w-1.5",
                                        activity.type === "task" ? "bg-blue-500" :
                                        activity.type === "note" ? "bg-amber-500" :
                                        "bg-slate-400"
                                    )} />
                                    <div className="flex-1 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="mt-1 p-2 bg-muted rounded-lg shrink-0">
                                                    {getTypeIcon(activity.type)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-sm truncate">{activity.subject}</h3>
                                                        {activity.priority && (
                                                            <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                                {getPriorityIcon(activity.priority)}
                                                                <span>{activity.priority}</span>
                                                            </div>
                                                        )}
                                                        {activity.completed && (
                                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none h-5 text-[10px]">
                                                                Completed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                                        {activity.description || "No description provided"}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <CalendarIcon className="h-3 w-3" />
                                                            {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="h-3 w-3" />
                                                            {activity.owner?.name || "System"}
                                                        </div>
                                                        <Link 
                                                            href={getLink(activity)} 
                                                            className="flex items-center gap-1.5 hover:text-primary transition-colors bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10"
                                                        >
                                                            <AlertCircle className="h-3 w-3" />
                                                            {getEntityName(activity)}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                                    <Link href={getLink(activity)}>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

const Phone = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);
