"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FiPaperclip, FiDownload, FiExternalLink, FiZoomIn, FiZoomOut } from "react-icons/fi";

interface AttachmentViewerProps {
  url: string;
  label?: string;
  purchaseNumber?: string;
  triggerIcon?: boolean;
}

export default function AttachmentViewer({ url, label = "Attached Document", purchaseNumber, triggerIcon = false }: AttachmentViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Detect if the attachment is an image by extension
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);

  const filename = url.split("/").pop()?.split("?")[0] ?? "attachment";

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  return (
    <>
      {/* Trigger button */}
      {triggerIcon ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => { setOpen(true); setZoom(1); }}
          title="View Attachment"
        >
          <FiPaperclip className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOpen(true); setZoom(1); }}
        >
          <FiPaperclip className="mr-2 h-4 w-4" />
          View Attachment
        </Button>
      )}

      {/* Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-full p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between px-5 pr-12 py-3 border-b bg-muted/40">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <FiPaperclip className="h-4 w-4 shrink-0" />
              {label}
              {purchaseNumber && (
                <span className="text-muted-foreground font-mono font-normal">— {purchaseNumber}</span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {isImage && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom out">
                    <FiZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom in">
                    <FiZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Download">
                <a href={url} download={filename} target="_blank" rel="noopener noreferrer">
                  <FiDownload className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Open in new tab">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <FiExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </DialogHeader>

          {/* Content Area */}
          <div className="overflow-auto max-h-[75vh] bg-neutral-100 flex items-start justify-center p-4">
            {isImage ? (
              <img
                src={url}
                alt={label}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s" }}
                className="rounded shadow-md max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
                <FiPaperclip className="h-16 w-16 opacity-30" />
                <p className="text-sm">Preview not available for this file type.</p>
                <Button asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <FiExternalLink className="mr-2 h-4 w-4" />
                    Open File
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Footer: filename */}
          <div className="px-5 py-2 border-t bg-muted/30 text-xs text-muted-foreground truncate">
            {url}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
