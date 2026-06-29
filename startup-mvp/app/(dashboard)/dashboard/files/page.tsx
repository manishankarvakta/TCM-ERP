"use client";

import { useState, useEffect, useMemo } from "react";
import { listFolder, deleteFile, copyFile, moveFile, getDownloadUrl, createFolder, renameFileOrFolder, addExternalFile } from "@/app/actions/files";
import FileGrid from "@/components/files/FileGrid";
import FileList from "@/components/files/FileList";
import Breadcrumb from "@/components/files/Breadcrumb";
import UploadDialog from "@/components/files/UploadDialog";
import FilePreviewDialog from "@/components/files/FilePreviewDialog";
import { Grid, List, Search, Upload, FolderPlus, Link } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type ViewMode = "grid" | "list";
type SortBy = "name" | "type" | "date";

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [externalLinkDialogOpen, setExternalLinkDialogOpen] = useState(false);
  const [externalLinkName, setExternalLinkName] = useState("");
  const [externalLinkUrl, setExternalLinkUrl] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [fileToPreview, setFileToPreview] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast, toasts, closeToast } = useToast();

  // Load files when path changes
  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await listFolder({ path: currentPath });
      if (result.success && result.data) {
        setFiles(result.data.files);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load files",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load files error:", error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = files.filter(
        (file) =>
          file.name.toLowerCase().includes(query) ||
          (file.mimeType && file.mimeType.toLowerCase().includes(query))
      );
    }

    // Sort files
    const sorted = [...filtered].sort((a, b) => {
      // Folders always come first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "type":
          return a.mimeType.localeCompare(b.mimeType);
        case "date":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [files, searchQuery, sortBy]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles(new Set());
  };

  const handleSelectFile = (fileId: string, selected: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleDelete = (file: FileItem) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      // Get storage key from file object (now included in listFolder response)
      const storageKey = fileToDelete.storageKey;
      if (!storageKey) {
        throw new Error("Storage key not found");
      }

      const result = await deleteFile({ key: storageKey });
      
      if (result.success) {
        toast({
          title: "Success",
          description: "File deleted successfully",
        });
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      setSelectedFiles(new Set());
    }
  };

  const handleCopy = async (file: FileItem, destinationPath: string) => {
    try {
      // Get storage key from file object
      const sourceKey = file.storageKey;
      if (!sourceKey) {
        throw new Error("Storage key not found");
      }

      // Construct destination key (we need user ID, but we can extract it from sourceKey)
      const userId = sourceKey.split("/")[0];
      if (!userId) {
        throw new Error("Invalid storage key format");
      }
      const normalizedDestPath = destinationPath === "/" ? "" : destinationPath.replace(/^\/+/, "");
      // For folders, ensure the destination key ends with a slash
      const destKey = file.isFolder
        ? `${userId}/${normalizedDestPath}${normalizedDestPath ? "/" : ""}${file.name}/`
        : `${userId}/${normalizedDestPath}${normalizedDestPath ? "/" : ""}${file.name}`;

      const result = await copyFile({ sourceKey, destKey });
      
      if (result.success) {
        toast({
          title: "Success",
          description: "File copied successfully",
        });
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to copy file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Error",
        description: "Failed to copy file",
        variant: "destructive",
      });
    }
  };

  const handleMove = async (file: FileItem, destinationPath: string) => {
    try {
      // Get storage key from file object
      const sourceKey = file.storageKey;
      if (!sourceKey) {
        throw new Error("Storage key not found");
      }

      // Construct destination key (we need user ID, but we can extract it from sourceKey)
      const userId = sourceKey.split("/")[0];
      const normalizedDestPath = destinationPath === "/" ? "" : destinationPath.replace(/^\/+/, "");
      // For folders, ensure the destination key ends with a slash
      const destKey = file.isFolder
        ? `${userId}/${normalizedDestPath}${normalizedDestPath ? "/" : ""}${file.name}/`
        : `${userId}/${normalizedDestPath}${normalizedDestPath ? "/" : ""}${file.name}`;

      const result = await moveFile({ sourceKey, destKey });
      
      if (result.success) {
        toast({
          title: "Success",
          description: "File moved successfully",
        });
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to move file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Move error:", error);
      toast({
        title: "Error",
        description: "Failed to move file",
        variant: "destructive",
      });
    }
  };

  const handleRename = (file: FileItem) => {
    setFileToRename(file);
    setNewFileName(file.name);
    setRenameDialogOpen(true);
  };

  const confirmRename = async () => {
    if (!fileToRename || !newFileName.trim()) return;

    try {
      const storageKey = fileToRename.storageKey;
      if (!storageKey) {
        throw new Error("Storage key not found");
      }

      const result = await renameFileOrFolder({
        key: storageKey,
        newName: newFileName.trim(),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "File renamed successfully",
        });
        // Optimistically update the file name
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileToRename.id
              ? { ...f, name: newFileName.trim() }
              : f
          )
        );
        loadFiles(); // Refetch to ensure consistency
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to rename file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Rename error:", error);
      toast({
        title: "Error",
        description: "Failed to rename file",
        variant: "destructive",
      });
    } finally {
      setRenameDialogOpen(false);
      setFileToRename(null);
      setNewFileName("");
    }
  };

  const handlePreview = (file: FileItem) => {
    setFileToPreview(file);
    setPreviewDialogOpen(true);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      // Get storage key from file object
      const storageKey = file.storageKey;
      if (!storageKey) {
        throw new Error("Storage key not found");
      }

      const result = await getDownloadUrl({ key: storageKey });
      
      if (result.success && result.data) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement("a");
        link.href = result.data.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate download URL",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;

    try {
      const result = await createFolder({
        path: currentPath,
        name: folderName.trim(),
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Folder created successfully",
        });
        setFolderName("");
        setFolderDialogOpen(false);
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create folder",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Create folder error:", error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleAddExternalLink = async () => {
    if (!externalLinkName.trim() || !externalLinkUrl.trim()) return;

    try {
      const result = await addExternalFile({
        path: currentPath,
        name: externalLinkName.trim(),
        externalUrl: externalLinkUrl.trim(),
        mimeType: "image/jpeg", // Default to image/jpeg
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "External link added successfully",
        });
        setExternalLinkName("");
        setExternalLinkUrl("");
        setExternalLinkDialogOpen(false);
        loadFiles();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add external link",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Add external link error:", error);
      toast({
        title: "Error",
        description: "Failed to add external link",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">File Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your files and folders
            </p>
          </div>
          
        </div>
        <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
      </div>

      {/* Toolbar */}
      <div className=" flex gap-4 justify-between items-center border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: View toggle, Sort, Search */}
          <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by: Name</SelectItem>
                <SelectItem value="type">Sort by: Type</SelectItem>
                <SelectItem value="date">Sort by: Date</SelectItem>
              </SelectContent>
            </Select>


            <ToggleGroup
              type="single"
              value={viewMode}
              className="gap-2"
              onValueChange={(value) => {
                if (value === "grid" || value === "list") {
                  setViewMode(value);
                }
              }}
            >
              
            <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid className="h-5 w-5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-5 w-5" />
              </ToggleGroupItem>
            </ToggleGroup>

            
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setExternalLinkDialogOpen(true)}
            >
              <Link className="mr-2 h-4 w-4" />
              Add Link
            </Button>
            <Button
              variant="outline"
              onClick={() => setFolderDialogOpen(true)}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Folder
            </Button>
            <Button
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading files...</div>
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={filteredAndSortedFiles}
            onFolderClick={handleNavigate}
            onFileClick={handlePreview}
            onDelete={handleDelete}
            onCopy={handleCopy}
            onMove={handleMove}
            onRename={handleRename}
            onDownload={handleDownload}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            currentPath={currentPath}
            onBulkCopy={(files, path) => {
              files.forEach((f) => handleCopy(f, path));
            }}
            onBulkMove={(files, path) => {
              files.forEach((f) => handleMove(f, path));
            }}
            onBulkDownload={async (files) => {
              try {
                // Filter out folders
                const fileRecords = files.filter((f) => !f.isFolder);
                
                if (fileRecords.length === 0) {
                  toast({
                    title: "Error",
                    description: "No files to download",
                    variant: "destructive",
                  });
                  return;
                }

                // Get storage keys
                const keys = fileRecords
                  .map((f) => f.storageKey)
                  .filter((key): key is string => !!key);

                if (keys.length === 0) {
                  toast({
                    title: "Error",
                    description: "No valid files to download",
                    variant: "destructive",
                  });
                  return;
                }

                // Call API to download ZIP
                const response = await fetch("/api/files/download-zip", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ keys }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || "Failed to download ZIP file");
                }

                // Get ZIP blob
                const blob = await response.blob();
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `files-${Date.now()}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                toast({
                  title: "Success",
                  description: `Downloaded ${fileRecords.length} file(s) as ZIP`,
                });
              } catch (error) {
                console.error("Bulk download error:", error);
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to download files",
                  variant: "destructive",
                });
              }
            }}
            onBulkDelete={(files) => {
              files.forEach((f) => handleDelete(f));
            }}
          />
        ) : (
          <FileList
            files={filteredAndSortedFiles}
            onFolderClick={handleNavigate}
            onFileClick={handlePreview}
            onDelete={handleDelete}
            onCopy={handleCopy}
            onMove={handleMove}
            onRename={handleRename}
            onDownload={handleDownload}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            currentPath={currentPath}
            onBulkCopy={(files, path) => {
              files.forEach((f) => handleCopy(f, path));
            }}
            onBulkMove={(files, path) => {
              files.forEach((f) => handleMove(f, path));
            }}
            onBulkDownload={async (files) => {
              try {
                // Filter out folders
                const fileRecords = files.filter((f) => !f.isFolder);
                
                if (fileRecords.length === 0) {
                  toast({
                    title: "Error",
                    description: "No files to download",
                    variant: "destructive",
                  });
                  return;
                }

                // Get storage keys
                const keys = fileRecords
                  .map((f) => f.storageKey)
                  .filter((key): key is string => !!key);

                if (keys.length === 0) {
                  toast({
                    title: "Error",
                    description: "No valid files to download",
                    variant: "destructive",
                  });
                  return;
                }

                // Call API to download ZIP
                const response = await fetch("/api/files/download-zip", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ keys }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || "Failed to download ZIP file");
                }

                // Get ZIP blob
                const blob = await response.blob();
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `files-${Date.now()}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                toast({
                  title: "Success",
                  description: `Downloaded ${fileRecords.length} file(s) as ZIP`,
                });
              } catch (error) {
                console.error("Bulk download error:", error);
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to download files",
                  variant: "destructive",
                });
              }
            }}
            onBulkDelete={(files) => {
              files.forEach((f) => handleDelete(f));
            }}
          />
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload to the current folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <UploadDialog
              open={uploadDialogOpen}
              onOpenChange={setUploadDialogOpen}
              currentPath={currentPath}
              onUploadComplete={() => {
                setUploadDialogOpen(false);
                loadFiles();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="My Folder"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add External Link Dialog */}
      <Dialog open={externalLinkDialogOpen} onOpenChange={setExternalLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Photo Link</DialogTitle>
            <DialogDescription>
              Enter a name and external image URL to display in the file manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="external-name">Photo Name</Label>
              <Input
                id="external-name"
                value={externalLinkName}
                onChange={(e) => setExternalLinkName(e.target.value)}
                placeholder="Google Logo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="external-url">Photo URL</Label>
              <Input
                id="external-url"
                value={externalLinkUrl}
                onChange={(e) => setExternalLinkUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddExternalLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExternalLink} disabled={!externalLinkName.trim() || !externalLinkUrl.trim()}>
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {fileToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {fileToRename?.isFolder ? "Folder" : "File"}</DialogTitle>
            <DialogDescription>
              Enter a new name for {fileToRename?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter new name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmRename();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              disabled={!newFileName.trim() || newFileName.trim() === fileToRename?.name}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <FilePreviewDialog
        file={fileToPreview}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        onDownload={handleDownload}
      />

      {/* Toast Notifications */}
      <Toaster toasts={toasts as any} onClose={closeToast} />
    </div>
  );
}

