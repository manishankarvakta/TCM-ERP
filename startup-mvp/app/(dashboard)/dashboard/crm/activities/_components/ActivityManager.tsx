"use client";

import { useState, useMemo, useEffect } from "react";
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
    MinusCircle,
    Download,
    Send,
    FileSpreadsheet,
    FileDown,
    Loader2,
    Check,
    X,
    MessageSquare,
    Eye,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
    submitDailyReport, 
    reviewDailyReport, 
    getSubmittedReportsList, 
    getUserActivitiesForDateRange 
} from "@/app/actions/crm/activity-report.action";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ActivityManagerProps {
    activities: any[];
    currentUser: any;
    activeUsers: any[];
}

export default function ActivityManager({ 
    activities: initialActivities,
    currentUser,
    activeUsers
}: ActivityManagerProps) {
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("all");
    const [customFromDate, setCustomFromDate] = useState<string>("");
    const [customToDate, setCustomToDate] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const isAdmin = currentUser.role?.toLowerCase() === "admin";

    // Daily Reports State
    const [reportsUser, setReportsUser] = useState<string>(currentUser.id);
    const [reportsRangeType, setReportsRangeType] = useState<string>("month");
    const [reportsFromDate, setReportsFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [reportsToDate, setReportsToDate] = useState<string>(() => {
        return new Date().toISOString().split("T")[0];
    });
    const [dailyData, setDailyData] = useState<Record<string, { activities: any[]; report: any | null }>>({});
    const [loadingReports, setLoadingReports] = useState<boolean>(false);

    const getReportsDateRange = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        let fromDate = new Date(today);
        let toDate = new Date(today);

        if (reportsRangeType === "today") {
            // fromDate and toDate are today
        } else if (reportsRangeType === "yesterday") {
            fromDate.setDate(fromDate.getDate() - 1);
            toDate.setDate(toDate.getDate() - 1);
        } else if (reportsRangeType === "week") {
            fromDate.setDate(fromDate.getDate() - 7);
        } else if (reportsRangeType === "month") {
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (reportsRangeType === "custom") {
            return {
                fromDateStr: reportsFromDate,
                toDateStr: reportsToDate
            };
        }

        return {
            fromDateStr: fromDate.toISOString().split("T")[0],
            toDateStr: toDate.toISOString().split("T")[0]
        };
    };
    
    // Submit modal
    const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
    const [submitDate, setSubmitDate] = useState("");
    const [submitComments, setSubmitComments] = useState("");
    const [submitLoading, setSubmitLoading] = useState(false);

    // Review modal
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [reviewReport, setReviewReport] = useState<any | null>(null);
    const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
    const [reviewFeedback, setReviewFeedback] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);

    // View Details modal for admin approval tab
    const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
    const [viewDetailsData, setViewDetailsData] = useState<{ userName: string; date: string; activities: any[] } | null>(null);
    const [loadingViewDetails, setLoadingViewDetails] = useState(false);

    // Pending Approvals state
    const [pendingReports, setPendingReports] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);

    // Expanded days mapping
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    const fetchReports = async () => {
        if (reportsRangeType === "custom" && (!reportsFromDate || !reportsToDate)) return;
        setLoadingReports(true);
        try {
            const { fromDateStr, toDateStr } = getReportsDateRange();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            const result = await getUserActivitiesForDateRange(reportsUser, fromDateStr, toDateStr, timezone);
            if (result.success) {
                setDailyData(result.dailyData || {});
            } else {
                toast.error(result.error || "Failed to load reports");
            }
        } catch (err) {
            toast.error("Error loading daily activities");
        } finally {
            setLoadingReports(false);
        }
    };

    const fetchPendingReports = async () => {
        setLoadingPending(true);
        try {
            const result = await getSubmittedReportsList();
            if (result.success) {
                setPendingReports(result.reports || []);
            } else {
                toast.error(result.error || "Failed to load pending approvals");
            }
        } catch (err) {
            toast.error("Error loading pending approvals");
        } finally {
            setLoadingPending(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [reportsUser, reportsRangeType, reportsFromDate, reportsToDate]);

    useEffect(() => {
        if (isAdmin) {
            fetchPendingReports();
        }
    }, [currentUser]);

    const handleSubmitReport = async () => {
        if (!submitDate) return;
        setSubmitLoading(true);
        try {
            const result = await submitDailyReport(submitDate, submitComments);
            if (result.success) {
                toast.success("Daily report submitted successfully");
                setSubmitDialogOpen(false);
                setSubmitComments("");
                fetchReports();
                if (isAdmin) fetchPendingReports();
            } else {
                toast.error(result.error || "Failed to submit report");
            }
        } catch (err) {
            toast.error("Error submitting report");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleReviewReport = async () => {
        if (!reviewReport) return;
        setReviewLoading(true);
        try {
            const result = await reviewDailyReport(reviewReport.id, reviewStatus, reviewFeedback);
            if (result.success) {
                toast.success(`Report has been ${reviewStatus.toLowerCase()}`);
                setReviewDialogOpen(false);
                setReviewFeedback("");
                setReviewReport(null);
                fetchReports();
                fetchPendingReports();
            } else {
                toast.error(result.error || "Failed to submit review");
            }
        } catch (err) {
            toast.error("Error submitting review");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleOpenSubmitDialog = (dateStr: string, existingComments?: string) => {
        setSubmitDate(dateStr);
        setSubmitComments(existingComments || "");
        setSubmitDialogOpen(true);
    };

    const handleOpenReviewDialog = (report: any, status: "APPROVED" | "REJECTED") => {
        setReviewReport(report);
        setReviewStatus(status);
        setReviewFeedback(report.feedback || "");
        setReviewDialogOpen(true);
    };

    const handleOpenViewDetails = async (userId: string, userName: string, dateStr: string) => {
        setLoadingViewDetails(true);
        setViewDetailsOpen(true);
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const result = await getUserActivitiesForDateRange(userId, dateStr, dateStr, timezone);
            if (result.success && result.dailyData && result.dailyData[dateStr]) {
                setViewDetailsData({
                    userName,
                    date: dateStr,
                    activities: result.dailyData[dateStr].activities || [],
                });
            } else {
                toast.error("Failed to load activities detail");
                setViewDetailsOpen(false);
            }
        } catch (err) {
            toast.error("Error loading activities");
            setViewDetailsOpen(false);
        } finally {
            setLoadingViewDetails(false);
        }
    };

    // PDF Downloader for a single day
    const downloadPDF = (dateStr: string, userName: string, data: any) => {
        try {
            const doc = new jsPDF();
            
            // Premium Header design
            doc.setFillColor(30, 41, 59); // Slate-800
            doc.rect(0, 0, 210, 40, "F");
            
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.text("CRM DAILY ACTIVITY REPORT", 14, 25);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated: ${format(new Date(), "PPpp")}`, 140, 25);
            
            // Section Header
            doc.setTextColor(51, 65, 85); // Slate-700
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("REPORT METADATA", 14, 50);
            
            // Metadata Grid
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.text(`Employee: ${userName}`, 14, 58);
            doc.text(`Report Date: ${dateStr}`, 14, 64);
            
            const statusStr = data.report ? data.report.status : "NOT SUBMITTED";
            doc.text(`Status: ${statusStr}`, 140, 58);
            if (data.report && data.report.submittedAt) {
                doc.text(`Submitted At: ${format(new Date(data.report.submittedAt), "PPpp")}`, 140, 64);
            }

            let startY = 75;
            if (data.report && data.report.comments) {
                doc.setFont("helvetica", "bold");
                doc.text("Employee Comments:", 14, startY);
                doc.setFont("helvetica", "normal");
                const splitComments = doc.splitTextToSize(data.report.comments, 180);
                doc.text(splitComments, 14, startY + 5);
                startY += 5 + (splitComments.length * 5);
            }

            if (data.report && data.report.feedback) {
                doc.setFont("helvetica", "bold");
                doc.text("Admin Feedback:", 14, startY);
                doc.setFont("helvetica", "normal");
                const splitFeedback = doc.splitTextToSize(data.report.feedback, 180);
                doc.text(splitFeedback, 14, startY + 5);
                startY += 5 + (splitFeedback.length * 5);
            }
            
            // Table content preparation
            const tableHeaders = [["Time", "Type", "Subject", "Context Details", "Priority", "Status"]];
            const tableBody = data.activities.map((act: any) => [
                format(new Date(act.createdAt), "hh:mm a"),
                act.type.toUpperCase(),
                act.subject,
                act.contextType ? `${act.contextType.toUpperCase()}` : "GENERAL",
                act.priority || "NORMAL",
                act.completed ? "COMPLETED" : act.status || "TODO"
            ]);
            
            (doc as any).autoTable({
                startY: startY + 5,
                head: tableHeaders,
                body: tableBody,
                theme: "striped",
                headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
                styles: { fontSize: 8.5, cellPadding: 3 },
                columnStyles: {
                    2: { cellWidth: 55 },
                    3: { cellWidth: 35 }
                }
            });
            
            doc.save(`Activity_Report_${userName.replace(/\s+/g, "_")}_${dateStr}.pdf`);
            toast.success("PDF downloaded successfully");
        } catch (err) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF");
        }
    };

    // CSV Downloader for the month
    const downloadCSV = (userName: string, dateRangeStr: string, data: Record<string, { activities: any[], report: any }>) => {
        try {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Date,Time,Type,Subject,Description,Context,Priority,Status,Report Status,Comments,Feedback\n";
            
            Object.entries(data).forEach(([dateStr, dayData]) => {
                const reportStatus = dayData.report ? dayData.report.status : "NOT SUBMITTED";
                const comments = dayData.report?.comments ? `"${dayData.report.comments.replace(/"/g, '""')}"` : "";
                const feedback = dayData.report?.feedback ? `"${dayData.report.feedback.replace(/"/g, '""')}"` : "";
                
                if (dayData.activities.length === 0) {
                    csvContent += `${dateStr},,,No activities logged,,,${reportStatus},${comments},${feedback}\n`;
                } else {
                    dayData.activities.forEach((act) => {
                        const time = format(new Date(act.createdAt), "hh:mm a");
                        const desc = act.description ? `"${act.description.replace(/"/g, '""')}"` : "";
                        const subject = `"${act.subject.replace(/"/g, '""')}"`;
                        const context = act.contextType ? act.contextType : "general";
                        const priority = act.priority || "NORMAL";
                        const status = act.completed ? "COMPLETED" : act.status || "TODO";
                        
                        csvContent += `${dateStr},${time},${act.type},${subject},${desc},${context},${priority},${status},${reportStatus},${comments},${feedback}\n`;
                    });
                }
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Activity_Report_${userName.replace(/\s+/g, "_")}_${dateRangeStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV downloaded successfully");
        } catch (err) {
            console.error("CSV download failed:", err);
            toast.error("Failed to download CSV");
        }
    };

    // Toggle day expanded view
    const toggleExpandDay = (dateStr: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [dateStr]: !prev[dateStr]
        }));
    };

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

    // Extract unique users dynamically for the search view
    const uniqueUsers = useMemo(() => {
        const usersMap = new Map<string, { id: string; name: string }>();
        initialActivities.forEach(a => {
            if (a.owner && a.owner.id && a.owner.name) {
                usersMap.set(a.owner.id, { id: a.owner.id, name: a.owner.name });
            }
        });
        return Array.from(usersMap.values());
    }, [initialActivities]);

    // Apply filters for the activity log tab
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
                    const [yr, mo, dy] = customFromDate.split("-").map(Number);
                    const fromDateObj = new Date(yr, mo - 1, dy);
                    fromDateObj.setHours(0,0,0,0);
                    matchesDate = matchesDate && createdDate >= fromDateObj;
                }
                if (customToDate) {
                    const [yr, mo, dy] = customToDate.split("-").map(Number);
                    const toDateObj = new Date(yr, mo - 1, dy);
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

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case "APPROVED":
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold">Approved</Badge>;
            case "REJECTED":
                return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-rose-500/20 text-[10px] font-bold">Rejected</Badge>;
            case "SUBMITTED":
                return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20 text-[10px] font-bold">Submitted</Badge>;
            default:
                return <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-slate-500/20 text-[10px] font-bold">Not Submitted</Badge>;
        }
    };

    const getReportUserName = () => {
        if (reportsUser === currentUser.id) return currentUser.name || "Me";
        const u = activeUsers.find(user => user.id === reportsUser);
        return u ? u.name : "User";
    };

    return (
        <div className="w-full">
            <Tabs defaultValue="log" className="w-full space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                    <TabsList className="bg-muted/80 p-1 rounded-lg">
                        <TabsTrigger value="log" className="text-xs font-semibold px-4 py-2">
                            <Clock className="mr-2 h-4 w-4" /> Activity Log
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="text-xs font-semibold px-4 py-2">
                            <FileText className="mr-2 h-4 w-4" /> Daily Reports
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="approvals" className="text-xs font-semibold px-4 py-2" onClick={fetchPendingReports}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Pending Approvals
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                {/* TAB 1: ACTIVITY LOG */}
                <TabsContent value="log" className="space-y-6 mt-0">
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
                </TabsContent>

                {/* TAB 2: DAILY REPORTS */}
                <TabsContent value="reports" className="space-y-6 mt-0">
                    <Card className="border border-border/50">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-bold">Daily Activity Reports</CardTitle>
                                    <CardDescription className="text-xs">Compile, download, and submit daily workspace operations logs.</CardDescription>
                                </div>
                                <div className="flex flex-wrap items-end gap-3">
                                    {/* Admin User Selector */}
                                    {isAdmin && (
                                        <div className="w-[180px] space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">User</span>
                                            <Select value={reportsUser} onValueChange={setReportsUser}>
                                                <SelectTrigger className="bg-background h-9 text-xs">
                                                    <SelectValue placeholder="Select User" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeUsers.map(user => (
                                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Range Type Selector */}
                                    <div className="w-[150px] space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Date Range</span>
                                        <Select value={reportsRangeType} onValueChange={setReportsRangeType}>
                                            <SelectTrigger className="bg-background h-9 text-xs">
                                                <SelectValue placeholder="Select Range" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="today">Today</SelectItem>
                                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                                <SelectItem value="week">Last 7 Days</SelectItem>
                                                <SelectItem value="month">Current Month</SelectItem>
                                                <SelectItem value="custom">Custom Range</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Custom Range Inputs */}
                                    {reportsRangeType === "custom" && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">From</span>
                                                <Input 
                                                    type="date" 
                                                    value={reportsFromDate} 
                                                    onChange={(e) => setReportsFromDate(e.target.value)} 
                                                    className="h-9 text-xs bg-background w-[140px]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">To</span>
                                                <Input 
                                                    type="date" 
                                                    value={reportsToDate} 
                                                    onChange={(e) => setReportsToDate(e.target.value)} 
                                                    className="h-9 text-xs bg-background w-[140px]"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Download CSV button */}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 text-xs font-semibold"
                                        onClick={() => {
                                            const range = getReportsDateRange();
                                            downloadCSV(getReportUserName(), `${range.fromDateStr}_to_${range.toDateStr}`, dailyData);
                                        }}
                                        disabled={loadingReports || Object.keys(dailyData).length === 0}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                                        CSV Export
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingReports ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                    <p className="text-xs text-muted-foreground">Compiling activity reports...</p>
                                </div>
                            ) : Object.keys(dailyData).length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                                    <h3 className="text-lg font-semibold text-muted-foreground">No reports generated</h3>
                                    <p className="text-sm text-muted-foreground">Please make sure user selection and date range are correct.</p>
                                </div>
                            ) : (
                                <div className="border rounded-xl overflow-hidden bg-background">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="w-[40px]"></TableHead>
                                                <TableHead className="font-semibold text-xs">Date</TableHead>
                                                <TableHead className="font-semibold text-xs text-center">Activities Logged</TableHead>
                                                <TableHead className="font-semibold text-xs text-center">Report Status</TableHead>
                                                <TableHead className="font-semibold text-xs">Submission Details</TableHead>
                                                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(dailyData)
                                                .sort((a, b) => b[0].localeCompare(a[0])) // Show latest days first
                                                .map(([dateStr, dayData]) => {
                                                    const isExpanded = !!expandedDays[dateStr];
                                                    const hasActivities = dayData.activities.length > 0;
                                                    const report = dayData.report;
                                                    const isSelf = reportsUser === currentUser.id;
                                                    
                                                    return (
                                                        <>
                                                            <TableRow key={dateStr} className="hover:bg-muted/10 transition-colors border-b">
                                                                <TableCell>
                                                                    {hasActivities && (
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-6 w-6" 
                                                                            onClick={() => toggleExpandDay(dateStr)}
                                                                        >
                                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="font-bold text-xs">
                                                                    {format(new Date(dateStr + "T00:00:00.000Z"), "PPP")}
                                                                </TableCell>
                                                                <TableCell className="text-center font-bold text-xs">
                                                                    <Badge variant="secondary" className="px-2 py-0.5">
                                                                        {dayData.activities.length}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {getStatusBadge(report?.status)}
                                                                </TableCell>
                                                                <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                                                                    {report?.comments ? (
                                                                        <span className="italic">"{report.comments}"</span>
                                                                    ) : (
                                                                        <span className="opacity-40">-</span>
                                                                    )}
                                                                    {report?.feedback && (
                                                                        <div className="text-[10px] text-rose-500 font-semibold mt-1">
                                                                            Feedback: "{report.feedback}"
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {/* PDF Download */}
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-8 w-8 hover:text-indigo-600"
                                                                            onClick={() => downloadPDF(dateStr, getReportUserName(), dayData)}
                                                                            disabled={!hasActivities}
                                                                            title="Download PDF"
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                        </Button>

                                                                        {/* Submit Action */}
                                                                        {isSelf && (!report || report.status === "REJECTED") && (
                                                                            <Button 
                                                                                variant="outline" 
                                                                                size="sm" 
                                                                                className="h-8 text-[10px] font-bold bg-primary/5 hover:bg-primary/10 border-primary/20"
                                                                                onClick={() => handleOpenSubmitDialog(dateStr, report?.comments)}
                                                                                disabled={!hasActivities}
                                                                            >
                                                                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                                                                Submit
                                                                            </Button>
                                                                        )}

                                                                        {/* Admin Direct Action triggers */}
                                                                        {isAdmin && report && report.status === "SUBMITTED" && (
                                                                            <div className="flex gap-1">
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="outline"
                                                                                    className="h-8 text-[10px] font-bold border-emerald-500/20 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                                                    onClick={() => handleOpenReviewDialog(report, "APPROVED")}
                                                                                >
                                                                                    Approve
                                                                                </Button>
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="outline"
                                                                                    className="h-8 text-[10px] font-bold border-rose-500/20 text-rose-600 bg-rose-50 hover:bg-rose-100"
                                                                                    onClick={() => handleOpenReviewDialog(report, "REJECTED")}
                                                                                >
                                                                                    Reject
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                            {/* Expanded Sub-Table */}
                                                            {isExpanded && hasActivities && (
                                                                <TableRow key={`${dateStr}-expanded`}>
                                                                    <TableCell colSpan={6} className="bg-muted/10 p-0 border-b">
                                                                        <div className="p-4 bg-muted/5 border-l-2 border-indigo-500 m-2 rounded-r-lg space-y-3">
                                                                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                                                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                                                                Detailed Workspace Activities for {dateStr}
                                                                            </h4>
                                                                            <Table className="border rounded-lg bg-background">
                                                                                <TableHeader className="bg-muted/40">
                                                                                    <TableRow>
                                                                                        <TableHead className="text-[10px] font-bold h-8">Time</TableHead>
                                                                                        <TableHead className="text-[10px] font-bold h-8">Type</TableHead>
                                                                                        <TableHead className="text-[10px] font-bold h-8">Subject</TableHead>
                                                                                        <TableHead className="text-[10px] font-bold h-8">Description</TableHead>
                                                                                        <TableHead className="text-[10px] font-bold h-8">Priority</TableHead>
                                                                                        <TableHead className="text-[10px] font-bold h-8 text-right">Status</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {dayData.activities.map((act) => (
                                                                                        <TableRow key={act.id} className="hover:bg-muted/5 h-10 border-b">
                                                                                            <TableCell className="text-xs font-semibold text-muted-foreground w-[100px]">
                                                                                                {format(new Date(act.createdAt), "hh:mm a")}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-xs w-[100px]">
                                                                                                <span className="flex items-center gap-1">
                                                                                                    {getTypeIcon(act.type)}
                                                                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{act.type}</span>
                                                                                                </span>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-xs font-bold text-slate-800">
                                                                                                {act.subject}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                                                                {act.description || "N/A"}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-xs">
                                                                                                {act.priority && (
                                                                                                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-muted px-1.5 py-0.5 rounded">
                                                                                                        {getPriorityIcon(act.priority)}
                                                                                                        {act.priority}
                                                                                                    </span>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-right">
                                                                                                {act.completed ? (
                                                                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-bold">COMPLETED</Badge>
                                                                                                ) : (
                                                                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase">{act.status || "TODO"}</Badge>
                                                                                                )}
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: PENDING APPROVALS */}
                {isAdmin && (
                    <TabsContent value="approvals" className="space-y-6 mt-0">
                        <Card className="border border-border/50">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold">Pending Daily Reports Approvals</CardTitle>
                                <CardDescription className="text-xs">Review submitted reports from employee logs and approve/reject with comments.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingPending ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                        <p className="text-xs text-muted-foreground">Loading submitted reports...</p>
                                    </div>
                                ) : pendingReports.length === 0 ? (
                                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4 opacity-40" />
                                        <h3 className="text-lg font-semibold text-muted-foreground">All caught up!</h3>
                                        <p className="text-sm text-muted-foreground">No reports awaiting approval at this time.</p>
                                    </div>
                                ) : (
                                    <div className="border rounded-xl overflow-hidden bg-background">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="font-semibold text-xs">Employee</TableHead>
                                                    <TableHead className="font-semibold text-xs">Report Date</TableHead>
                                                    <TableHead className="font-semibold text-xs">Submitted At</TableHead>
                                                    <TableHead className="font-semibold text-xs">Status</TableHead>
                                                    <TableHead className="font-semibold text-xs">Comments</TableHead>
                                                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingReports.map((report) => (
                                                    <TableRow key={report.id} className="hover:bg-muted/10 transition-colors border-b">
                                                        <TableCell className="font-bold text-xs text-slate-800">
                                                            {report.User?.name || "Unknown"}
                                                            <div className="text-[10px] text-muted-foreground font-normal">{report.User?.email}</div>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-xs">
                                                            {format(new Date(report.reportDate), "PPP")}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {format(new Date(report.submittedAt), "PPpp")}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(report.status)}
                                                        </TableCell>
                                                        <TableCell className="text-xs italic text-muted-foreground max-w-[200px] truncate">
                                                            {report.comments ? `"${report.comments}"` : "-"}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* View Activities Button */}
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-8 text-xs bg-muted/50 hover:bg-muted"
                                                                    onClick={() => handleOpenViewDetails(report.userId, report.User?.name || "Employee", report.reportDate.split("T")[0])}
                                                                >
                                                                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                                    View
                                                                </Button>
                                                                
                                                                {/* Approval Actions */}
                                                                {report.status === "SUBMITTED" && (
                                                                    <>
                                                                        <Button 
                                                                            size="sm" 
                                                                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                                            onClick={() => handleOpenReviewDialog(report, "APPROVED")}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="destructive"
                                                                            className="h-8 text-xs font-bold"
                                                                            onClick={() => handleOpenReviewDialog(report, "REJECTED")}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* MODAL 1: SUBMIT REPORT DIALOG */}
            <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold">Submit Daily Activity Report</h2>
                        <p className="text-xs text-muted-foreground">
                            Submit your log of activities for {submitDate}. This will freeze modifications unless rejected.
                        </p>
                    </div>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-700">Submission Date</span>
                            <Input value={submitDate} disabled className="bg-muted text-xs h-9" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-700">Comments</span>
                            <Textarea 
                                placeholder="Add comments describing your day..." 
                                value={submitComments}
                                onChange={(e) => setSubmitComments(e.target.value)}
                                className="min-h-[100px] text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSubmitDialogOpen(false)} disabled={submitLoading} className="text-xs">
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSubmitReport} disabled={submitLoading} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                            {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: REVIEW REPORT DIALOG */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold">
                            {reviewStatus === "APPROVED" ? "Approve" : "Request Changes on"} Daily Report
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Provide review feedback comments for {reviewReport?.User?.name || "Employee"}'s activities on {reviewReport?.reportDate?.split("T")[0]}.
                        </p>
                    </div>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-700">Employee Comments</span>
                            <div className="bg-muted/50 p-3 rounded-lg border text-xs italic text-muted-foreground min-h-[60px]">
                                {reviewReport?.comments ? `"${reviewReport.comments}"` : "No comments provided"}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-700">Feedback / Review Comments</span>
                            <Textarea 
                                placeholder="Add reviewer remarks or details on changes requested..." 
                                value={reviewFeedback}
                                onChange={(e) => setReviewFeedback(e.target.value)}
                                className="min-h-[100px] text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setReviewDialogOpen(false)} disabled={reviewLoading} className="text-xs">
                            Cancel
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleReviewReport} 
                            disabled={reviewLoading} 
                            className={cn(
                                "text-xs text-white",
                                reviewStatus === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                            )}
                        >
                            {reviewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm {reviewStatus === "APPROVED" ? "Approval" : "Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: VIEW ACTIVITIES DETAILS MODAL (FOR ADMIN PENDING TAB) */}
            <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold flex items-center gap-1.5">
                            <Clock className="h-5 w-5 text-indigo-500" />
                            Activity Details: {viewDetailsData?.userName} on {viewDetailsData?.date}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Browse all workspace operations registered by the employee.
                        </p>
                    </div>
                    <div className="py-4">
                        {loadingViewDetails ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-xs text-muted-foreground">Loading details...</p>
                            </div>
                        ) : viewDetailsData?.activities.length === 0 ? (
                            <div className="text-center py-10 border rounded-xl bg-muted/10 text-muted-foreground text-xs font-semibold">
                                No activities recorded for this date.
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden bg-background">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="text-[10px] font-bold h-8">Time</TableHead>
                                            <TableHead className="text-[10px] font-bold h-8">Type</TableHead>
                                            <TableHead className="text-[10px] font-bold h-8">Subject</TableHead>
                                            <TableHead className="text-[10px] font-bold h-8">Context</TableHead>
                                            <TableHead className="text-[10px] font-bold h-8">Priority</TableHead>
                                            <TableHead className="text-[10px] font-bold h-8 text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewDetailsData?.activities.map((act) => (
                                            <TableRow key={act.id} className="hover:bg-muted/5 h-10 border-b">
                                                <TableCell className="text-xs font-semibold text-muted-foreground w-[100px]">
                                                    {format(new Date(act.createdAt), "hh:mm a")}
                                                </TableCell>
                                                <TableCell className="text-xs w-[100px]">
                                                    <span className="flex items-center gap-1">
                                                        {getTypeIcon(act.type)}
                                                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{act.type}</span>
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-800">
                                                    {act.subject}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {act.contextType ? act.contextType.toUpperCase() : "GENERAL"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {act.priority && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-muted px-1.5 py-0.5 rounded">
                                                            {getPriorityIcon(act.priority)}
                                                            {act.priority}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {act.completed ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-bold">COMPLETED</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase">{act.status || "TODO"}</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button size="sm" onClick={() => setViewDetailsOpen(false)} className="text-xs bg-slate-800 text-white hover:bg-slate-700">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
