"use client";

import React, { useState, useEffect } from "react";
import { markAsRead, markAsUnread, getCurrentUserNotifications } from "@/app/actions/notificationActions";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Star, Archive, CheckCircle2, Circle, Eye, Search, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "archive" | "favorite">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();

    // Poll for new notifications every 10 seconds
    const interval = setInterval(() => {
      loadNotifications(true); // silent refresh
    }, 10000); // Poll every 10 seconds

    // Load favorites and archived from localStorage
    const savedFavorites = localStorage.getItem("notificationFavorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    const savedArchived = localStorage.getItem("notificationArchived");
    if (savedArchived) {
      setArchived(new Set(JSON.parse(savedArchived)));
    }

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
        const newNotifications = Array.isArray(result.data) ? result.data : [];
        
        // Check if there are new unread notifications
        const previousUnreadCount = notifications.filter((n: Notification) => !n.isRead).length;
        const newUnreadCount = newNotifications.filter((n: Notification) => !n.isRead).length;
        
        // Update notifications
        setNotifications(newNotifications as any);
        
        // Show toast if new unread notifications arrived (only if not silent and count increased)
        if (!silent && newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
          const newCount = newUnreadCount - previousUnreadCount;
          toast({
            title: "New notification",
            description: `You have ${newCount} new notification${newCount > 1 ? "s" : ""}`,
          });
        }
      } else {
        if (!silent) {
          toast({
            title: "Error",
            description: result.error || "Failed to load notifications",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      }
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
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
          )
        );
        toast({
          title: "Success",
          description: "Notification marked as read",
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

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      const result = await markAsUnread(notificationId);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: false, readAt: null } : n
          )
        );
        toast({
          title: "Success",
          description: "Notification marked as unread",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark notification as unread",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking notification as unread:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as unread",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = (notificationId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(notificationId)) {
      newFavorites.delete(notificationId);
    } else {
      newFavorites.add(notificationId);
    }
    setFavorites(newFavorites);
    localStorage.setItem("notificationFavorites", JSON.stringify(Array.from(newFavorites)));
  };

  const toggleArchive = (notificationId: string) => {
    const newArchived = new Set(archived);
    if (newArchived.has(notificationId)) {
      newArchived.delete(notificationId);
    } else {
      newArchived.add(notificationId);
    }
    setArchived(newArchived);
    localStorage.setItem("notificationArchived", JSON.stringify(Array.from(newArchived)));
  };

  const handleViewNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setViewDialogOpen(true);
    // Mark as read when viewing if not already read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "SYSTEM":
        return "bg-gray-500";
      case "ADMIN":
        return "bg-blue-500";
      case "INFO":
        return "bg-blue-500";
      case "WARNING":
        return "bg-yellow-500";
      case "ERROR":
        return "bg-red-500";
      case "SUCCESS":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNotificationIcon = (type: string, isRead: boolean) => {
    const iconClass = cn("h-5 w-5", isRead ? "text-muted-foreground" : "");
    
    switch (type) {
      case "SYSTEM":
        return <Bell className={cn(iconClass, !isRead && "text-gray-600")} />;
      case "ADMIN":
        return <Bell className={cn(iconClass, !isRead && "text-blue-600")} />;
      case "INFO":
        return <Info className={cn(iconClass, !isRead && "text-blue-600")} />;
      case "WARNING":
        return <AlertTriangle className={cn(iconClass, !isRead && "text-yellow-600")} />;
      case "ERROR":
        return <XCircle className={cn(iconClass, !isRead && "text-red-600")} />;
      case "SUCCESS":
        return <CheckCircle className={cn(iconClass, !isRead && "text-green-600")} />;
      default:
        return <Bell className={iconClass} />;
    }
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

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Filter by tab
    if (filter === "favorite") {
      return favorites.has(notification.id) && !archived.has(notification.id);
    }
    if (filter === "archive") {
      return archived.has(notification.id);
    }
    // For "all", exclude archived items
    return !archived.has(notification.id);
  });

  const allCount = notifications.filter(n => !archived.has(n.id)).length;
  const favoriteCount = Array.from(favorites).filter(id => 
    notifications.some(n => n.id === id && !archived.has(n.id))
  ).length;
  const archiveCount = Array.from(archived).filter(id => 
    notifications.some(n => n.id === id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-6 w-6 text-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">List Notification</h1>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {allCount} Notification{allCount !== 1 ? "s" : ""}
            </p>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Name Product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "relative pb-3 px-1 text-sm font-medium transition-colors",
              filter === "all"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {filter === "all" && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {allCount}
                </Badge>
              )}
              <span>All</span>
            </div>
            {filter === "all" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-destructive" />
            )}
          </button>
          <button
            onClick={() => setFilter("archive")}
            className={cn(
              "relative pb-3 px-1 text-sm font-medium transition-colors",
              filter === "archive"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {filter === "archive" && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {archiveCount}
                </Badge>
              )}
              <span>Archive</span>
            </div>
            {filter === "archive" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-destructive" />
            )}
          </button>
          <button
            onClick={() => setFilter("favorite")}
            className={cn(
              "relative pb-3 px-1 text-sm font-medium transition-colors",
              filter === "favorite"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {filter === "favorite" && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {favoriteCount}
                </Badge>
              )}
              <span>Favorite</span>
            </div>
            {filter === "favorite" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-destructive" />
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-0">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              No notifications found
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const isFavorite = favorites.has(notification.id);
            const isArchived = archived.has(notification.id);
            
            return (
              <div
                key={notification.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0 group cursor-pointer"
                onClick={() => handleViewNotification(notification)}
              >
                {/* Left Indicators */}
                <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Read/Unread Status */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!notification.isRead) {
                        handleMarkAsRead(notification.id);
                      } else {
                        handleMarkAsUnread(notification.id);
                      }
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={notification.isRead ? "Mark as unread" : "Mark as read"}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      notification.isRead ? "bg-green-500" : "bg-gray-500"
                    )} />
                  </button>
                  
                  {/* Notification Type Icon */}
                  <div className="h-8 w-8 rounded flex items-center justify-center">
                    {getNotificationIcon(notification.type, notification.isRead)}
                  </div>
                </div>

                {/* Notification Content */}
                <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-foreground line-clamp-2">
                    {notification.message}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {formatNotificationDate(notification.createdAt)}
                </div>

                {/* Actions Icons */}
                <div className="flex-shrink-0 flex items-center gap-2 opacity-100  transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleViewNotification(notification)}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (notification.isRead) {
                        handleMarkAsUnread(notification.id);
                      } else {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title={notification.isRead ? "Mark as Unread" : "Mark as Read"}
                  >
                    {notification.isRead ? (
                      <Circle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleFavorite(notification.id)}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
                  </button>
                  <button
                    onClick={() => toggleArchive(notification.id)}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title={isArchived ? "Unarchive" : "Archive"}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Notification Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          {selectedNotification && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                    !selectedNotification.isRead && "bg-primary/10"
                  )}>
                    {getNotificationIcon(selectedNotification.type, selectedNotification.isRead)}
                  </div>
                  
                  {/* Title and Date */}
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl font-semibold mb-1">
                      {selectedNotification.title || "Notification"}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      {formatNotificationDate(selectedNotification.createdAt)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Message Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </CardContent>
                </Card>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-white",
                          getTypeColor(selectedNotification.type)
                        )}
                      >
                        {selectedNotification.type}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          selectedNotification.isRead ? "bg-green-500" : "bg-gray-500"
                        )} />
                        <p className="text-sm font-medium text-foreground">
                          {selectedNotification.isRead ? "Read" : "Unread"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
