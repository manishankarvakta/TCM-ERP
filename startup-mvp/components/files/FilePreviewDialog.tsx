"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, FileText, Image, File, Video, Music, Archive, Code, FileSpreadsheet, Presentation, Folder, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import { getDownloadUrl, getPublicUrl } from "@/app/actions/files";
import { useToast } from "@/hooks/use-toast";

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
  usageCount?: number;
  usages?: Array<{ module: string; name: string; id: string }> | string[];
  owner?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

const getReferenceLink = (module: string, id: string): string => {
  switch (module.toLowerCase()) {
    case "item":
      return `/dashboard/master/items/${id}/edit`;
    case "user":
      return `/dashboard/users/${id}`;
    case "employee":
      return `/dashboard/employees/${id}`;
    case "client":
      return `/dashboard/clients/${id}`;
    case "supplier":
      return `/dashboard/suppliers/${id}`;
    case "purchase":
      return `/dashboard/procurements/purchases/${id}`;
    case "sale":
      return `/dashboard/sales/${id}`;
    default:
      return "#";
  }
};

interface FilePreviewDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (file: FileItem) => void;
}

export default function FilePreviewDialog({
  file,
  open,
  onOpenChange,
  onDownload,
}: FilePreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadPreviewUrl = useCallback(async () => {
    if (!file?.storageKey) return;

    try {
      setLoading(true);
      const result = await getDownloadUrl({ key: file.storageKey });
      if (result.success && result.data) {
        setPreviewUrl(result.data.url);
      }
    } catch (error) {
      console.error("Error loading preview URL:", error);
    } finally {
      setLoading(false);
    }
  }, [file?.storageKey]);

  const loadFileUrl = useCallback(async () => {
    if (!file?.storageKey) return;

    try {
      setUrlLoading(true);
      // Try to get public URL first, fallback to presigned URL
      const publicResult = await getPublicUrl({ key: file.storageKey });
      if (publicResult.success && publicResult.data) {
        setFileUrl(publicResult.data.url);
      } else {
        // Fallback to presigned URL
        const downloadResult = await getDownloadUrl({ key: file.storageKey, expiresIn: 86400 }); // 24 hours
        if (downloadResult.success && downloadResult.data) {
          setFileUrl(downloadResult.data.url);
        }
      }
    } catch (error) {
      console.error("Error loading file URL:", error);
      // Fallback to presigned URL
      try {
        const downloadResult = await getDownloadUrl({ key: file.storageKey, expiresIn: 86400 });
        if (downloadResult.success && downloadResult.data) {
          setFileUrl(downloadResult.data.url);
        }
      } catch (err) {
        console.error("Error loading fallback URL:", err);
      }
    } finally {
      setUrlLoading(false);
    }
  }, [file?.storageKey]);

  useEffect(() => {
    if (file && open && !file.isFolder) {
      loadPreviewUrl();
      loadFileUrl();
    } else {
      setPreviewUrl(null);
      setFileUrl(null);
    }
  }, [file, open, loadPreviewUrl, loadFileUrl]);

  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) {
      return (
        <div className="h-24 w-24 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Folder className="h-12 w-12 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Image className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("video/")) {
      return (
        <div className="h-24 w-24 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Video className="h-12 w-12 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <Music className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("pdf")) {
      return (
        <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <div className="bg-red-600 text-white text-sm font-bold px-3 py-2 rounded">PDF</div>
        </div>
      );
    }
    if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.mimeType.includes("csv")) {
      return (
        <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <FileSpreadsheet className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("presentation") || file.mimeType.includes("powerpoint")) {
      return (
        <div className="h-24 w-24 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
          <Presentation className="h-12 w-12 text-orange-600 dark:text-orange-400" />
        </div>
      );
    }
    if (file.mimeType.includes("zip") || file.mimeType.includes("rar") || file.mimeType.includes("tar") || file.mimeType.includes("gz")) {
      return (
        <div className="h-24 w-24 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
          <Archive className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    }
    if (file.mimeType.includes("javascript") || file.mimeType.includes("typescript") || file.mimeType.includes("json") || file.mimeType.includes("code") || file.name.endsWith(".tsx") || file.name.endsWith(".jsx") || file.name.endsWith(".ts") || file.name.endsWith(".js")) {
      return (
        <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Code className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.includes("word") || file.mimeType.includes("document") || file.mimeType.includes("docx") || file.mimeType.includes("doc")) {
      return (
        <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    return (
      <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
        <File className="h-12 w-12 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  const handleCopyUrl = async () => {
    if (!fileUrl) return;

    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "File URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      toast({
        title: "Error",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!file) return null;

  const isImage = file.mimeType.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
          {/* Left Side - Preview */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg p-6 min-w-0">
            {loading ? (
              <div className="text-muted-foreground">Loading preview...</div>
            ) : isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                {getFileIcon(file)}
                <p className="mt-4 text-sm text-muted-foreground text-center max-w-xs">
                  Preview not available for this file type
                </p>
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="w-80 flex flex-col gap-4 border-l pl-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">File Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">File Name</p>
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">File Size</p>
                    <p className="text-sm">{formatBytes(file.size)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">File Type</p>
                    <p className="text-sm">{file.mimeType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Modified</p>
                    <p className="text-sm">{format(new Date(file.updatedAt), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{format(new Date(file.createdAt), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Path</p>
                    <p className="text-sm truncate" title={file.path}>
                      {file.path || "/"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">File URL</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={fileUrl || (urlLoading ? "Loading..." : "Not available")}
                        readOnly
                        className="text-xs h-8 flex-1 font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyUrl}
                        disabled={!fileUrl || urlLoading}
                        className="h-8 px-3"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Usage References */}
                  {file.usageCount !== undefined && file.usageCount > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-xs text-muted-foreground mb-1.5 font-semibold">
                        Used in ({file.usageCount})
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-muted/20">
                        {file.usages && (file.usages as any[]).map((usage: any, idx: number) => {
                          const module = typeof usage === "string" ? usage.split(":")[0]?.trim() : usage.module;
                          const name = typeof usage === "string" ? usage.split(":")[1]?.trim() : usage.name;
                          const id = typeof usage === "string" ? null : usage.id;
                          const link = id ? getReferenceLink(module, id) : "#";

                          return (
                            <div key={idx} className="text-xs flex items-center justify-between gap-2 py-0.5">
                              <span className="text-muted-foreground font-medium">{module}:</span>
                              {id ? (
                                <a 
                                  href={link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold truncate max-w-[150px]"
                                  title={`Open ${name} in a new tab`}
                                >
                                  {name}
                                </a>
                              ) : (
                                <span className="font-medium truncate max-w-[150px]">{name}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t">
              <Button
                onClick={() => file && onDownload(file)}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

