"use client";

import { Button } from "@/components/ui/button";
import { Upload, FolderPlus, Trash2, Copy, Move } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface FileToolbarProps {
  onUploadClick: () => void;
  onCreateFolder: (name: string) => void;
  onDelete: () => void;
  onCopy: () => void;
  onMove: () => void;
  hasSelection: boolean;
}

export default function FileToolbar({
  onUploadClick,
  onCreateFolder,
  onDelete,
  onCopy,
  onMove,
  hasSelection,
}: FileToolbarProps) {
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      setFolderName("");
      setFolderDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        <Button onClick={onUploadClick} size="sm" className="bg-[#f2652d] hover:bg-[#f2652d]/90">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>

        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
          </DialogTrigger>
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
              <Button onClick={handleCreateFolder} className="bg-[#f2652d] hover:bg-[#f2652d]/90">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasSelection && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={onMove}>
            <Move className="mr-2 h-4 w-4" />
            Move
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

