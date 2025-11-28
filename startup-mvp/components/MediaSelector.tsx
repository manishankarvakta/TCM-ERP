"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Upload, X, FileText } from "lucide-react";
import UploadDialog from "./UploadDialog";
import { cn } from "@/lib/utils";

interface MediaSelectorProps {
  label?: string;
  value?: string; // Currently selected file URL
  onChange: (url: string) => void;
  allowedTypes?: string[]; // e.g., ["image/*", "video/*"]
  folderName?: string; // Optional folder name for organization
  previewStyle?: "square" | "round" | "round-full";
  className?: string;
  required?: boolean;
  width?: number; // Preview width in pixels
  height?: number; // Preview height in pixels
}

export default function MediaSelector({
  label,
  value,
  onChange,
  allowedTypes,
  folderName,
  previewStyle = "square",
  className,
  required = false,
  width = 96, // Default 96px (w-24)
  height = 96, // Default 96px (h-24)
}: MediaSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImage, setIsImage] = useState(false);

  // Check if the value is an image URL
  const checkIfImage = (url: string) => {
    if (!url) return false;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext)) || lowerUrl.includes("image/");
  };

  // Update image state when value changes
  useEffect(() => {
    if (value) {
      setIsImage(checkIfImage(value));
    } else {
      setIsImage(false);
    }
  }, [value]);

  const handleSelect = (url: string) => {
    onChange(url);
    setIsDialogOpen(false);
    setIsImage(checkIfImage(url));
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsImage(false);
  };

  const getPreviewClasses = () => {
    switch (previewStyle) {
      case "round":
        return "rounded-lg";
      case "round-full":
        return "rounded-full";
      default:
        return "rounded";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="flex flex-col justify-center items-center gap-4">
        {/* Preview */}
        <div 
          className={cn("relative border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden", getPreviewClasses(), value ? "" : "flex items-center justify-center")}
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          {value ? (
            <>
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={value}
                  alt="Selected media"
                  className={cn("h-full w-full object-cover", getPreviewClasses())}
                  onError={() => setIsImage(false)}
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                aria-label="Remove media"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
              {isImage || !value ? (
                <ImageIcon className="h-8 w-8 mb-1" />
              ) : (
                <FileText className="h-8 w-8 mb-1" />
              )}
              <span className="text-xs">No media</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant={value ? "outline" : "default"}
            onClick={() => setIsDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            {value ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Change Media
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Select from Media
              </>
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="w-full sm:w-auto text-destructive hover:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleSelect}
        allowedTypes={allowedTypes}
      />
    </div>
  );
}

