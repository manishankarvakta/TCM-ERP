"use client";

import React, { useState, useEffect } from "react";
import { Bell, Info, AlertTriangle, XCircle, CheckCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAsRead, getCurrentUserNotifications } from "@/app/actions/notificationActions";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
  creator?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    // Initial load
    loadNotifications();

    // Set up polling interval
    const interval = setInterval(() => {
      loadNotifications(true); // silent refresh
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotifications = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const result = await getCurrentUserNotifications();
      if (result.success) {
        const newNotifications = (result.data as Notification[]) || [];
        
        // Check if there are new unread notifications
        const previousUnreadCount = notifications.filter((n: Notification) => !n.isRead).length;
        const newUnreadCount = newNotifications.filter((n: Notification) => !n.isRead).length;
        
        // Update notifications
        setNotifications(newNotifications);
        
        // Show toast if new unread notifications arrived (only if not silent and count increased)
        if (!silent && newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
          const newCount = newUnreadCount - previousUnreadCount;
          toast({
            title: "New notification",
            description: `You have ${newCount} new notification${newCount > 1 ? "s" : ""}`,
          });
        }
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markAsRead(notificationId);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        toast({
          title: "Notification marked as read",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark notification as read",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string, isRead: boolean) => {
    const iconSize = "h-6 w-6";
    
    switch (type) {
      case "SYSTEM":
        return <Bell className={cn(iconSize, !isRead ? "text-yellow-500" : "text-muted-foreground")} />;
      case "ADMIN":
        return <Bell className={cn(iconSize, !isRead ? "text-primary" : "text-muted-foreground")} />;
      case "INFO":
        return <Info className={cn(iconSize, !isRead ? "text-primary" : "text-muted-foreground")} />;
      case "WARNING":
        return <AlertTriangle className={cn(iconSize, !isRead ? "text-yellow-500" : "text-muted-foreground")} />;
      case "ERROR":
        return <XCircle className={cn(iconSize, !isRead ? "text-red-500" : "text-muted-foreground")} />;
      case "SUCCESS":
        return <CheckCircle className={cn(iconSize, !isRead ? "text-green-500" : "text-muted-foreground")} />;
      default:
        return <Bell className={cn(iconSize, !isRead ? "text-primary" : "text-muted-foreground")} />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "SYSTEM":
        return "System notification:";
      case "ADMIN":
        return "Admin notification:";
      case "INFO":
        return "Notification:";
      case "WARNING":
        return "Warning:";
      case "ERROR":
        return "Error:";
      case "SUCCESS":
        return "Success:";
      default:
        return "Notification:";
    }
  };

  const getSourceName = (notification: Notification) => {
    if (notification.creator) {
      return notification.creator.name || notification.creator.email;
    }
    return "System";
  };

  const formatNotificationDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return "Just Now";
    } else if (diffInDays < 7) {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } else {
      return format(new Date(date), "dd MMM, yyyy");
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map((n) => markAsRead(n.id))
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const latestNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark as read</span>
              </button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : latestNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {latestNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0 cursor-pointer",
                    !notification.isRead && "bg-muted/30"
                  )}
                  onClick={() => {
                    if (!notification.isRead) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  {/* Left Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.isRead)}
                  </div>

                  {/* Notification Content - Four Lines */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {/* Line 1: Source/Account Name (light gray) */}
                    {/* <p className="text-xs text-muted-foreground">
                      {getSourceName(notification)}
                    </p> */}
                    
                    {/* Line 2: Type/Title (bold black) */}
                    <p className="text-sm font-semibold text-foreground">
                      {notification.title || getNotificationTypeLabel(notification.type)}
                    </p>
                    
                    {/* Line 3: Description (regular black) */}
                    <p className="text-sm text-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    
                    {/* Line 4: Timestamp (light gray) */}
                    <p className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t">
          <Link 
            href="/dashboard/notifications" 
            onClick={() => setOpen(false)}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

