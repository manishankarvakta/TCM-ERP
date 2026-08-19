"use client";

import React, { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  FilePlus, 
  FileText, 
  MessageSquare, 
  AtSign, 
  GitPullRequest, 
  Tag, 
  XCircle,
  UserPlus,
  UserMinus,
  UserCheck,
  Lock,
  Unlock,
  Mail,
  Shield,
  AlertTriangle,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Eye,
  Circle,
  Box,
  Clock,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityLogEntry {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  performedBy?: string | null;
}

interface ActivityLogProps {
  logs: ActivityLogEntry[];
}

// Map actions to icons and colors
const getActivityConfig = (action: string) => {
  const actionUpper = action.toUpperCase();
  
  // File operations
  if (actionUpper.includes("FILE") && actionUpper.includes("ADDED") || actionUpper.includes("FILE_UPLOADED")) {
    return {
      icon: FilePlus,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  
  if (actionUpper.includes("FILE") && (actionUpper.includes("DELETED") || actionUpper.includes("REMOVED"))) {
    return {
      icon: Trash2,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    };
  }
  
  // Document/Item operations
  if (actionUpper.includes("ITEM_CREATED") || actionUpper.includes("CREATED")) {
    return {
      icon: FileText,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  // Comments
  if (actionUpper.includes("COMMENT")) {
    return {
      icon: MessageSquare,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  // Mentions
  if (actionUpper.includes("MENTION")) {
    return {
      icon: AtSign,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  // Pull requests
  if (actionUpper.includes("PULL_REQUEST") || actionUpper.includes("PR")) {
    return {
      icon: GitPullRequest,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  // Tags
  if (actionUpper.includes("TAG") || actionUpper.includes("APPLIED")) {
    return {
      icon: Tag,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  
  // Closed/Deleted
  if (actionUpper.includes("CLOSED") || actionUpper.includes("DELETED")) {
    return {
      icon: XCircle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    };
  }
  
  // Project/Folder
  if (actionUpper.includes("PROJECT") || actionUpper.includes("FOLDER")) {
    return {
      icon: Box,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  // User operations
  if (actionUpper.includes("USER_CREATED")) {
    return {
      icon: UserPlus,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    };
  }
  
  if (actionUpper.includes("USER_DELETED")) {
    return {
      icon: UserMinus,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    };
  }
  
  if (actionUpper.includes("USER_UPDATED") || actionUpper.includes("PROFILE_UPDATED")) {
    return {
      icon: UserCheck,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  
  // Authentication
  if (actionUpper.includes("LOGIN")) {
    return {
      icon: LogIn,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    };
  }
  
  if (actionUpper.includes("LOGOUT")) {
    return {
      icon: LogOut,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  if (actionUpper.includes("REGISTER")) {
    return {
      icon: UserPlus,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    };
  }
  
  // Password operations
  if (actionUpper.includes("PASSWORD")) {
    return {
      icon: Lock,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  
  // Email operations
  if (actionUpper.includes("EMAIL")) {
    return {
      icon: Mail,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  
  // Security
  if (actionUpper.includes("SECURITY") || actionUpper.includes("SUSPICIOUS")) {
    return {
      icon: Shield,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
    };
  }
  
  if (actionUpper.includes("ALERT")) {
    return {
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    };
  }
  
  // Account operations
  if (actionUpper.includes("LOCKED")) {
    return {
      icon: Lock,
      color: "bg-red-500",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
    };
  }
  
  if (actionUpper.includes("UNLOCKED")) {
    return {
      icon: Unlock,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    };
  }
  
  // View operations
  if (actionUpper.includes("VIEWED") || actionUpper.includes("VIEW")) {
    return {
      icon: Eye,
      color: "bg-gray-500",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
    };
  }
  
  // Update/Edit operations
  if (actionUpper.includes("UPDATED") || actionUpper.includes("EDIT")) {
    return {
      icon: Edit,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    };
  }
  
  // Default
  return {
    icon: Circle,
    color: "bg-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50",
  };
};

// Parse activity text to extract meaningful information
const parseActivityText = (action: string, details: string | null) => {
  if (!details) {
    // Format action name nicely
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
  
  let text = details;

  // Replace CUIDs (25-char starting with 'c')
  text = text.replace(/\bc[a-z0-9]{24}\b/g, (cuid) => {
    return `#${cuid.slice(0, 8)}`;
  });
  
  // Replace UUIDs
  text = text.replace(/\b([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, (match, prefix) => {
    return `#${prefix}`;
  });
  
  // Remove metadata sections
  text = text.split(" | Metadata:")[0];
  text = text.split(" | Performed by:")[0];
  text = text.split(" | Changes:")[0];
  
  // Extract file names from backticks
  text = text.replace(/`([^`]+)`/g, (match, fileName) => {
    return `<span class="font-mono text-primary hover:underline cursor-pointer">${fileName}</span>`;
  });
  
  // Extract item IDs
  text = text.replace(/\(ID:\s*([a-zA-Z0-9]+)\)/gi, (match, id) => {
    return `(<span class="font-mono text-primary hover:underline cursor-pointer">${id}</span>)`;
  });
  
  // Extract email addresses
  text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, email) => {
    return `<span class="text-primary hover:underline cursor-pointer">${email}</span>`;
  });
  
  // Format common patterns
  text = text.replace(/User (created|updated|deleted)/gi, (match, verb) => {
    return `<span class="font-medium">User ${verb}</span>`;
  });
  
  text = text.replace(/(\w+) (created|updated|deleted|viewed):/gi, (match, item, verb) => {
    return `<span class="font-medium">${item} ${verb}:</span>`;
  });
  
  return text;
};

export default function ActivityLog({ logs }: ActivityLogProps) {
  const [actionGroup, setActionGroup] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [customFromDate, setCustomFromDate] = useState<string>("");
  const [customToDate, setCustomToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Stats calculations
  const stats = useMemo(() => {
    let logins = 0;
    let creations = 0;
    let updates = 0;
    
    logs.forEach((log) => {
      const actionUpper = log.action.toUpperCase();
      if (actionUpper.includes("LOGIN")) logins++;
      else if (actionUpper.includes("CREATED") || actionUpper.includes("ADDED")) creations++;
      else if (actionUpper.includes("UPDATED") || actionUpper.includes("EDIT") || actionUpper.includes("DELETED")) updates++;
    });
    
    return { logins, creations, updates, total: logs.length };
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Group filter
      const actionUpper = log.action.toUpperCase();
      let matchesGroup = true;
      if (actionGroup === "auth") {
        matchesGroup = actionUpper.includes("LOGIN") || actionUpper.includes("LOGOUT") || actionUpper.includes("REGISTER");
      } else if (actionGroup === "write") {
        matchesGroup = actionUpper.includes("CREATED") || actionUpper.includes("ADDED") || actionUpper.includes("UPDATED") || actionUpper.includes("EDIT") || actionUpper.includes("DELETED") || actionUpper.includes("REMOVED");
      } else if (actionGroup === "read") {
        matchesGroup = actionUpper.includes("VIEWED") || actionUpper.includes("VIEW");
      }
      
      // Date filter
      let matchesDate = true;
      const createdDate = new Date(log.createdAt);
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
      
      return matchesGroup && matchesDate;
    });
  }, [logs, actionGroup, dateRange, customFromDate, customToDate]);

  // Pagination calculations
  const totalFiltered = filteredLogs.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(
      (activePage - 1) * itemsPerPage,
      activePage * itemsPerPage
    );
  }, [filteredLogs, activePage, itemsPerPage]);

  const handleGroupChange = (val: string) => {
    setActionGroup(val);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (val: string) => {
    setDateRange(val);
    setCurrentPage(1);
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No activity logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mini Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-border/50 rounded-lg p-3 bg-background shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Actions</div>
          <div className="text-xl font-bold mt-0.5">{stats.total}</div>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-background shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-green-600">Creations</div>
          <div className="text-xl font-bold mt-0.5 text-green-600">{stats.creations}</div>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-background shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-blue-600">Updates/Edits</div>
          <div className="text-xl font-bold mt-0.5 text-blue-600">{stats.updates}</div>
        </div>
        <div className="border border-border/50 rounded-lg p-3 bg-background shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-purple-600">Session Logins</div>
          <div className="text-xl font-bold mt-0.5 text-purple-600">{stats.logins}</div>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
          {/* Action Group Filter */}
          <div className="flex-1 min-w-[150px] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Action Type</span>
            <Select value={actionGroup} onValueChange={handleGroupChange}>
              <SelectTrigger className="bg-background h-9 text-xs">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="write">Modifications (Writes)</SelectItem>
                <SelectItem value="read">Reads (Views)</SelectItem>
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

      {/* Log list or No Logs */}
      {paginatedLogs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
          <h3 className="font-semibold text-muted-foreground">No matches found</h3>
          <p className="text-xs text-muted-foreground">Adjust filters to display other logs.</p>
        </div>
      ) : (
        <div className="relative pt-2">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {paginatedLogs.map((log) => {
              const config = getActivityConfig(log.action);
              const Icon = config.icon;
              const timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
              const activityText = parseActivityText(log.action, log.details);
              
              return (
                <div key={log.id} className="relative flex items-start gap-4 group">
                  {/* Icon */}
                  <div className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-background shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-105",
                    config.bgColor
                  )}>
                    <Icon className={cn("h-5 w-5", config.textColor)} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 space-y-1 pt-1 bg-muted/5 p-3 rounded-lg border border-border/30 hover:border-border/80 transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          <span 
                            className="text-foreground"
                            dangerouslySetInnerHTML={{ __html: activityText }}
                          />
                          <span className="text-[11px] text-muted-foreground ml-3 whitespace-nowrap">{timeAgo}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                          Action: {log.action.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-6">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{(activePage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(activePage * itemsPerPage, totalFiltered)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{totalFiltered}</span> logs
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

