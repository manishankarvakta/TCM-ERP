"use client";

import { useState, useMemo } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("all");
    const [customFromDate, setCustomFromDate] = useState<string>("");
    const [customToDate, setCustomToDate] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination page to 1 when filters change
    const handleFilterChange = (val: string) => {
        setFilter(val);
        setCurrentPage(1);
    };

    const handleUserChange = (val: string) => {
        setSelectedUser(val);
        setCurrentPage(1);
    };

    const handleDateRangeChange = (val: string) => {
        setDateRange(val);
        setCurrentPage(1);
    };

    // Extract unique users dynamically
    const uniqueUsers = useMemo(() => {
        const usersMap = new Map<string, { id: string; name: string }>();
        initialActivities.forEach(a => {
            if (a.owner && a.owner.id && a.owner.name) {
                usersMap.set(a.owner.id, { id: a.owner.id, name: a.owner.name });
            }
        });
        return Array.from(usersMap.values());
    }, [initialActivities]);

    // Apply filters
    const filteredActivities = useMemo(() => {
        return initialActivities.filter(a => {
            const matchesType = filter === "all" || a.type === filter;
            const matchesSearch = a.subject.toLowerCase().includes(search.toLowerCase()) || 
                                 a.description?.toLowerCase().includes(search.toLowerCase());
                                 
            // User filter
            const matchesUser = selectedUser === "all" || a.ownerId === selectedUser;
            
            // Date filter
            let matchesDate = true;
            const createdDate = new Date(a.createdAt);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            if (dateRange === "today") {
                matchesDate = createdDate >= today;
            } else if (dateRange === "yesterday") {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                matchesDate = createdDate >= yesterday && createdDate < today;
            } else if (dateRange === "week") {
                const lastWeek = new Date(today);
                lastWeek.setDate(lastWeek.getDate() - 7);
                matchesDate = createdDate >= lastWeek;
            } else if (dateRange === "month") {
                const lastMonth = new Date(today);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                matchesDate = createdDate >= lastMonth;
            } else if (dateRange === "custom") {
                if (customFromDate) {
                    const fromDateObj = new Date(customFromDate);
                    fromDateObj.setHours(0,0,0,0);
                    matchesDate = matchesDate && createdDate >= fromDateObj;
                }
                if (customToDate) {
                    const toDateObj = new Date(customToDate);
                    toDateObj.setHours(23,59,59,999);
                    matchesDate = matchesDate && createdDate <= toDateObj;
                }
            }
            
            return matchesType && matchesSearch && matchesUser && matchesDate;
        });
    }, [initialActivities, filter, search, selectedUser, dateRange, customFromDate, customToDate]);

    // Stats calculations (always base on all filtered activities)
    const totalActivities = filteredActivities.length;
    const taskActivities = filteredActivities.filter(a => a.type === "task");
    const completedTasks = taskActivities.filter(a => a.completed).length;
    const pendingTasks = taskActivities.length - completedTasks;
    const noteCount = filteredActivities.filter(a => a.type === "note").length;
    const meetingCallCount = filteredActivities.filter(a => a.type === "meeting" || a.type === "call").length;

    // Pagination calculations
    const totalPages = Math.ceil(totalActivities / itemsPerPage);
    const activePage = Math.min(currentPage, Math.max(1, totalPages));
    const paginatedActivities = useMemo(() => {
        return filteredActivities.slice(
            (activePage - 1) * itemsPerPage,
            activePage * itemsPerPage
        );
    }, [filteredActivities, activePage, itemsPerPage]);

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
        if (!activity.contextType || !activity.contextId) return "#";
        const type = activity.contextType.toLowerCase();
        if (type === "lead") return `/dashboard/crm/leads/${activity.contextId}`;
        if (type === "opportunity") return `/dashboard/crm/opportunities/${activity.contextId}`;
        if (type === "contact") return `/dashboard/crm/contacts/${activity.contextId}`;
        if (type === "project") return `/dashboard/projects/${activity.contextId}`;
        return "#";
    };

    const getEntityName = (activity: any) => {
        if (!activity.contextType) return "General";
        const type = activity.contextType.toLowerCase();
        const meta = activity.metadata || {};
        
        if (type === "lead") return `Lead: ${meta.leadName || meta.name || "Lead Details"}`;
        if (type === "opportunity") return `Opp: ${meta.opportunityTitle || meta.title || "Opportunity Details"}`;
        if (type === "contact") return `Contact: ${meta.contactName || (meta.firstName && `${meta.firstName} ${meta.lastName}`) || "Contact Details"}`;
        if (type === "project") return `Project: ${meta.projectName || meta.title || "Project Details"}`;
        
        return `${activity.contextType.charAt(0).toUpperCase() + activity.contextType.slice(1)}`;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-background shadow-sm border border-border/50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Actions</CardTitle>
                        <Clock className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalActivities}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Logged CRM operations</p>
                    </CardContent>
                </Card>
                <Card className="bg-background shadow-sm border border-border/50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Completion</CardTitle>
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedTasks} / {taskActivities.length}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">{pendingTasks} pending tasks remaining</p>
                    </CardContent>
                </Card>
                <Card className="bg-background shadow-sm border border-border/50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created Notes</CardTitle>
                        <FileText className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{noteCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Stored workspace annotations</p>
                    </CardContent>
                </Card>
                <Card className="bg-background shadow-sm border border-border/50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meetings & Calls</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{meetingCallCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Scheduled client interactions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                    <Button 
                        variant={filter === "all" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => handleFilterChange("all")}
                        className="h-8 text-xs font-semibold"
                    >
                        All
                    </Button>
                    <Button 
                        variant={filter === "task" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => handleFilterChange("task")}
                        className="h-8 text-xs font-semibold"
                    >
                        <CheckSquare className="mr-2 h-3.5 w-3.5" />
                        Tasks
                    </Button>
                    <Button 
                        variant={filter === "note" ? "secondary" : "ghost"} 
                        size="sm" 
                        onClick={() => handleFilterChange("note")}
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
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Date and User Filters Panel */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
                    {/* User Select */}
                    <div className="flex-1 min-w-[150px] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">User</span>
                        <Select value={selectedUser} onValueChange={handleUserChange}>
                            <SelectTrigger className="bg-background h-9 text-xs">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {uniqueUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Predefined range Select */}
                    <div className="flex-1 min-w-[150px] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Timeline</span>
                        <Select value={dateRange} onValueChange={handleDateRangeChange}>
                            <SelectTrigger className="bg-background h-9 text-xs">
                                <SelectValue placeholder="All Time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Custom Date Range Picker */}
                {dateRange === "custom" && (
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center animate-in fade-in slide-in-from-top-1">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">From</span>
                            <Input 
                                type="date" 
                                className="bg-background h-9 text-xs w-full sm:w-[150px]" 
                                value={customFromDate}
                                onChange={(e) => {
                                    setCustomFromDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">To</span>
                            <Input 
                                type="date" 
                                className="bg-background h-9 text-xs w-full sm:w-[150px]" 
                                value={customToDate}
                                onChange={(e) => {
                                    setCustomToDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {paginatedActivities.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No activities found</h3>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    paginatedActivities.map((activity) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-6">
                    <p className="text-xs text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{(activePage - 1) * itemsPerPage + 1}</span> to{" "}
                        <span className="font-semibold text-foreground">
                            {Math.min(activePage * itemsPerPage, totalActivities)}
                        </span>{" "}
                        of <span className="font-semibold text-foreground">{totalActivities}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={activePage === 1}
                            className="h-8 text-xs"
                        >
                            Previous
                        </Button>
                        <div className="text-xs font-semibold text-muted-foreground px-2">
                            Page {activePage} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={activePage === totalPages}
                            className="h-8 text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
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
