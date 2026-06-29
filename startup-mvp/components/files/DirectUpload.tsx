"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadFileServerSide } from "@/app/actions/files";

interface DirectUploadProps {
  onUploadComplete?: () => void;
  currentPath: string;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function DirectUpload({ onUploadComplete, currentPath }: DirectUploadProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newUploads: UploadFile[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: "pending" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);
    setIsOpen(true);

    // Start uploading each file
    newUploads.forEach((upload) => {
      uploadFile(upload);
    });

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

      // Prepare form data for standard binary upload
      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("path", currentPath === "/" ? "" : currentPath.replace(/^\/+/, ""));

      // Simulate progress for better UX
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, progress } : u))
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

      if (!result.success) {
        throw new Error(result.error || "Failed to upload file");
      }

      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "success", progress: 100 } : u))
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
    if (uploads.length === 1) {
      setIsOpen(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button onClick={handleButtonClick} size="sm" className="bg-[#f2652d] hover:bg-[#f2652d]/90">
          <Upload className="mr-2 h-4 w-4" />
          Select Files
        </Button>
      </div>
      
      {uploads.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <div className="mt-1">
                  {upload.status === "uploading" && (
                    <Progress value={upload.progress} className="h-2" />
                  )}
                  {upload.status === "success" && (
                    <p className="text-xs text-green-600 dark:text-green-400">Upload complete</p>
                  )}
                  {upload.status === "error" && (
                    <p className="text-xs text-destructive">{upload.error}</p>
                  )}
                </div>
              </div>
              {upload.status !== "uploading" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.id)}
                  className="h-8 w-8 p-0"
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

