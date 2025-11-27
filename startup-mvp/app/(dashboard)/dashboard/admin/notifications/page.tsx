"use client";

import React, { useState, useEffect } from "react";
import { createNotification, deleteNotification, markAsRead, markAsUnread } from "@/app/actions/notificationActions";
import { getUsers } from "@/app/actions/user.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Trash2, Plus, Loader2, Search, Star, Archive, CheckCircle2, Circle, Eye, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { NotificationType } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  userId: string | null;
  isRead?: boolean;
  createdAt: Date;
}

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "archive" | "favorite">("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    type: NotificationType;
    target: "all" | "specific";
    userId: string[];
  }>({
    title: "",
    message: "",
    type: NotificationType.INFO,
    target: "all",
    userId: [],
  });
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
    loadUsers();
    loadNotifications();
    // Load favorites, archived, and read status from localStorage
    const savedFavorites = localStorage.getItem("notificationFavorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    const savedArchived = localStorage.getItem("notificationArchived");
    if (savedArchived) {
      setArchived(new Set(JSON.parse(savedArchived)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const session = await response.json();
        const userIsAdmin = session?.user?.role?.toLowerCase() === "admin";
        setIsAdmin(userIsAdmin);
        setCurrentUserId(session?.user?.id || null);
        if (!userIsAdmin) {
          toast({
            title: "Access Denied",
            description: "Only administrators can access this page",
            variant: "destructive",
          });
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        }
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
    }
  };

  const loadUsers = async () => {
    try {
      const result = await getUsers(1, 100, "");
      if (result.success && result.users) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data || []);
        }
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.target === "specific" && (!formData.userId || formData.userId.length === 0)) {
      toast({
        title: "Validation Error",
        description: "Please select at least one user",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        userId: formData.target === "specific" && formData.userId.length > 0 
          ? formData.userId.length === 1 
            ? formData.userId[0] 
            : formData.userId
          : null,
        createdBy: currentUserId,
      };

      const result = await createNotification(notificationData);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Notification created successfully",
        });
        setFormData({
          title: "",
          message: "",
          type: NotificationType.INFO,
          target: "all",
          userId: [],
        });
        setCreateDialogOpen(false);
        setTimeout(() => {
          loadNotifications();
        }, 500);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create notification",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;

    try {
      const result = await deleteNotification(notificationToDelete);
      if (result.success) {
        toast({
          title: "Success",
          description: "Notification deleted successfully",
        });
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notificationToDelete)
        );
        setDeleteDialogOpen(false);
        setNotificationToDelete(null);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markAsRead(notificationId);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      const result = await markAsUnread(notificationId);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: false } : n
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as unread:", error);
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

  const getUserName = (userId: string | null) => {
    if (!userId) return "All Users";
    const user = users.find((u) => u.id === userId);
    return user ? user.name || user.email : "Unknown User";
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
        notification.message.toLowerCase().includes(query) ||
        getUserName(notification.userId).toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Filter by tab
    if (filter === "favorite") {
      return favorites.has(notification.id);
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-medium">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-foreground" />
              <h1 className="text-3xl font-bold tracking-tight">List Notification</h1>
            </div>
            <Button  onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Notification
                </Button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {allCount} Notification{allCount !== 1 ? "s" : ""}
            </p>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Name Product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
            const isRead = notification.isRead ?? false;
            
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
                      if (isRead) {
                        handleMarkAsUnread(notification.id);
                      } else {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={isRead ? "Mark as unread" : "Mark as read"}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isRead ? "bg-green-500" : "bg-gray-500"
                    )} />
                  </button>
                  
                  {/* Notification Type Icon */}
                  <div className="h-8 w-8 rounded flex items-center justify-center">
                    {getNotificationIcon(notification.type, isRead)}
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
                <div className="flex-shrink-0 flex items-center gap-2 opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleViewNotification(notification)}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {/* <button
                    onClick={() => {
                      if (isRead) {
                        handleMarkAsUnread(notification.id);
                      } else {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                    className="p-2 hover:bg-muted rounded transition-colors"
                    title={isRead ? "Mark as Unread" : "Mark as Read"}
                  >
                    {isRead ? (
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
                  </button> */}
                  <button
                    onClick={() => {
                      setNotificationToDelete(notification.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="p-2 hover:bg-destructive/10 rounded transition-colors text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Notification Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Notification</DialogTitle>
            <DialogDescription>
              Create a new notification for users
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Notification title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Notification message"
                required
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as NotificationType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NotificationType.SYSTEM}>System</SelectItem>
                  <SelectItem value={NotificationType.ADMIN}>Admin</SelectItem>
                  <SelectItem value={NotificationType.INFO}>Info</SelectItem>
                  <SelectItem value={NotificationType.WARNING}>Warning</SelectItem>
                  <SelectItem value={NotificationType.ERROR}>Error</SelectItem>
                  <SelectItem value={NotificationType.SUCCESS}>Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target</Label>
              <RadioGroup
                value={formData.target}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    target: value as "all" | "specific",
                    userId: value === "all" ? [] : formData.userId,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All Users</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <Label htmlFor="specific">Specific Users</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.target === "specific" && (
              <div className="space-y-2">
                <Label>Select Users</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users available</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={formData.userId.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                userId: [...formData.userId, user.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                userId: formData.userId.filter((id) => id !== user.id),
                              });
                            }
                          }}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {user.name || user.email}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {formData.userId.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.userId.length} user(s) selected
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Notification
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                    {getNotificationIcon(selectedNotification.type, selectedNotification.isRead ?? false)}
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
                        Target
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-foreground">
                        {getUserName(selectedNotification.userId)}
                      </p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotificationToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
