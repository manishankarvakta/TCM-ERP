"use client";

import React from "react";
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
  Box
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No activity logs found</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
      
      <div className="space-y-6">
        {logs.map((log) => {
          const config = getActivityConfig(log.action);
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
          const activityText = parseActivityText(log.action, log.details);
          
          return (
            <div key={log.id} className="relative flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-background",
                config.color,
                config.bgColor
              )}>
                <Icon className="h-5 w-5 text-primary dark:text-black" />
              </div>
              
              {/* Content */}
              <div className="flex-1 space-y-1 pt-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">
                      <span 
                        className="text-foreground"
                        dangerouslySetInnerHTML={{ __html: activityText }}
                      />
                      <span className="text-muted-foreground ml-2">{timeAgo}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

