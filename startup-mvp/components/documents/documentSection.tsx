"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiFileText,
  FiImage,
  FiPaperclip,
  FiPlus,
  FiTrash2,
  FiExternalLink,
  FiDownload,
  FiFile,
} from "react-icons/fi";
import UploadDialog from "@/components/UploadDialog";
import { format } from "date-fns";

export interface DocumentItem {
  id: string;
  name: string;
  url: string;
  type?: string;
  category?: string;
  notes?: string;
  uploadedAt: string;
}

interface DocumentSectionProps {
  documents: DocumentItem[];
  onChange?: (docs: DocumentItem[]) => void;
  readOnly?: boolean;
  title?: string;
  description?: string;
}

export default function DocumentSection({
  documents = [],
  onChange,
  readOnly = false,
  title = "Transaction & Dealing Documents",
  description = "Attach PDFs, images, contracts, or past dealing records",
}: DocumentSectionProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isAddMetaOpen, setIsAddMetaOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string>("");
  const [docName, setDocName] = useState<string>("");
  const [docCategory, setDocCategory] = useState<string>("Previous Dealing");
  const [docNotes, setDocNotes] = useState<string>("");

  const handleFileSelected = (url: string) => {
    setIsUploadDialogOpen(false);
    setPendingUrl(url);
    
    // Extract default name from file URL
    const filename = url.split("/").pop() || "Document";
    const cleanName = decodeURIComponent(filename).replace(/^\d+[-_]?/, "");
    setDocName(cleanName);
    setIsAddMetaOpen(true);
  };

  const handleSaveDocument = () => {
    if (!pendingUrl) return;

    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: docName.trim() || "Untitled Document",
      url: pendingUrl,
      category: docCategory,
      notes: docNotes.trim(),
      uploadedAt: new Date().toISOString(),
    };

    const updated = [...documents, newDoc];
    onChange?.(updated);

    // Reset form
    setPendingUrl("");
    setDocName("");
    setDocCategory("Previous Dealing");
    setDocNotes("");
    setIsAddMetaOpen(false);
  };

  const handleRemoveDocument = (id: string) => {
    const updated = documents.filter((doc) => doc.id !== id);
    onChange?.(updated);
  };

  const getFileIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.endsWith(".jpg") ||
      lowerUrl.endsWith(".jpeg") ||
      lowerUrl.endsWith(".png") ||
      lowerUrl.endsWith(".gif") ||
      lowerUrl.endsWith(".webp") ||
      lowerUrl.includes("image")
    ) {
      return <FiImage className="h-6 w-6 text-blue-500" />;
    }
    if (lowerUrl.endsWith(".pdf")) {
      return <FiFileText className="h-6 w-6 text-red-500" />;
    }
    return <FiFile className="h-6 w-6 text-emerald-500" />;
  };

  const isImage = (url: string) => {
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.endsWith(".jpg") ||
      lowerUrl.endsWith(".jpeg") ||
      lowerUrl.endsWith(".png") ||
      lowerUrl.endsWith(".gif") ||
      lowerUrl.endsWith(".webp")
    );
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FiPaperclip className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {description}
          </CardDescription>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsUploadDialogOpen(true)}
            className="flex items-center gap-1.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
          >
            <FiPlus className="h-4 w-4" />
            Add Document
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/20 text-center">
            <FiPaperclip className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No documents attached yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Upload past invoices, contract agreements, tax certificates, or dealing photos.
            </p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <FiPlus className="h-4 w-4 mr-1.5" />
                Upload Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between p-3.5 border rounded-lg bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-md bg-muted/50 flex-shrink-0">
                    {getFileIcon(doc.url)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      {doc.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          {doc.category}
                        </Badge>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {doc.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Uploaded on{" "}
                      {doc.uploadedAt
                        ? format(new Date(doc.uploadedAt), "MMM d, yyyy")
                        : "Recent"}
                    </p>
                  </div>
                </div>

                {/* Preview / Image thumbnail if applicable */}
                {isImage(doc.url) && (
                  <div className="mt-3 relative h-28 w-full rounded border overflow-hidden bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.url}
                      alt={doc.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t text-xs">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FiExternalLink className="h-3.5 w-3.5" />
                    View / Open
                  </a>
                  <a
                    href={doc.url}
                    download
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <FiDownload className="h-3.5 w-3.5" />
                    Download
                  </a>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => handleRemoveDocument(doc.id)}
                      title="Remove Document"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onSelect={handleFileSelected}
      />

      {/* Document Details Modal */}
      <Dialog open={isAddMetaOpen} onOpenChange={setIsAddMetaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Enter descriptive title and details for this uploaded document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document Title / Name <span className="text-destructive">*</span></Label>
              <Input
                id="doc-name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Trade License 2025.pdf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-category">Document Category</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger id="doc-category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Previous Dealing">Previous Dealing Record</SelectItem>
                  <SelectItem value="Invoice/Receipt">Invoice / Payment Receipt</SelectItem>
                  <SelectItem value="Contract/Agreement">Contract / Agreement</SelectItem>
                  <SelectItem value="License/KYC">License / Tax Document</SelectItem>
                  <SelectItem value="Photo/Media">Photo / Media</SelectItem>
                  <SelectItem value="Other">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-notes">Notes / Details (Optional)</Label>
              <Textarea
                id="doc-notes"
                rows={3}
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Add any notes about transaction history or terms..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddMetaOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveDocument}
              disabled={!docName.trim()}
            >
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
