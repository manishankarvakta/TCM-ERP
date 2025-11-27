"use client";

import { useState, useEffect, useRef } from "react";
import { Folder, Check } from "lucide-react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuItem,
} from "@/components/ui/context-menu";
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

interface FolderDropdownProps {
  excludePath?: string; // Path to exclude (e.g., current file's path)
  onSelect: (path: string) => void;
  selectedPath?: string;
  label: string;
  variant?: "dropdown" | "context"; // Add variant prop to determine which menu system to use
}

export default function FolderDropdown({
  excludePath,
  onSelect,
  selectedPath,
  label,
  variant = "dropdown",
}: FolderDropdownProps) {
  const [folders, setFolders] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderContents, setFolderContents] = useState<Record<string, FileItem[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const loadedPathsRef = useRef<Set<string>>(new Set());
  const loadingPathsRef = useRef<Set<string>>(new Set());

  // Use the appropriate menu components based on variant
  const MenuSub = variant === "context" ? ContextMenuSub : DropdownMenuSub;
  const MenuSubContent = variant === "context" ? ContextMenuSubContent : DropdownMenuSubContent;
  const MenuSubTrigger = variant === "context" ? ContextMenuSubTrigger : DropdownMenuSubTrigger;
  const MenuItem = variant === "context" ? ContextMenuItem : DropdownMenuItem;

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
    // Check if already loaded or currently loading using refs
    if (loadedPathsRef.current.has(path) || loadingPathsRef.current.has(path)) {
      return;
    }

    try {
      loadingPathsRef.current.add(path);
      setLoadingPaths((prev) => new Set(prev).add(path));
      
      const result = await listFolder({ path });
      if (result.success && result.data) {
        const subFolders = result.data.files.filter((f) => f.isFolder);
        setFolderContents((prev) => ({ ...prev, [path]: subFolders }));
        loadedPathsRef.current.add(path);
      } else {
        // If no folders found, set empty array
        setFolderContents((prev) => ({ ...prev, [path]: [] }));
        loadedPathsRef.current.add(path);
      }
    } catch (error) {
      console.error("Error loading folder contents:", error);
      setFolderContents((prev) => ({ ...prev, [path]: [] }));
      loadedPathsRef.current.add(path);
    } finally {
      loadingPathsRef.current.delete(path);
      setLoadingPaths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(path);
        return newSet;
      });
    }
  };

  const renderFolder = (folder: FileItem, level: number = 0): React.ReactNode => {
    const folderPath = folder.path === "/" ? `/${folder.name}` : `${folder.path}/${folder.name}`;
    // Only exclude if excludePath is not "/" and folderPath starts with excludePath
    // Also exclude if folderPath exactly matches excludePath (can't copy/move to itself)
    const isExcluded = excludePath && excludePath !== "/" && (
      folderPath.startsWith(excludePath) || folderPath === excludePath
    );
    const isSelected = selectedPath === folderPath;
    const subFolders = folderContents[folderPath] || [];
    const isLoading = loadingPaths.has(folderPath);

    if (isExcluded) return null;

    const handleSelect = (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      onSelect(folderPath);
    };

    const handleSubmenuOpen = () => {
      // Automatically load folder contents when submenu opens
      if (!folderContents[folderPath] && !isLoading) {
        loadFolderContents(folderPath);
      }
    };

    // Always render as submenu to allow automatic expansion
    return (
      <MenuSub key={folder.id}>
        <MenuSubTrigger
          onClick={handleSelect}
          onMouseEnter={handleSubmenuOpen}
          className={cn(isSelected && "bg-accent")}
        >
          <Folder className="h-4 w-4 text-primary" />
          <span className="flex-1">{folder.name}</span>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </MenuSubTrigger>
        <MenuSubContent
          className="max-h-[300px] overflow-y-auto min-w-[200px]"
        >
          {isLoading ? (
            <MenuItem disabled className="text-muted-foreground text-xs">
              Loading...
            </MenuItem>
          ) : subFolders.length > 0 ? (
            subFolders.map((subFolder) => renderFolder(subFolder, level + 1))
          ) : (
            <MenuItem disabled className="text-muted-foreground text-xs">
              No subfolders
            </MenuItem>
          )}
        </MenuSubContent>
      </MenuSub>
    );
  };

  const handleRootSelect = () => {
    onSelect("/");
  };

  if (loading) {
    return (
      <MenuItem disabled>
        <span>Loading folders...</span>
      </MenuItem>
    );
  }

  return (
    <>
      <MenuItem
        onClick={handleRootSelect}
        className={cn(selectedPath === "/" && "bg-accent")}
      >
        <Folder className="h-4 w-4 text-primary" />
        <span className="flex-1">Root</span>
        {selectedPath === "/" && <Check className="h-4 w-4 text-primary" />}
      </MenuItem>
      {folders.map((folder) => renderFolder(folder, 0))}
    </>
  );
}
