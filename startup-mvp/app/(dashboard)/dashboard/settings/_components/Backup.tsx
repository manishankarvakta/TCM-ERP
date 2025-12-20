"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  FileArchive,
  Loader2,
  RefreshCw,
  Clock,
  Download,
  Trash2,
  RotateCcw,
  Cloud,
  Upload,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  createBackup,
  listAllBackups,
  deleteBackupFile,
  restoreBackup,
  downloadBackupFile,
  uploadAndRestoreBackup,
} from "@/app/actions/backup.action";
import type { BackupMetadata } from "@/lib/backup";
import { formatFileSize } from "@/lib/utils";
import { format } from "date-fns";

type BackupType = "database" | "files" | "full";

interface BackupListData {
  database: BackupMetadata[];
  files: BackupMetadata[];
  full: BackupMetadata[];
}

export default function Backup() {
  const { toast } = useToast();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [backups, setBackups] = useState<BackupListData>({
    database: [],
    files: [],
    full: [],
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<{
    type: BackupType;
    filename: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{
    stage: string;
    progress: number;
    details?: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingType, setIsDetectingType] = useState(false);
  const [detectedBackupType, setDetectedBackupType] = useState<BackupType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<{
    backupType: BackupType;
    databaseRecords?: number;
    filesRestored?: number;
    errors?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      const result = await listAllBackups();
      if (result.success && result.data) {
        setBackups(result.data);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load backups",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load backups",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBackups(false);
    }
  }, [toast]);

  // Load backups on mount
  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async (type: BackupType) => {
    setIsCreatingBackup(true);
    try {
      const result = await createBackup(type);

      if (!result.success) {
        throw new Error(result.error || "Failed to create backup");
      }

      toast({
        title: "Backup Created",
        description: `Backup "${result.data?.filename}" created successfully.`,
      });

      // Reload backups list
      await loadBackups();
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: error instanceof Error ? error.message : "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownload = async (type: BackupType, filename: string) => {
    setIsDownloading(filename);
    try {
      // Use server action to download backup
      const result = await downloadBackupFile(type, filename);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to download backup");
      }

      // Convert base64 string to blob
      const base64Data = result.data.data;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.data.mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading backup "${filename}"...`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download backup",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDeleteClick = (type: BackupType, filename: string) => {
    setSelectedBackup({ type, filename });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBackup) return;

    setIsDeleting(true);
    try {
      const result = await deleteBackupFile(selectedBackup.type, selectedBackup.filename);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete backup");
      }

      toast({
        title: "Backup Deleted",
        description: `Backup "${selectedBackup.filename}" deleted successfully.`,
      });

      // Reload backups list
      await loadBackups();
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete backup",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreClick = (type: BackupType, filename: string) => {
    setSelectedBackup({ type, filename });
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return;

    setIsRestoring(true);
    setRestoreProgress({ stage: "Initializing", progress: 0 });

    try {
      // Simulate progress updates (since server actions don't support streaming progress)
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => {
          if (!prev) return prev;
          const newProgress = Math.min(prev.progress + 5, 90);
          let stage = prev.stage;
          const details = prev.details;

          if (newProgress < 30) {
            stage = "Reading backup file...";
          } else if (newProgress < 60) {
            stage = selectedBackup.type === "database" 
              ? "Restoring database records..." 
              : "Extracting files...";
          } else if (newProgress < 90) {
            stage = selectedBackup.type === "files" || selectedBackup.type === "full"
              ? "Uploading files to storage..."
              : "Processing database...";
          }

          return { stage, progress: newProgress, details };
        });
      }, 500);

      const result = await restoreBackup(selectedBackup.type, selectedBackup.filename);

      clearInterval(progressInterval);
      setRestoreProgress({ stage: "Completing", progress: 100 });

      if (!result.success) {
        throw new Error(result.error || "Failed to restore backup");
      }

      // Build success message with details
      const details: string[] = [];
      if (result.data?.databaseRecords !== undefined) {
        details.push(`${result.data.databaseRecords} database records restored`);
      }
      if (result.data?.filesRestored !== undefined) {
        details.push(`${result.data.filesRestored} files restored`);
      }
      if (result.data?.errors && result.data.errors > 0) {
        details.push(`${result.data.errors} errors encountered`);
      }

      toast({
        title: "Restore Completed",
        description: `Successfully restored from backup "${selectedBackup.filename}". ${details.join(", ")}`,
      });

      // Reload backups list
      await loadBackups();
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      setRestoreProgress(null);
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore backup",
        variant: "destructive",
      });
      setRestoreProgress(null);
    } finally {
      setIsRestoring(false);
    }
  };

  // Upload and restore handlers
  const detectBackupTypeFromFile = async (file: File): Promise<BackupType> => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".sql")) {
      return "database";
    } else if (fileName.endsWith(".zip")) {
      // For ZIP files, we'll let the server determine if it's "files" or "full"
      // by checking the contents. For now, we'll default to "files" and the server
      // will detect if it's actually a "full" backup.
      try {
        // Try to detect full backup by reading ZIP contents in browser
        const JSZip = (await import("jszip")).default;
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const hasDatabaseSql = zip.file("database.sql") !== null;
        const hasFilesZip = zip.file("files.zip") !== null;
        if (hasDatabaseSql && hasFilesZip) {
          return "full";
        }
      } catch (error) {
        console.error("Error detecting backup type:", error);
        // If detection fails, default to "files" - server will correct if needed
      }
      return "files";
    }
    throw new Error("Invalid file type");
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".sql") && !fileName.endsWith(".zip")) {
      toast({
        title: "Invalid File",
        description: "Please upload a .sql or .zip backup file",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setIsDetectingType(true);
    setShowConfirmation(false);
    setRestoreSummary(null);
    
    // Detect backup type
    try {
      const type = await detectBackupTypeFromFile(file);
      setDetectedBackupType(type);
      setIsDetectingType(false);
      // Show confirmation section
      setShowConfirmation(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to detect backup type",
        variant: "destructive",
      });
      setUploadedFile(null);
      setDetectedBackupType(null);
      setIsDetectingType(false);
      setShowConfirmation(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setDetectedBackupType(null);
    setShowConfirmation(false);
    setRestoreSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!uploadedFile || !detectedBackupType) return;

    setShowConfirmation(false);
    setIsUploading(true);
    setRestoreProgress({ stage: "Uploading file...", progress: 0 });

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => {
          if (!prev) return prev;
          const newProgress = Math.min(prev.progress + 10, 90);
          let stage = prev.stage;
          
          if (newProgress < 30) {
            stage = "Uploading file...";
          } else if (newProgress < 60) {
            stage = "Detecting backup type...";
          } else if (newProgress < 90) {
            stage = detectedBackupType === "database" 
              ? "Restoring database records..." 
              : detectedBackupType === "files"
              ? "Extracting files..."
              : "Restoring database and files...";
          }

          return { stage, progress: newProgress };
        });
      }, 300);

      const result = await uploadAndRestoreBackup(formData);

      clearInterval(progressInterval);
      setRestoreProgress({ stage: "Completing", progress: 100 });

      if (!result.success) {
        throw new Error(result.error || "Failed to restore backup");
      }

      // Store summary for success display
      setRestoreSummary({
        backupType: result.data?.backupType || detectedBackupType,
        databaseRecords: result.data?.databaseRecords,
        filesRestored: result.data?.filesRestored,
        errors: result.data?.errors,
      });

      // Reload backups list
      await loadBackups();
      
      setRestoreProgress(null);
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore backup",
        variant: "destructive",
      });
      setRestoreProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetUpload = () => {
    // Reset upload state
    setUploadedFile(null);
    setDetectedBackupType(null);
    setShowConfirmation(false);
    setRestoreSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderBackupList = (type: BackupType, backupsList: BackupMetadata[]) => {
    if (backupsList.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No {type} backups yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {backupsList.map((backup) => (
          <div
            key={backup.filename}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {type === "database" && <Database className="h-4 w-4 text-muted-foreground" />}
                {type === "files" && <FileArchive className="h-4 w-4 text-muted-foreground" />}
                {type === "full" && <RefreshCw className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium text-sm truncate">{backup.filename}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{format(backup.createdAt, "MMM dd, yyyy HH:mm")}</span>
                <span>•</span>
                <span>{formatFileSize(backup.size)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(type, backup.filename)}
                disabled={isDownloading === backup.filename}
                className="h-8"
                title="Download backup"
              >
                {isDownloading === backup.filename ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRestoreClick(type, backup.filename)}
                disabled={isRestoring}
                className="h-8"
                title="Restore from backup"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(type, backup.filename)}
                disabled={isDeleting}
                className="h-8 text-destructive hover:text-destructive"
                title="Delete backup"
              >
                {isDeleting && selectedBackup?.filename === backup.filename ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const allBackups = [...backups.database, ...backups.files, ...backups.full];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Backup</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage backups of your database and files
        </p>
      </div>

      {/* Manual Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Backup</CardTitle>
          <CardDescription>
            Create a backup of your database, files, or both
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleCreateBackup("database")}
              disabled={isCreatingBackup}
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
            >
              {isCreatingBackup ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Database className="h-5 w-5" />
              )}
              <span>Database Backup</span>
              <span className="text-xs text-muted-foreground">
                Export PostgreSQL data
              </span>
            </Button>

            <Button
              onClick={() => handleCreateBackup("files")}
              disabled={isCreatingBackup}
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
            >
              {isCreatingBackup ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileArchive className="h-5 w-5" />
              )}
              <span>Files Backup</span>
              <span className="text-xs text-muted-foreground">
                Export MinIO storage
              </span>
            </Button>

            <Button
              onClick={() => handleCreateBackup("full")}
              disabled={isCreatingBackup}
              variant="default"
              className="h-auto flex-col gap-2 py-4"
            >
              {isCreatingBackup ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              <span>Full Backup</span>
              <span className="text-xs text-muted-foreground">
                Database + Files
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Backups</CardTitle>
          <CardDescription>
            Schedule automatic backups to run at regular intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-backup">Enable Automatic Backups</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create backups at scheduled intervals
              </p>
            </div>
            <Switch
              id="auto-backup"
              checked={autoBackupEnabled}
              onCheckedChange={setAutoBackupEnabled}
            />
          </div>

          {autoBackupEnabled && (
            <div className="space-y-2 pl-6 border-l-2">
              <Label htmlFor="backup-frequency">Backup Frequency</Label>
              <select
                id="backup-frequency"
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Backups will be created automatically at the selected interval
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload and Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload and Restore</CardTitle>
          <CardDescription>
            Upload a backup file (.sql or .zip) to restore your database or files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadedFile ? (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[150px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 bg-muted/50"
                }`}
              >
                <Cloud className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">
                  Drag and drop a backup file here, or click to browse
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Supported formats: .sql (database) or .zip (files/full backup)
                </p>
                <Button type="button" variant="outline" onClick={handleBrowseClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  accept=".sql,.zip"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {isDetectingType ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : detectedBackupType === "database" ? (
                        <Database className="h-5 w-5 text-muted-foreground" />
                      ) : detectedBackupType === "files" ? (
                        <FileArchive className="h-5 w-5 text-muted-foreground" />
                      ) : detectedBackupType === "full" ? (
                        <RefreshCw className="h-5 w-5 text-muted-foreground" />
                      ) : null}
                      <span className="font-medium truncate">{uploadedFile.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(uploadedFile.size)}</span>
                      {isDetectingType && (
                        <span>• Detecting backup type...</span>
                      )}
                      {detectedBackupType && !isDetectingType && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{detectedBackupType} backup detected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isUploading || isDetectingType}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Confirmation Section */}
              {showConfirmation && detectedBackupType && !isDetectingType && !isUploading && !restoreSummary && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2 mt-0.5">
                      <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold mb-1">Confirm Restore</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        You are about to restore from the uploaded backup file. This action will overwrite existing data and cannot be undone.
                      </p>
                      
                      <div className="rounded-lg border bg-background p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {detectedBackupType === "database" && (
                            <Database className="h-4 w-4 text-muted-foreground" />
                          )}
                          {detectedBackupType === "files" && (
                            <FileArchive className="h-4 w-4 text-muted-foreground" />
                          )}
                          {detectedBackupType === "full" && (
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium capitalize">{detectedBackupType} Backup</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center justify-between">
                            <span>File:</span>
                            <span className="font-medium">{uploadedFile.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Size:</span>
                            <span className="font-medium">{formatFileSize(uploadedFile.size)}</span>
                          </div>
                          {detectedBackupType === "database" && (
                            <p className="mt-2 pt-2 border-t text-muted-foreground">
                              This will restore all database records from the SQL file.
                            </p>
                          )}
                          {detectedBackupType === "files" && (
                            <p className="mt-2 pt-2 border-t text-muted-foreground">
                              This will restore all files from the ZIP archive to MinIO storage.
                            </p>
                          )}
                          {detectedBackupType === "full" && (
                            <p className="mt-2 pt-2 border-t text-muted-foreground">
                              This will restore both database records and files from the backup.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleConfirmRestore}
                      className="flex-1"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Confirm & Restore
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRemoveFile}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Restore Progress */}
              {restoreProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{restoreProgress.stage}</span>
                    <span className="font-medium">{restoreProgress.progress}%</span>
                  </div>
                  <Progress value={restoreProgress.progress} className="h-2" />
                </div>
              )}

              {/* Success Summary */}
              {restoreSummary && !isUploading && (
                <div className={`rounded-lg border p-4 space-y-4 ${
                  (restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0 && !restoreSummary.errors) ||
                  (restoreSummary.errors && restoreSummary.errors > 0)
                    ? "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20"
                    : "border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 mt-0.5 ${
                      (restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0 && !restoreSummary.errors) ||
                      (restoreSummary.errors && restoreSummary.errors > 0)
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-green-100 dark:bg-green-900/30"
                    }`}>
                      <RotateCcw className={`h-5 w-5 ${
                        (restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0 && !restoreSummary.errors) ||
                        (restoreSummary.errors && restoreSummary.errors > 0)
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-green-600 dark:text-green-400"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold mb-1 ${
                        (restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0 && !restoreSummary.errors) ||
                        (restoreSummary.errors && restoreSummary.errors > 0)
                          ? "text-amber-900 dark:text-amber-100"
                          : "text-green-900 dark:text-green-100"
                      }`}>
                        {restoreSummary.errors && restoreSummary.errors > 0
                          ? "Restore Completed with Errors"
                          : (restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0)
                          ? "Restore Completed - No Data Found"
                          : "Restore Completed Successfully"}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {restoreSummary.errors && restoreSummary.errors > 0
                          ? "The restore process completed but encountered some errors. Please check the details below."
                          : (restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0)
                          ? "The backup file was processed, but no data was found to restore. The backup file may be empty or contain no records."
                          : "Your backup has been restored successfully. Here's a summary of what was restored:"}
                      </p>
                      
                      <div className="rounded-lg border bg-background p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          {restoreSummary.backupType === "database" && (
                            <Database className="h-4 w-4 text-muted-foreground" />
                          )}
                          {restoreSummary.backupType === "files" && (
                            <FileArchive className="h-4 w-4 text-muted-foreground" />
                          )}
                          {restoreSummary.backupType === "full" && (
                            <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {restoreSummary.backupType} Backup Restored
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          {restoreSummary.databaseRecords !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Database Records:</span>
                              <span className={`font-medium ${
                                restoreSummary.databaseRecords === 0 ? "text-amber-600 dark:text-amber-400" : ""
                              }`}>
                                {restoreSummary.databaseRecords.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {restoreSummary.filesRestored !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Files Restored:</span>
                              <span className={`font-medium ${
                                restoreSummary.filesRestored === 0 ? "text-amber-600 dark:text-amber-400" : ""
                              }`}>
                                {restoreSummary.filesRestored.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {restoreSummary.errors !== undefined && restoreSummary.errors > 0 && (
                            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                              <span>Errors Encountered:</span>
                              <span className="font-medium">{restoreSummary.errors}</span>
                            </div>
                          )}
                          {(!restoreSummary.errors || restoreSummary.errors === 0) && 
                           (restoreSummary.databaseRecords !== 0 || restoreSummary.filesRestored !== 0) && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                ✓ All operations completed without errors
                              </p>
                            </div>
                          )}
                          {restoreSummary.databaseRecords === 0 && restoreSummary.filesRestored === 0 && !restoreSummary.errors && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                ⚠ No data was restored. The backup file may be empty or contain no records.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleResetUpload}
                    className="w-full"
                    variant="outline"
                  >
                    Upload Another Backup
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>
                View, download, restore, or delete previous backups
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBackups}
              disabled={isLoadingBackups}
            >
              {isLoadingBackups ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : allBackups.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No backups yet</p>
              <p className="text-xs mt-1">Create your first backup to see it here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {backups.database.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Backups ({backups.database.length})
                  </h3>
                  {renderBackupList("database", backups.database)}
                </div>
              )}

              {backups.files.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileArchive className="h-4 w-4" />
                    Files Backups ({backups.files.length})
                  </h3>
                  {renderBackupList("files", backups.files)}
                </div>
              )}

              {backups.full.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Full Backups ({backups.full.length})
                  </h3>
                  {renderBackupList("full", backups.full)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Information */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Database className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Database Backup</p>
              <p className="text-muted-foreground">
                Includes all PostgreSQL data, tables, and records. Exported as SQL dump file.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileArchive className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Files Backup</p>
              <p className="text-muted-foreground">
                Includes all files stored in MinIO object storage. Exported as ZIP archive.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RefreshCw className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Full Backup</p>
              <p className="text-muted-foreground">
                Complete backup including both database and files. Recommended for system migrations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedBackup?.filename}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={(open) => {
        if (!open && !isRestoring) {
          setRestoreDialogOpen(false);
          setRestoreProgress(null);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore from &quot;{selectedBackup?.filename}&quot;? This will overwrite existing data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {restoreProgress && (
            <div className="space-y-2 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{restoreProgress.stage}</span>
                <span className="font-medium">{restoreProgress.progress}%</span>
              </div>
              <Progress value={restoreProgress.progress} className="h-2" />
              {restoreProgress.details && (
                <p className="text-xs text-muted-foreground">{restoreProgress.details}</p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
