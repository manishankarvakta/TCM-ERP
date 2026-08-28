"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Upload, X, FileText, Plus } from "lucide-react";
import UploadDialog from "./UploadDialog";
import { cn } from "@/lib/utils";

interface MediaSelectorProps {
  label?: string;
  value?: string | string[]; // Currently selected file URL or URLs
  onChange?: (url: string) => void;
  onChangeMultiple?: (urls: string[]) => void;
  multiple?: boolean;
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
  onChangeMultiple,
  multiple = false,
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

  const valuesArray: string[] = Array.isArray(value)
    ? value
    : value
    ? [value]
    : [];

  // Update image state when value changes
  useEffect(() => {
    if (valuesArray.length > 0) {
      setIsImage(checkIfImage(valuesArray[0]));
    } else {
      setIsImage(false);
    }
  }, [value]);

  const handleSelect = (url: string) => {
    if (onChange) onChange(url);
    if (onChangeMultiple) onChangeMultiple([url]);
    setIsDialogOpen(false);
    setIsImage(checkIfImage(url));
  };

  const handleSelectMultiple = (urls: string[]) => {
    const merged = Array.from(new Set([...valuesArray, ...urls]));
    if (onChangeMultiple) {
      onChangeMultiple(merged);
    } else if (onChange && urls.length > 0) {
      onChange(urls[0]);
    }
    setIsDialogOpen(false);
  };

  const handleRemoveSingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) onChange("");
    if (onChangeMultiple) onChangeMultiple([]);
    setIsImage(false);
  };

  const handleRemoveItem = (urlToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = valuesArray.filter((u) => u !== urlToRemove);
    if (onChangeMultiple) onChangeMultiple(updated);
    if (onChange) onChange(updated[0] || "");
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

      {multiple ? (
        <div className="space-y-3">
          {/* Multi Preview Grid */}
          <div className="flex flex-wrap items-center gap-3">
            {valuesArray.map((url, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative border-2 border-muted-foreground/25 bg-muted/50 overflow-hidden group shadow-sm",
                  getPreviewClasses()
                )}
                style={{ width: `${width}px`, height: `${height}px` }}
              >
                {checkIfImage(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`Selected media ${idx + 1}`}
                    className={cn("h-full w-full object-cover", getPreviewClasses())}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(url, e)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-sm"
                  aria-label="Remove media item"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(true)}
              className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-all p-0"
              style={{ width: `${width}px`, height: `${height}px` }}
            >
              <Plus className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-[11px] font-medium text-muted-foreground">Add Media</span>
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{valuesArray.length} file{valuesArray.length !== 1 ? "s" : ""} selected</span>
            {valuesArray.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveSingle}
                className="h-6 px-2 text-destructive hover:text-destructive text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center gap-4">
          {/* Single Preview */}
          <div
            className={cn(
              "relative border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden",
              getPreviewClasses(),
              value ? "" : "flex items-center justify-center"
            )}
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            {value ? (
              <>
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={valuesArray[0]}
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
                  onClick={handleRemoveSingle}
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
                onClick={handleRemoveSingle}
                className="w-full sm:w-auto text-destructive hover:text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleSelect}
        onSelectMultiple={handleSelectMultiple}
        multiple={multiple}
        allowedTypes={allowedTypes}
      />
    </div>
  );
}
