"use client";

import { useState, useEffect } from "react";
import { Folder, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listFolder } from "@/app/actions/files";
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
}

interface FolderSelectorProps {
  excludePath?: string; // Path to exclude (e.g., current file's path)
  onSelect: (path: string) => void;
  selectedPath?: string;
}

export default function FolderSelector({
  excludePath,
  onSelect,
  selectedPath,
}: FolderSelectorProps) {
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(["/"]));
  const [folderContents, setFolderContents] = useState<Record<string, FileItem[]>>({});

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const result = await listFolder({ path: "/" });
      if (result.success && result.data) {
        const allFolders = result.data.files.filter((f) => f.isFolder);
        setFolders(allFolders);
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContents = async (path: string) => {
    if (folderContents[path]) return; // Already loaded

    try {
      const result = await listFolder({ path });
      if (result.success && result.data) {
        const subFolders = result.data.files.filter((f) => f.isFolder);
        setFolderContents((prev) => ({ ...prev, [path]: subFolders }));
      }
    } catch (error) {
      console.error("Error loading folder contents:", error);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
        loadFolderContents(path);
      }
      return newSet;
    });
  };

  const renderFolder = (folder: FileItem, level: number = 0) => {
    const folderPath = folder.path === "/" ? `/${folder.name}` : `${folder.path}/${folder.name}`;
    const isExpanded = expandedPaths.has(folderPath);
    const subFolders = folderContents[folderPath] || [];
    const isExcluded = excludePath && folderPath.startsWith(excludePath);
    const isSelected = selectedPath === folderPath;

    if (isExcluded) return null;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
            isSelected && "bg-accent ring-2 ring-[#f2652d]"
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          onClick={() => onSelect(folderPath)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(folderPath);
            }}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "transform rotate-90"
              )}
            />
          </Button>
          <Folder className="h-4 w-4 text-[#f2652d] flex-shrink-0" />
          <span className="text-sm flex-1 truncate">{folder.name}</span>
          {isSelected && (
            <Check className="h-4 w-4 text-[#f2652d] flex-shrink-0" />
          )}
        </div>
        {isExpanded && subFolders.length > 0 && (
          <div>
            {subFolders.map((subFolder) => renderFolder(subFolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleRootSelect = () => {
    onSelect("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading folders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
          selectedPath === "/" && "bg-accent ring-2 ring-[#f2652d]"
        )}
        onClick={handleRootSelect}
      >
        <Folder className="h-4 w-4 text-[#f2652d] flex-shrink-0" />
        <span className="text-sm font-medium">Root</span>
        {selectedPath === "/" && (
          <Check className="h-4 w-4 text-[#f2652d] ml-auto flex-shrink-0" />
        )}
      </div>
      {folders.map((folder) => renderFolder(folder, 0))}
    </div>
  );
}

