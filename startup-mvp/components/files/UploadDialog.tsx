"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Check, Cloud, FileText, Image, Video, Music, Archive, Code, FileSpreadsheet, Presentation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadFileServerSide } from "@/app/actions/files";
import { getSetting } from "@/app/(dashboard)/dashboard/settings/_actions/settings.action";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  currentPath: string;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  uploadedBytes?: number;
  totalBytes?: number;
}

export default function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  currentPath,
}: UploadDialogProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Settings state
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(50);
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getSetting("system", "general");
        if (result.success && result.setting?.settings) {
          const settings = result.setting.settings as Record<string, any>;
          if (settings.fileSizeLimit) {
            setMaxFileSizeMB(Number(settings.fileSizeLimit));
          }
          if (settings.supportedFileTypes) {
            const exts = (settings.supportedFileTypes as string)
              .split(",")
              .map((e: string) => e.trim().toLowerCase())
              .filter(Boolean);
            setSupportedExtensions(exts);
          }
        }
      } catch (error) {
        console.error("Failed to fetch upload settings", error);
      } finally {
        setSettingsLoading(false);
      }
    };

    if (open) {
      fetchSettings();
    }
  }, [open]);

  const getFileIcon = (file: File) => {
    const mimeType = file.type;
    const name = file.name.toLowerCase();

    if (mimeType.startsWith("image/")) {
      return <Image className="h-6 w-6 text-blue-600" />;
    }
    if (mimeType.startsWith("video/")) {
      return <Video className="h-6 w-6 text-purple-600" />;
    }
    if (mimeType.startsWith("audio/")) {
      return <Music className="h-6 w-6 text-green-600" />;
    }
    if (mimeType.includes("pdf") || name.endsWith(".pdf")) {
      return (
        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          PDF
        </div>
      );
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
      return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || name.endsWith(".pptx")) {
      return <Presentation className="h-6 w-6 text-orange-600" />;
    }
    if (mimeType.includes("zip") || mimeType.includes("rar") || name.endsWith(".zip") || name.endsWith(".rar")) {
      return <Archive className="h-6 w-6 text-yellow-600" />;
    }
    if (mimeType.includes("javascript") || mimeType.includes("typescript") || name.endsWith(".tsx") || name.endsWith(".jsx") || name.endsWith(".ts") || name.endsWith(".js")) {
      return <Code className="h-6 w-6 text-blue-600" />;
    }
    if (mimeType.includes("word") || mimeType.includes("document") || name.endsWith(".docx") || name.endsWith(".doc")) {
      return <FileText className="h-6 w-6 text-blue-600" />;
    }
    return <FileText className="h-6 w-6 text-muted-foreground" />;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Filter files based on settings
    const validFiles: File[] = [];
    const invalidFiles: { file: File; reason: string }[] = [];

    fileArray.forEach(file => {
      // Check size
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        invalidFiles.push({ file, reason: `Exceeds ${maxFileSizeMB}MB limit` });
        return;
      }

      // Check extension (if restrictions exist)
      if (supportedExtensions.length > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !supportedExtensions.includes(ext)) {
          invalidFiles.push({ file, reason: `Type not allowed` });
          return;
        }
      }

      validFiles.push(file);
    });

    // Show errors for invalid files
    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were rejected",
        description: invalidFiles.map(f => `${f.file.name}: ${f.reason}`).join("\n"),
        variant: "destructive",
      });
    }

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
  }, [maxFileSizeMB, supportedExtensions, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (upload: UploadFile) => {
    try {
      // Update status to uploading
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "uploading" } : u))
      );

      // Convert file to base64
      const arrayBuffer = await upload.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileData = buffer.toString('base64');

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

      // Upload file via server action (internal MinIO connection)
      const result = await uploadFileServerSide({
        path: currentPath === "/" ? "" : currentPath.replace(/^\/+/, ""),
        name: upload.file.name,
        fileData,
        contentType: upload.file.type || "application/octet-stream",
        size: upload.file.size,
      });

      clearInterval(progressInterval);

      if (!result.success) {
        throw new Error(result.error || "Failed to upload file");
      }

      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: "success", progress: 100, uploadedBytes: upload.file.size, totalBytes: upload.file.size }
            : u
        )
      );

      // Call onUploadComplete after a short delay
      setTimeout(() => {
        onUploadComplete?.();
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
            : u
        )
      );
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
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

  const handleClose = () => {
    // Only close if no uploads are in progress
    const hasActiveUploads = uploads.some((u) => u.status === "uploading");
    if (!hasActiveUploads) {
      setUploads([]);
      onOpenChange(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag and Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <Cloud className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">
              Choose a file or drag & drop it here.
            </p>
            <div className="text-xs text-muted-foreground flex flex-col gap-1 items-center">
               {settingsLoading ? (
                 <Loader2 className="h-3 w-3 animate-spin" />
               ) : (
                 <>
                   <span>Max Size: {maxFileSizeMB} MB</span>
                   {supportedExtensions.length > 0 && (
                     <span className="max-w-xs truncate">Allowed: {supportedExtensions.join(", ")}</span>
                   )}
                 </>
               )}
            </div>
          </div>
          <Button onClick={handleBrowseClick} variant="outline" size="sm">
            Browse File
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex-shrink-0">
                {getFileIcon(upload.file)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <div className="mt-1 space-y-1">
                  {upload.status === "uploading" && (
                    <>
                      <p className="text-xs text-muted-foreground">
              JPEG, PNG, PDF, and MP4 formats, up to {maxFileSizeMB} MB.
            </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(upload.uploadedBytes || 0)} of {formatBytes(upload.totalBytes || upload.file.size)}.{" "}
                        <span className="text-destructive">Uploading...</span>
                      </p>
                      <Progress value={upload.progress} className="h-2" />
                    </>
                  )}
                  {upload.status === "success" && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {formatBytes(upload.uploadedBytes || upload.file.size)} of {formatBytes(upload.totalBytes || upload.file.size)}.{" "}
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Completed</span>
                    </p>
                  )}
                  {upload.status === "error" && (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  )}
                </div>
              </div>
              {upload.status === "uploading" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

