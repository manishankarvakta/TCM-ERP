"use client";

import { useState, useEffect, useCallback } from "react";
import { File, Folder, MoreVertical, Download, Trash2, Copy, Move, Eye, Edit, Image, Video, Music, Archive, Code, FileSpreadsheet, Presentation, FileText, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { getPublicUrl } from "@/app/actions/files";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FolderDropdown from "./FolderDropdown";
import { formatBytes } from "@/lib/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

interface FileListProps {
  files: FileItem[];
  onFolderClick: (path: string) => void;
  onFileClick?: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onCopy: (file: FileItem, destinationPath: string) => void;
  onMove: (file: FileItem, destinationPath: string) => void;
  onRename?: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string, selected: boolean) => void;
  currentPath: string;
  onBulkCopy?: (files: FileItem[], destinationPath: string) => void;
  onBulkMove?: (files: FileItem[], destinationPath: string) => void;
  onBulkDownload?: (files: FileItem[]) => void;
  onBulkDelete?: (files: FileItem[]) => void;
}

export default function FileList({
  files,
  onFolderClick,
  onFileClick,
  onDelete,
  onCopy,
  onMove,
  onRename,
  onDownload,
  selectedFiles,
  onSelectFile,
  currentPath,
  onBulkCopy,
  onBulkMove,
  onBulkDownload,
  onBulkDelete,
}: FileListProps) {
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map());

  // Load public URLs for image files
  const loadImageUrls = useCallback(async () => {
    const imageFiles = files.filter((f) => !f.isFolder && f.mimeType.startsWith("image/") && f.storageKey);
    const urlMap = new Map<string, string>();

    await Promise.all(
      imageFiles.map(async (file) => {
        if (file.storageKey && !fileUrls.has(file.id)) {
          try {
            const result = await getPublicUrl({ key: file.storageKey });
            if (result.success && result.data) {
              urlMap.set(file.id, result.data.url);
            }
          } catch (error) {
            console.error(`Failed to get URL for ${file.name}:`, error);
          }
        }
      })
    );

    if (urlMap.size > 0) {
      setFileUrls((prev) => new Map([...prev, ...urlMap]));
    }
  }, [files, fileUrls]);

  useEffect(() => {
    loadImageUrls();
  }, [loadImageUrls]);
  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) {
      return (
        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Folder className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Image className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("video/")) {
      return (
        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }
    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("pdf")) {
      return (
        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">PDF</div>
        </div>
      );
    }
    if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.mimeType.includes("csv")) {
      return (
        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      );
    }
    if (file.mimeType.includes("presentation") || file.mimeType.includes("powerpoint")) {
      return (
        <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
          <Presentation className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
      );
    }
    if (file.mimeType.includes("zip") || file.mimeType.includes("rar") || file.mimeType.includes("tar") || file.mimeType.includes("gz")) {
      return (
        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
          <Archive className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    }
    if (file.mimeType.includes("javascript") || file.mimeType.includes("typescript") || file.mimeType.includes("json") || file.mimeType.includes("code") || file.name.endsWith(".tsx") || file.name.endsWith(".jsx") || file.name.endsWith(".ts") || file.name.endsWith(".js")) {
      return (
        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }
    if (file.mimeType.includes("word") || file.mimeType.includes("document") || file.mimeType.includes("docx") || file.mimeType.includes("doc")) {
      return (
        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    return (
      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
        <File className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  const handleClick = (file: FileItem) => {
    if (file.isFolder) {
      const newPath = file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`;
      onFolderClick(newPath);
    } else {
      onFileClick?.(file);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Folder className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No files or folders</p>
        <p className="text-sm text-muted-foreground mt-1">Upload files or create a folder to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={files.length > 0 && files.every((f) => selectedFiles.has(f.id))}
                onCheckedChange={(checked) => {
                  files.forEach((f) => onSelectFile(f.id, checked as boolean));
                }}
              />
            </TableHead>
            <TableHead className="min-w-[300px]">
              <div className="flex items-center gap-2">
                File Name
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                Modified
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                File Size
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                Owner
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const isSelected = selectedFiles.has(file.id);
            const selectedFilesList = files.filter((f) => selectedFiles.has(f.id));
            const hasSelection = selectedFilesList.length > 0;
            
            return (
              <ContextMenu key={file.id}>
                <ContextMenuTrigger asChild>
                  <TableRow
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      isSelected && "bg-muted"
                    )}
                    onClick={() => handleClick(file)}
                  >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectFile(file.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {!file.isFolder && file.mimeType.startsWith("image/") && file.storageKey ? (
                      <div className="relative h-10 w-10 rounded overflow-hidden bg-muted border flex-shrink-0">
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
                                const iconElement = getFileIcon(file);
                                if (iconElement && parent) {
                                  parent.innerHTML = "";
                                  parent.appendChild(iconElement as unknown as Node);
                                }
                              }
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                      </div>
                    ) : (
                      getFileIcon(file)
                    )}
                    <span className="font-medium truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(file.updatedAt), "yyyy/MM/dd")}
                  </span>
                </TableCell>
                <TableCell>
                  {!file.isFolder ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                      {file.usageCount !== undefined && file.usageCount > 0 && (
                        <span 
                          className="inline-flex items-center w-max px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" 
                          title={`Used in:\n${file.usages?.map(u => typeof u === "string" ? u : `${u.module}: ${u.name}`).join("\n") || ""}`}
                        >
                          Used: {file.usageCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={file.owner?.image || undefined} alt={file.owner?.name || file.owner?.email || "Owner"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {file.owner?.name 
                          ? getInitials(file.owner.name)
                          : file.owner?.email 
                            ? file.owner.email[0].toUpperCase()
                            : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {file.owner?.name || file.owner?.email || "Unknown"}
                    </span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted"
                        data-context-menu-trigger
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (file.isFolder) {
                            onFolderClick(file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`);
                          } else {
                            onFileClick?.(file);
                          }
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {file.isFolder ? "Open" : "Preview"}
                      </DropdownMenuItem>
                      {onRename && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onRename(file);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {!file.isFolder && onDownload && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onDownload(file);
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to...
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                          <FolderDropdown
                            excludePath={file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`}
                            onSelect={(path) => {
                              onCopy(file, path);
                            }}
                            label="Copy to..."
                          />
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                          <Move className="mr-2 h-4 w-4" />
                          Move to...
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                          <FolderDropdown
                            excludePath={file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`}
                            onSelect={(path) => {
                              onMove(file, path);
                            }}
                            label="Move to..."
                          />
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(file);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              </ContextMenuTrigger>
              
              {/* Context Menu - Show bulk operations if file is selected and there are multiple selections */}
              {hasSelection && isSelected ? (
                <ContextMenuContent>
                  {selectedFilesList.some((f) => !f.isFolder) && onBulkDownload && (
                    <ContextMenuItem
                      onClick={() => {
                        onBulkDownload(selectedFilesList);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download as ZIP ({selectedFilesList.filter((f) => !f.isFolder).length})
                    </ContextMenuItem>
                  )}
                  {selectedFilesList.some((f) => !f.isFolder) && (
                    <ContextMenuSeparator />
                  )}
                  {onBulkCopy && (
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy ({selectedFilesList.length})
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
                        <FolderDropdown
                          excludePath={currentPath}
                          onSelect={(path) => {
                            onBulkCopy(selectedFilesList, path);
                          }}
                          label="Copy to..."
                          variant="context"
                        />
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  )}
                  {onBulkMove && (
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <Move className="mr-2 h-4 w-4" />
                        Move ({selectedFilesList.length})
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
                        <FolderDropdown
                          excludePath={currentPath}
                          onSelect={(path) => {
                            onBulkMove(selectedFilesList, path);
                          }}
                          label="Move to..."
                          variant="context"
                        />
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  )}
                  {onBulkDelete && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          onBulkDelete(selectedFilesList);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedFilesList.length})
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              ) : (
                /* Context Menu for Individual File */
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (file.isFolder) {
                        onFolderClick(file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`);
                      } else {
                        onFileClick?.(file);
                      }
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {file.isFolder ? "Open" : "Preview"}
                  </ContextMenuItem>
                  {onRename && (
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename(file);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                  {!file.isFolder && onDownload && (
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </ContextMenuItem>
                  )}
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to...
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
                      <FolderDropdown
                        excludePath={file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`}
                        onSelect={(path) => {
                          onCopy(file, path);
                        }}
                        label="Copy to..."
                        variant="context"
                      />
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Move className="mr-2 h-4 w-4" />
                      Move to...
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
                      <FolderDropdown
                        excludePath={file.path === "/" ? `/${file.name}` : `${file.path}/${file.name}`}
                        onSelect={(path) => {
                          onMove(file, path);
                        }}
                        label="Move to..."
                        variant="context"
                      />
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              )}
            </ContextMenu>
          );
        })}
        </TableBody>
      </Table>
    </div>
  );
}

