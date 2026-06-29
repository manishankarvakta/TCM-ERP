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
import { Upload, X, Check, Cloud, Image as ImageIcon, FileText, Video, Music, Search, File, Folder, Archive, Code, FileSpreadsheet, Presentation, Link as LinkIcon } from "lucide-react";
import { uploadFileServerSide, getPublicUrl, listFolder } from "@/app/actions/files";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (fileUrl: string) => void;
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
  allowedTypes,
}: UploadDialogProps) {
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Browse Media state
  const [browseFiles, setBrowseFiles] = useState<FileItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"upload" | "browse" | null>(null);
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map());
  const [externalUrl, setExternalUrl] = useState("");

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
        <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Folder className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("video/")) {
      return (
        <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("pdf")) {
      return (
        <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">PDF</div>
        </div>
      );
    }
    if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.mimeType.includes("csv")) {
      return (
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <FileSpreadsheet className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("presentation") || file.mimeType.includes("powerpoint")) {
      return (
        <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
          <Presentation className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        </div>
      );
    }
    if (file.mimeType.includes("zip") || file.mimeType.includes("rar") || file.mimeType.includes("tar") || file.mimeType.includes("gz")) {
      return (
        <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
          <Archive className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    }
    if (file.mimeType.includes("javascript") || file.mimeType.includes("typescript") || file.mimeType.includes("json") || file.mimeType.includes("code") || file.name.endsWith(".tsx") || file.name.endsWith(".jsx") || file.name.endsWith(".ts") || file.name.endsWith(".js")) {
      return (
        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Code className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.includes("word") || file.mimeType.includes("document") || file.mimeType.includes("docx") || file.mimeType.includes("doc")) {
      return (
        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    return (
      <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
        <File className="h-8 w-8 text-gray-600 dark:text-gray-400" />
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
      // Update status to uploading
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "uploading" } : u))
      );

      // Prepare form data for standard binary upload
      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("path", "");

      // Simulate progress for better UX
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

      // Upload file via API Route Handler using FormData
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

      // Get public URL
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

      // Set as selected if it's the first successful upload
      setUploads((prev) => {
        const successUpload = prev.find((u) => u.id === upload.id && u.status === "success");
        if (successUpload && successUpload.url) {
          setSelectedFileUrl((current) => current || successUpload.url || null);
        }
        return prev;
      });

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
  }, [toast]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Filter by allowed types
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

    // Start uploading each file
    newUploads.forEach((upload) => {
      uploadFile(upload);
    });
  }, [validateFileType, uploadFile, toast]);

  const removeUpload = (id: string) => {
    const upload = uploads.find((u) => u.id === id);
    if (upload?.url === selectedFileUrl) {
      setSelectedFileUrl(null);
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input
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
    if (selectedFileUrl && onSelect) {
      onSelect(selectedFileUrl);
    }
    handleClose();
  };

  // Load browse files
  const loadBrowseFiles = useCallback(async () => {
    try {
      setBrowseLoading(true);
      const result = await listFolder({ path: "/" });
      if (result.success && result.data) {
        // Filter out folders and only show files
        const files = result.data.files.filter((f) => !f.isFolder);
        setBrowseFiles(files);
        
        // Load public URLs for all image files
        const imageFiles = files.filter((f) => f.mimeType.startsWith("image/") && f.storageKey);
        const urlMap = new Map<string, string>();
        
        await Promise.all(
          imageFiles.map(async (file) => {
            if (file.storageKey) {
              try {
                const urlResult = await getPublicUrl({ key: file.storageKey });
                if (urlResult.success && urlResult.data) {
                  urlMap.set(file.id, urlResult.data.url);
                }
              } catch (error) {
                console.error(`Failed to get URL for ${file.name}:`, error);
              }
            }
          })
        );
        
        setFileUrls(urlMap);
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
  }, [toast]);

  // Load files when Browse Media tab is opened
  useEffect(() => {
    if (activeTab === "browse" && isOpen) {
      loadBrowseFiles();
    }
  }, [activeTab, isOpen, loadBrowseFiles]);

  // Refresh browse files when uploads complete
  useEffect(() => {
    const hasSuccessfulUploads = uploads.some((u) => u.status === "success");
    if (hasSuccessfulUploads && activeTab === "browse") {
      // Refresh browse files after a short delay to ensure file is saved
      const timer = setTimeout(() => {
        loadBrowseFiles();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [uploads, activeTab, loadBrowseFiles]);

  // Filter files by search query
  const filteredBrowseFiles = useMemo(() => {
    if (!searchQuery.trim()) return browseFiles;
    
    const query = searchQuery.toLowerCase();
    return browseFiles.filter((file) => {
      const nameMatch = file.name.toLowerCase().includes(query);
      const typeMatch = file.mimeType.toLowerCase().includes(query);
      return nameMatch || typeMatch;
    });
  }, [browseFiles, searchQuery]);

  // Handle file selection in browse tab
  const handleBrowseFileSelect = async (file: FileItem) => {
    if (file.isFolder) return; // Don't select folders
    
    try {
      if (!file.storageKey) {
        toast({
          title: "Error",
          description: "File storage key not found",
          variant: "destructive",
        });
        return;
      }

      // Get public URL for the file
      const result = await getPublicUrl({ key: file.storageKey });
      
      if (result.success && result.data) {
        setSelectedFileId(file.id);
        setSelectedFileUrl(result.data.url);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to get file URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Get file URL error:", error);
      toast({
        title: "Error",
        description: "Failed to get file URL",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    // Only close if no uploads are in progress
    const hasActiveUploads = uploads.some((u) => u.status === "uploading");
    if (!hasActiveUploads) {
      setUploads([]);
      setSelectedFileUrl(null);
      setSelectedFileId(null);
      setSearchQuery("");
      setActiveTab("upload");
      setPreviewUrl(null);
      setPreviewType(null);
      setExternalUrl("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Upload new media or browse existing files
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="browse">Browse Media</TabsTrigger>
            <TabsTrigger value="url">External URL</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 border-0">
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex min-h-[150px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 bg-muted/50"
                )}
              >
                <Cloud className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">
                  Drag and drop files here, or click to browse
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  {allowedTypes && allowedTypes.length > 0
                    ? `Allowed types: ${allowedTypes.join(", ")}`
                    : "All file types allowed"}
                </p>
                <Button type="button" variant="outline" onClick={handleBrowseClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Files
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
                  <h3 className="text-sm font-medium">Selected Files</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3",
                          upload.url === selectedFileUrl && "border-primary bg-primary/5"
                        )}
                      >
                        <div className="flex-shrink-0">
                          {upload.file.type.startsWith("image/") ? (
                            <div 
                              className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted cursor-pointer border"
                              onClick={() => {
                                if (upload.status === "success" && upload.url) {
                                  setPreviewUrl(upload.url);
                                  setPreviewType("upload");
                                } else {
                                  // Create preview from file object for pending/uploading images
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
                            </div>
                          ) : (
                            <div className="h-16 w-16 flex items-center justify-center">
                              {getFileIcon(upload.file)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {upload.file.name}
                            </p>
                            {upload.status === "success" && (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                            {upload.status === "error" && (
                              <X className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatBytes(upload.file.size)}</span>
                            {upload.status === "uploading" && (
                              <span>{upload.progress}%</span>
                            )}
                            {upload.status === "success" && (
                              <span className="text-green-600">Uploaded</span>
                            )}
                            {upload.status === "error" && (
                              <span className="text-destructive">
                                {upload.error || "Failed"}
                              </span>
                            )}
                          </div>
                          {upload.status === "uploading" && (
                            <Progress value={upload.progress} className="mt-2" />
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {upload.status === "success" && upload.url && (
                            <Button
                              type="button"
                              variant={upload.url === selectedFileUrl ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedFileUrl(upload.url || null)}
                            >
                              {upload.url === selectedFileUrl ? "Selected" : "Select"}
                            </Button>
                          )}
                          {upload.status !== "uploading" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeUpload(upload.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="browse" className="mt-4 border-0">
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Files Grid */}
              {browseLoading ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading files...</p>
                </div>
              ) : filteredBrowseFiles.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8">
                  <File className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No files found matching your search" : "No files found"}
                  </p>
                  {!searchQuery && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload files in the Upload tab to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                  {filteredBrowseFiles.map((file) => {
                    const isSelected = selectedFileId === file.id;
                    const isImage = file.mimeType.startsWith("image/");
                    
                    return (
                      <Card
                        key={file.id}
                        className={cn(
                          "relative cursor-pointer transition-all hover:shadow-md",
                          isSelected && "ring-2 ring-primary border-primary"
                        )}
                        onClick={async () => {
                          if (isImage && file.storageKey) {
                            // For images, select and show preview
                            await handleBrowseFileSelect(file);
                            const url = fileUrls.get(file.id);
                            if (url) {
                              setPreviewUrl(url);
                              setPreviewType("browse");
                            } else {
                              try {
                                const result = await getPublicUrl({ key: file.storageKey });
                                if (result.success && result.data) {
                                  setFileUrls((prev) => new Map(prev).set(file.id, result.data!.url));
                                  setPreviewUrl(result.data.url);
                                  setPreviewType("browse");
                                }
                              } catch (error) {
                                console.error("Failed to get preview URL:", error);
                              }
                            }
                          } else {
                            // For non-images, just select
                            await handleBrowseFileSelect(file);
                          }
                        }}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-center mb-2 relative">
                            {isImage && file.storageKey ? (
                              <div 
                                className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted cursor-pointer border"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  // First select the file
                                  await handleBrowseFileSelect(file);
                                  // Then open preview
                                  const url = fileUrls.get(file.id);
                                  if (url) {
                                    setPreviewUrl(url);
                                    setPreviewType("browse");
                                  } else {
                                    // Fallback: get URL on demand
                                    try {
                                      const result = await getPublicUrl({ key: file.storageKey! });
                                      if (result.success && result.data) {
                                        setFileUrls((prev) => new Map(prev).set(file.id, result.data!.url));
                                        setPreviewUrl(result.data.url);
                                        setPreviewType("browse");
                                      }
                                    } catch (error) {
                                      console.error("Failed to get preview URL:", error);
                                    }
                                  }
                                }}
                              >
                                {fileUrls.get(file.id) ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={fileUrls.get(file.id)!}
                                    alt={file.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      // Fallback to icon if image fails to load
                                      const target = e.currentTarget;
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (parent) {
                                        const iconElement = getBrowseFileIcon(file);
                                        if (iconElement && parent) {
                                          parent.innerHTML = "";
                                          parent.appendChild(iconElement as unknown as Node);
                                        }
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    {getBrowseFileIcon(file)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              getBrowseFileIcon(file)
                            )}
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4 border-0">
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">External Image/Media URL</label>
                <div className="flex gap-2">
                  <div className="relative w-full">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      value={externalUrl}
                      onChange={(e) => {
                        setExternalUrl(e.target.value);
                        setSelectedFileUrl(e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a direct link to an image or media file hosted elsewhere.
                </p>
              </div>
              
              {externalUrl && (
                <div className="mt-4 rounded-lg border p-4">
                  <h3 className="text-sm font-medium mb-2">Preview</h3>
                  <div className="flex items-center justify-center min-h-[200px] max-h-[300px] bg-muted rounded-lg overflow-hidden border">
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
                           msg.className = "text-sm text-muted-foreground p-4 text-center";
                           msg.textContent = "Preview not available or invalid URL";
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedFileUrl || uploads.some((u) => u.status === "uploading")}
          >
            Select
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Preview Modal */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-[400px] max-h-[600px] bg-muted rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (previewUrl) {
                    setSelectedFileUrl(previewUrl);
                    setPreviewUrl(null);
                    // Call onSelect if provided and close the dialog
                    if (onSelect) {
                      onSelect(previewUrl);
                      handleClose();
                    }
                  }
                }}
              >
                Select This Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

