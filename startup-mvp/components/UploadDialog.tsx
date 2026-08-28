"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, X, Check, Cloud, Image as ImageIcon, FileText, Video, Music, Search, File, Folder, Archive, Code, FileSpreadsheet, Presentation, Link as LinkIcon, Eye, CheckSquare } from "lucide-react";
import { uploadFileServerSide, getPublicUrl, listFolder } from "@/app/actions/files";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (fileUrl: string) => void;
  onSelectMultiple?: (fileUrls: string[]) => void;
  multiple?: boolean;
  allowedTypes?: string[]; // e.g., ["image/*", "video/*"]
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  uploadedBytes?: number;
  totalBytes?: number;
  url?: string; // Public URL after upload
}

interface FileItem {
  id: string;
  name: string;
  path: string;
  storageKey?: string;
  size: number;
  mimeType: string;
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export default function UploadDialog({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple = false,
  allowedTypes,
}: UploadDialogProps) {
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [selectedFileUrls, setSelectedFileUrls] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("upload");
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Browse Media state
  const [browseFiles, setBrowseFiles] = useState<FileItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "image" | "document" | "video" | "audio">("all");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"upload" | "browse" | null>(null);
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map());
  const [externalUrl, setExternalUrl] = useState("");
  const [visibleCount, setVisibleCount] = useState(16);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setVisibleCount(16);
  }, [searchQuery, categoryFilter]);

  const getFileIcon = (file: File) => {
    const mimeType = file.type;
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />;
    }
    if (mimeType.startsWith("video/")) {
      return <Video className="h-5 w-5 text-purple-600" aria-hidden="true" />;
    }
    if (mimeType.startsWith("audio/")) {
      return <Music className="h-5 w-5 text-green-600" aria-hidden="true" />;
    }
    return <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />;
  };

  const getBrowseFileIcon = (file: FileItem) => {
    if (file.isFolder) {
      return (
        <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shadow-xs">
          <Folder className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shadow-xs">
          <ImageIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("video/")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shadow-xs">
          <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center shadow-xs">
          <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("pdf")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center shadow-xs">
          <div className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</div>
        </div>
      );
    }
    if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.mimeType.includes("csv")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center shadow-xs">
          <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("presentation") || file.mimeType.includes("powerpoint")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shadow-xs">
          <Presentation className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
      );
    }
    if (file.mimeType.includes("zip") || file.mimeType.includes("rar") || file.mimeType.includes("tar") || file.mimeType.includes("gz")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center shadow-xs">
          <Archive className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    }
    if (file.mimeType.includes("javascript") || file.mimeType.includes("typescript") || file.mimeType.includes("json") || file.mimeType.includes("code") || file.name.endsWith(".tsx") || file.name.endsWith(".jsx") || file.name.endsWith(".ts") || file.name.endsWith(".js")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shadow-xs">
          <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.includes("word") || file.mimeType.includes("document") || file.mimeType.includes("docx") || file.mimeType.includes("doc")) {
      return (
        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shadow-xs">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    return (
      <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center shadow-xs">
        <File className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  const validateFileType = useCallback((file: File): boolean => {
    if (!allowedTypes || allowedTypes.length === 0) return true;
    
    return allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const baseType = type.split("/")[0];
        return file.type.startsWith(`${baseType}/`);
      }
      return file.type === type;
    });
  }, [allowedTypes]);

  const uploadFile = useCallback(async (upload: UploadFile) => {
    try {
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "uploading" } : u))
      );

      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("path", "");

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? {
                    ...u,
                    progress,
                    uploadedBytes: Math.floor((progress / 100) * upload.file.size),
                    totalBytes: upload.file.size,
                  }
                : u
            )
          );
        }
      }, 200);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errResult = await response.json().catch(() => ({}));
        throw new Error(errResult.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to upload file");
      }

      const { key } = result.data;

      const publicUrlResult = await getPublicUrl({ key });
      const fileUrl = publicUrlResult.success && publicUrlResult.data
        ? publicUrlResult.data.url
        : "";

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: "success",
                progress: 100,
                uploadedBytes: upload.file.size,
                totalBytes: upload.file.size,
                url: fileUrl,
              }
            : u
        )
      );

      if (fileUrl) {
        if (multiple) {
          setSelectedFileUrls((curr) => new Set(curr).add(fileUrl));
        } else {
          setSelectedFileUrl(fileUrl);
        }
      }

      toast({
        title: "Upload successful",
        description: `${upload.file.name} has been uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? {
                ...u,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : u
        )
      );
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  }, [toast, multiple]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const validFiles = fileArray.filter((file) => {
      if (!validateFileType(file)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an allowed file type`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newUploads: UploadFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: "pending" as const,
      uploadedBytes: 0,
      totalBytes: file.size,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    newUploads.forEach((upload) => {
      uploadFile(upload);
    });
  }, [validateFileType, uploadFile, toast]);

  const removeUpload = (id: string) => {
    const upload = uploads.find((u) => u.id === id);
    if (upload?.url) {
      if (upload.url === selectedFileUrl) setSelectedFileUrl(null);
      setSelectedFileUrls((prev) => {
        const next = new Set(prev);
        next.delete(upload.url!);
        return next;
      });
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelect = () => {
    let urls = Array.from(selectedFileUrls);

    // Fallback 1: Collect URLs from successfully uploaded queue items if selectedFileUrls missed any
    uploads.forEach((u) => {
      if (u.status === "success" && u.url && !urls.includes(u.url)) {
        if (multiple) {
          urls.push(u.url);
        } else if (urls.length === 0) {
          urls.push(u.url);
        }
      }
    });

    // Fallback 2: Map selectedFileIds to URLs from fileUrls map
    if (urls.length === 0 && selectedFileIds.size > 0) {
      selectedFileIds.forEach((id) => {
        const url = fileUrls.get(id);
        if (url && !urls.includes(url)) urls.push(url);
      });
    }

    // Fallback 3: Single selectedFileUrl
    if (urls.length === 0 && selectedFileUrl) {
      urls.push(selectedFileUrl);
    }

    if (urls.length === 0) return;

    if (onSelectMultiple) {
      onSelectMultiple(urls);
    }
    if (onSelect) {
      onSelect(urls[0]);
    }
    handleClose();
  };

  const fetchImageUrlsBatch = useCallback(async (filesBatch: FileItem[]) => {
    const imageFiles = filesBatch.filter(
      (f) => f.mimeType.startsWith("image/") && f.storageKey
    );
    if (imageFiles.length === 0) return;

    const newUrlMap = new Map<string, string>();
    await Promise.all(
      imageFiles.map(async (file) => {
        if (file.storageKey) {
          try {
            const urlResult = await getPublicUrl({ key: file.storageKey });
            if (urlResult.success && urlResult.data) {
              newUrlMap.set(file.id, urlResult.data.url);
            }
          } catch (error) {
            console.error(`Failed to get URL for ${file.name}:`, error);
          }
        }
      })
    );

    if (newUrlMap.size > 0) {
      setFileUrls((prev) => {
        const updated = new Map(prev);
        newUrlMap.forEach((val, key) => updated.set(key, val));
        return updated;
      });
    }
  }, []);

  const loadBrowseFiles = useCallback(async () => {
    try {
      setBrowseLoading(true);
      const result = await listFolder({ path: "/" });
      if (result.success && result.data) {
        const files = result.data.files.filter((f) => !f.isFolder);
        setBrowseFiles(files);
        await fetchImageUrlsBatch(files.slice(0, visibleCount));
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load files",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load browse files error:", error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setBrowseLoading(false);
    }
  }, [toast, visibleCount, fetchImageUrlsBatch]);

  useEffect(() => {
    if (activeTab === "browse" && isOpen) {
      loadBrowseFiles();
    }
  }, [activeTab, isOpen, loadBrowseFiles]);

  useEffect(() => {
    const hasSuccessfulUploads = uploads.some((u) => u.status === "success");
    if (hasSuccessfulUploads && activeTab === "browse") {
      const timer = setTimeout(() => {
        loadBrowseFiles();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [uploads, activeTab, loadBrowseFiles]);

  const filteredBrowseFiles = useMemo(() => {
    return browseFiles.filter((file) => {
      if (categoryFilter === "image" && !file.mimeType.startsWith("image/")) return false;
      if (categoryFilter === "video" && !file.mimeType.startsWith("video/")) return false;
      if (categoryFilter === "audio" && !file.mimeType.startsWith("audio/")) return false;
      if (categoryFilter === "document" && (file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/") || file.mimeType.startsWith("audio/"))) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = file.name.toLowerCase().includes(query);
        const typeMatch = file.mimeType.toLowerCase().includes(query);
        return nameMatch || typeMatch;
      }
      return true;
    });
  }, [browseFiles, searchQuery, categoryFilter]);

  const categoryCounts = useMemo(() => {
    return {
      all: browseFiles.length,
      image: browseFiles.filter((f) => f.mimeType.startsWith("image/")).length,
      document: browseFiles.filter((f) => !f.mimeType.startsWith("image/") && !f.mimeType.startsWith("video/") && !f.mimeType.startsWith("audio/")).length,
      video: browseFiles.filter((f) => f.mimeType.startsWith("video/")).length,
      audio: browseFiles.filter((f) => f.mimeType.startsWith("audio/")).length,
    };
  }, [browseFiles]);

  const handleLoadMore = async () => {
    try {
      setIsLoadingMore(true);
      const nextCount = visibleCount + 16;
      const nextBatch = filteredBrowseFiles.slice(visibleCount, nextCount);
      setVisibleCount(nextCount);
      await fetchImageUrlsBatch(nextBatch);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSelectAllBrowse = async () => {
    const visible = filteredBrowseFiles.slice(0, visibleCount);
    const allSelected = visible.length > 0 && visible.every((f) => selectedFileIds.has(f.id));

    if (allSelected) {
      const visibleIds = new Set(visible.map((f) => f.id));
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
      const visibleUrls = new Set(visible.map((f) => fileUrls.get(f.id)).filter(Boolean));
      setSelectedFileUrls((prev) => {
        const next = new Set(prev);
        visibleUrls.forEach((url) => next.delete(url!));
        return next;
      });
    } else {
      const newIds = new Set(selectedFileIds);
      const newUrls = new Set(selectedFileUrls);

      await fetchImageUrlsBatch(visible);

      await Promise.all(
        visible.map(async (file) => {
          newIds.add(file.id);
          let url = fileUrls.get(file.id);
          if (!url && file.storageKey) {
            try {
              const res = await getPublicUrl({ key: file.storageKey });
              if (res.success && res.data) {
                url = res.data.url;
                setFileUrls((prev) => new Map(prev).set(file.id, url!));
              }
            } catch (err) {
              console.error("Get URL error:", err);
            }
          }
          if (url) newUrls.add(url);
        })
      );

      setSelectedFileIds(newIds);
      setSelectedFileUrls(newUrls);
    }
  };

  const handleBrowseFileSelect = async (file: FileItem) => {
    if (file.isFolder || !file.storageKey) return;
    
    try {
      let url = fileUrls.get(file.id);
      if (!url) {
        const result = await getPublicUrl({ key: file.storageKey });
        if (result.success && result.data?.url) {
          url = result.data.url;
          setFileUrls((prev) => new Map(prev).set(file.id, url!));
        }
      }

      if (url) {
        const isCurrentlySelected = selectedFileIds.has(file.id) || selectedFileUrls.has(url);
        
        if (multiple) {
          setSelectedFileIds((prev) => {
            const next = new Set(prev);
            if (isCurrentlySelected) next.delete(file.id);
            else next.add(file.id);
            return next;
          });
          setSelectedFileUrls((prev) => {
            const next = new Set(prev);
            if (isCurrentlySelected) next.delete(url!);
            else next.add(url!);
            return next;
          });
        } else {
          setSelectedFileId(file.id);
          setSelectedFileUrl(url);
        }
      }
    } catch (error) {
      console.error("Get file URL error:", error);
    }
  };

  const handleClose = () => {
    const hasActiveUploads = uploads.some((u) => u.status === "uploading");
    if (!hasActiveUploads) {
      setUploads([]);
      setSelectedFileUrl(null);
      setSelectedFileId(null);
      setSelectedFileUrls(new Set());
      setSelectedFileIds(new Set());
      setSearchQuery("");
      setCategoryFilter("all");
      setActiveTab("upload");
      setPreviewUrl(null);
      setPreviewType(null);
      setExternalUrl("");
      setVisibleCount(16);
      onClose();
    }
  };

  // Compute effective selection count & disabled state
  const uploadedSuccessCount = uploads.filter((u) => u.status === "success").length;
  const effectiveSelectedCount = multiple
    ? Math.max(selectedFileUrls.size, selectedFileIds.size, uploadedSuccessCount)
    : (selectedFileUrl || selectedFileUrls.size > 0 || selectedFileIds.size > 0 || uploadedSuccessCount > 0 ? 1 : 0);

  const isSelectDisabled =
    effectiveSelectedCount === 0 || uploads.some((u) => u.status === "uploading");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] max-h-[720px] p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-card/98 backdrop-blur-xl flex flex-col">
        <DialogHeader className="flex-shrink-0 p-5 border-b bg-muted/40 flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Media Library
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Upload new media, select existing assets, or paste direct links
            </DialogDescription>
          </div>
          {browseFiles.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground bg-muted/80 border border-border/60 px-3 py-1 rounded-full shrink-0 font-medium">
              {browseFiles.length} Total Files
            </span>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="upload" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="browse" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm flex items-center justify-center gap-1.5">
                Browse Library
                {browseFiles.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                    {browseFiles.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="url" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
                External Link
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload" className="flex-1 overflow-y-auto p-5 pt-4 border-0 space-y-4">
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-200 text-center relative overflow-hidden group",
                  isDragging
                    ? "border-primary bg-primary/10 shadow-lg scale-[1.01]"
                    : "border-border/70 bg-muted/30 hover:bg-muted/50 hover:border-primary/40"
                )}
              >
                <div className="p-3 rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs group-hover:scale-110 transition-transform duration-200">
                  <Cloud className="h-7 w-7" />
                </div>
                <p className="mb-1 text-sm font-semibold text-foreground">
                  Drag & drop files here, or click to browse
                </p>
                <p className="mb-2 text-xs text-muted-foreground max-w-sm">
                  {allowedTypes && allowedTypes.length > 0
                    ? `Allowed formats: ${allowedTypes.join(", ")}`
                    : "Supports images, documents, videos, audio & archives up to 50MB"}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground uppercase">PNG</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground uppercase">JPG</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground uppercase">WEBP</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground uppercase">PDF</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground uppercase">Max 50MB</span>
                </div>
                <Button type="button" variant="default" size="sm" onClick={handleBrowseClick} className="shadow-xs cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Computer
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={allowedTypes?.join(",")}
                />
              </div>

              {/* Upload List */}
              {uploads.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload Queue</h3>
                  <div className="space-y-2 pr-1">
                    {uploads.map((upload) => {
                      const isItemChecked = upload.url
                        ? selectedFileUrls.has(upload.url) || upload.url === selectedFileUrl
                        : upload.status === "success";

                      return (
                        <div
                          key={upload.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 transition-all",
                            isItemChecked
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border/60 bg-card"
                          )}
                        >
                          <div className="flex-shrink-0">
                            {upload.file.type.startsWith("image/") ? (
                              <div 
                                className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted cursor-pointer border shadow-xs group"
                                onClick={() => {
                                  if (upload.status === "success" && upload.url) {
                                    setPreviewUrl(upload.url);
                                    setPreviewType("upload");
                                  } else {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      if (e.target?.result) {
                                        setPreviewUrl(e.target.result as string);
                                        setPreviewType("upload");
                                      }
                                    };
                                    reader.readAsDataURL(upload.file);
                                  }
                                }}
                              >
                                {upload.status === "success" && upload.url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={upload.url}
                                    alt={upload.file.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={URL.createObjectURL(upload.file)}
                                    alt={upload.file.name}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-14 w-14 flex items-center justify-center bg-muted/40 rounded-lg">
                                {getFileIcon(upload.file)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold truncate text-foreground">
                                {upload.file.name}
                              </p>
                              {upload.status === "success" && (
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                              {upload.status === "error" && (
                                <X className="h-4 w-4 text-destructive flex-shrink-0" />
                              )}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{formatBytes(upload.file.size)}</span>
                              {upload.status === "uploading" && (
                                <span>{upload.progress}%</span>
                              )}
                              {upload.status === "success" && (
                                <span className="text-green-600 font-medium">Uploaded</span>
                              )}
                              {upload.status === "error" && (
                                <span className="text-destructive font-medium">
                                  {upload.error || "Failed"}
                                </span>
                              )}
                            </div>
                            {upload.status === "uploading" && (
                              <Progress value={upload.progress} className="mt-1.5 h-1.5" />
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {upload.status === "success" && upload.url && (
                              <Button
                                type="button"
                                variant={isItemChecked ? "default" : "outline"}
                                size="sm"
                                className="h-8 text-xs cursor-pointer"
                                onClick={() => {
                                  if (multiple) {
                                    setSelectedFileUrls((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(upload.url!)) next.delete(upload.url!);
                                      else next.add(upload.url!);
                                      return next;
                                    });
                                  } else {
                                    setSelectedFileUrl(upload.url || null);
                                  }
                                }}
                              >
                                {isItemChecked ? "Selected" : "Select"}
                              </Button>
                            )}
                            {upload.status !== "uploading" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeUpload(upload.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="browse" className="flex-1 overflow-y-auto p-5 pt-4 border-0 space-y-4">
            <div className="space-y-4">
              {/* Search Input & Filter Pills */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search media by name or format..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 text-xs rounded-xl border-border/80"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("all")}
                      className={cn(
                        "text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer border",
                        categoryFilter === "all"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                      )}
                    >
                      All ({categoryCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("image")}
                      className={cn(
                        "text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer border",
                        categoryFilter === "image"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                      )}
                    >
                      Images ({categoryCounts.image})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("document")}
                      className={cn(
                        "text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer border",
                        categoryFilter === "document"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                      )}
                    >
                      Documents ({categoryCounts.document})
                    </button>
                    {categoryCounts.video > 0 && (
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("video")}
                        className={cn(
                          "text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer border",
                          categoryFilter === "video"
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                        )}
                      >
                        Videos ({categoryCounts.video})
                      </button>
                    )}
                  </div>

                  {multiple && filteredBrowseFiles.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllBrowse}
                      className="text-xs h-7 px-3 rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs font-semibold"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      {filteredBrowseFiles.slice(0, visibleCount).length > 0 &&
                      filteredBrowseFiles.slice(0, visibleCount).every((f) => selectedFileIds.has(f.id))
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Files Grid */}
              {browseLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/60 p-3 space-y-3 bg-card/60 animate-pulse">
                      <div className="h-16 w-16 mx-auto rounded-lg bg-muted/80" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-3/4 rounded bg-muted/80" />
                        <div className="h-2.5 w-1/2 rounded bg-muted/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredBrowseFiles.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-8 text-center bg-muted/20">
                  <File className="h-10 w-10 text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? "No files found matching search" : "No files found"}
                  </p>
                  {!searchQuery && (
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Upload files in the Upload tab to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-1">
                    {filteredBrowseFiles.slice(0, visibleCount).map((file) => {
                      const url = fileUrls.get(file.id);
                      const isSelected = multiple
                        ? selectedFileIds.has(file.id) || (url ? selectedFileUrls.has(url) : false)
                        : selectedFileId === file.id || (url ? selectedFileUrl === url : false);
                      const isImage = file.mimeType.startsWith("image/");
                      
                      return (
                        <Card
                          key={file.id}
                          className={cn(
                            "relative cursor-pointer transition-all duration-200 rounded-xl overflow-hidden border group hover:-translate-y-0.5 hover:shadow-md select-none",
                            isSelected
                              ? "ring-2 ring-primary border-primary bg-primary/5 shadow-xs"
                              : "border-border/60 hover:border-primary/40 bg-card"
                          )}
                          onClick={() => handleBrowseFileSelect(file)}
                        >
                          <div className="p-2.5">
                            <div className="flex items-center justify-center mb-2 relative rounded-lg overflow-hidden bg-muted/30">
                              {isImage && file.storageKey ? (
                                <div className="relative h-20 w-full rounded-lg overflow-hidden bg-muted border border-border/40 group-hover:scale-105 transition-transform duration-200">
                                  {fileUrls.get(file.id) ? (
                                    <>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={fileUrls.get(file.id)!}
                                        alt={file.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          target.style.display = "none";
                                        }}
                                      />
                                      <button
                                        type="button"
                                        title="Preview image"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewUrl(fileUrls.get(file.id)!);
                                          setPreviewType("browse");
                                        }}
                                        className="absolute top-1.5 left-1.5 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 shadow-md"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      {getBrowseFileIcon(file)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-20 w-full flex items-center justify-center bg-muted/20 rounded-lg">
                                  {getBrowseFileIcon(file)}
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 bg-primary text-white rounded-full p-1 shadow-md animate-in zoom-in-50 duration-150">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold truncate text-foreground" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{formatBytes(file.size)}</span>
                                <span className="uppercase font-mono">{file.mimeType.split("/")[1] || "FILE"}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {visibleCount < filteredBrowseFiles.length && (
                    <div className="flex flex-col items-center justify-center pt-2 pb-1 gap-1 border-t border-border/40">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="gap-2 text-xs font-semibold px-5 py-1.5 hover:bg-muted rounded-xl shadow-2xs cursor-pointer"
                      >
                        {isLoadingMore
                          ? "Loading more files..."
                          : `Load More Files (${filteredBrowseFiles.length - visibleCount} remaining)`}
                      </Button>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Showing {Math.min(visibleCount, filteredBrowseFiles.length)} of {filteredBrowseFiles.length} files
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="flex-1 overflow-y-auto p-5 pt-4 border-0 space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direct External Image/Media URL</label>
                <div className="flex gap-2">
                  <div className="relative w-full">
                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      value={externalUrl}
                      onChange={(e) => {
                        setExternalUrl(e.target.value);
                        setSelectedFileUrl(e.target.value);
                      }}
                      className="pl-10 h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a direct link to an image or document hosted on an external CDN.
                </p>
              </div>
              
              {externalUrl && (
                <div className="mt-4 rounded-xl border p-4 bg-muted/20">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Image Link Preview</h3>
                  <div className="flex items-center justify-center min-h-[180px] max-h-[260px] bg-card rounded-xl overflow-hidden border shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      key={externalUrl}
                      src={externalUrl} 
                      alt="External preview" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector("p")) {
                           let msg = document.createElement("p");
                           msg.className = "text-xs text-muted-foreground p-4 text-center";
                           msg.textContent = "Preview not available or invalid URL link";
                           parent.appendChild(msg);
                        }
                      }}
                      onLoad={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "block";
                        const parent = target.parentElement;
                        if (parent) {
                          const p = parent.querySelector("p");
                          if (p) p.remove();
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 p-4 border-t bg-muted/30 flex items-center justify-between gap-2">
          {multiple && effectiveSelectedCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary font-semibold bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                {effectiveSelectedCount} file{effectiveSelectedCount > 1 ? "s" : ""} selected
              </span>
            </div>
          ) : selectedFileUrl || effectiveSelectedCount > 0 ? (
            <span className="text-xs text-muted-foreground truncate max-w-[280px]">
              Selected: <span className="font-semibold text-foreground">{(selectedFileUrl || "1 File").split("/").pop()}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No media selected</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleClose} className="rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSelect}
              disabled={isSelectDisabled}
              className="rounded-xl shadow-xs cursor-pointer"
            >
              {multiple
                ? effectiveSelectedCount > 0
                  ? `Select (${effectiveSelectedCount})`
                  : "Select"
                : "Select Media"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Preview Sub-Modal */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
          <DialogContent className="sm:max-w-3xl rounded-2xl overflow-hidden border shadow-2xl p-0">
            <DialogHeader className="p-4 border-b bg-muted/30">
              <DialogTitle className="text-base font-semibold">Media Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-[380px] max-h-[580px] bg-black/5 p-4 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[54vh] object-contain rounded-xl shadow-sm"
              />
            </div>
            <DialogFooter className="p-4 border-t bg-card flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewUrl(null)} className="rounded-xl">
                Close
              </Button>
              <Button
                size="sm"
                className="rounded-xl shadow-xs"
                onClick={() => {
                  if (previewUrl) {
                    if (multiple) {
                      setSelectedFileUrls((prev) => new Set(prev).add(previewUrl));
                      setPreviewUrl(null);
                    } else {
                      setSelectedFileUrl(previewUrl);
                      setPreviewUrl(null);
                      if (onSelect) {
                        onSelect(previewUrl);
                        handleClose();
                      }
                    }
                  }
                }}
              >
                {multiple ? "Add to Selection" : "Select This Image"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
