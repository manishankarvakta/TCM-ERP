/**
 * Backup & Restore Settings Page
 * 
 * New implementation with streamlined UI and real-time progress tracking
 */

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  Files,
  HardDrive,
  RefreshCw,
  Download,
  Trash2,
  RotateCcw,
  Upload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBackups } from '@/hooks/useBackups';
import { useRestore } from '@/hooks/useRestore';
import { RestoreProgressModal } from '@/components/backup/RestoreProgressModal';
import { BackupUploadZone } from '@/components/backup/BackupUploadZone';
import { AutoBackupTimeCard } from './AutoBackupTimeCard';
import { DriveSettingsForm } from './DriveSettingsForm';
import type { BackupListItem, BackupType } from '@/types/backup';
import { format } from 'date-fns';

export default function Backup() {
  const { toast } = useToast();
  const {
    backups,
    loading,
    error: backupsError,
    creating,
    uploading,
    fetchBackups,
    createBackup,
    deleteBackup,
    downloadBackup,
    uploadBackup,
  } = useBackups();

  const { progress, isRestoring, startRestore } = useRestore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupListItem | null>(null);

  // Handle backup creation
  const handleCreateBackup = async (type: BackupType) => {
    try {
      await createBackup(type);
      toast({
        title: 'Backup created',
        description: `${type} backup created successfully`,
      });
    } catch (error) {
      toast({
        title: 'Backup failed',
        description: error instanceof Error ? error.message : 'Failed to create backup',
        variant: 'destructive',
      });
    }
  };

  // Handle backup deletion
  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;

    try {
      await deleteBackup(selectedBackup.metadata.id);
      toast({
        title: 'Backup deleted',
        description: 'Backup file has been deleted',
      });
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete backup',
        variant: 'destructive',
      });
    }
  };

  // Handle backup restore
  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    setRestoreDialogOpen(false);

    try {
      await startRestore(selectedBackup.metadata.id);
    } catch (error) {
      toast({
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'Failed to start restore',
        variant: 'destructive',
      });
    }
  };

  // Handle backup upload
  const handleUploadBackup = async (file: File) => {
    try {
      await uploadBackup(file);
      toast({
        title: 'Backup uploaded',
        description: 'Backup file has been uploaded successfully',
      });
    } catch (error) {
      // Error is handled in the component
      throw error;
    }
  };

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Get backup type icon
  const getBackupTypeIcon = (type: BackupType) => {
    switch (type) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'files':
        return <Files className="h-4 w-4" />;
      case 'full':
        return <HardDrive className="h-4 w-4" />;
    }
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'valid':
        return 'default';
      case 'corrupted':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Filter backups by type
  const databaseBackups = backups.filter((b) => b.metadata.type === 'database');
  const filesBackups = backups.filter((b) => b.metadata.type === 'files');
  const fullBackups = backups.filter((b) => b.metadata.type === 'full');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground">
            Manage backups and restore your data
          </p>
        </div>
        <Button
          onClick={fetchBackups}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {backupsError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error loading backups</p>
                <p className="text-sm text-muted-foreground mt-1">{backupsError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto Backup Settings Card (Top) */}
      <AutoBackupTimeCard />

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Backup</CardTitle>
          <CardDescription>
            Choose the type of backup you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database Backup */}
            <Button
              onClick={() => handleCreateBackup('database')}
              disabled={creating || loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Database className="h-6 w-6" />
              )}
              <span className="font-medium">Database</span>
              <span className="text-xs text-muted-foreground">
                Backup database only
              </span>
            </Button>

            {/* Files Backup */}
            <Button
              onClick={() => handleCreateBackup('files')}
              disabled={creating || loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Files className="h-6 w-6" />
              )}
              <span className="font-medium">Files</span>
              <span className="text-xs text-muted-foreground">
                Backup files only
              </span>
            </Button>

            {/* Full Backup */}
            <Button
              onClick={() => handleCreateBackup('full')}
              disabled={creating || loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <HardDrive className="h-6 w-6" />
              )}
              <span className="font-medium">Full Backup</span>
              <span className="text-xs text-muted-foreground">
                Database + Files
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Backup
          </CardTitle>
          <CardDescription>
            Upload an existing backup file to restore later
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupUploadZone onUpload={handleUploadBackup} uploading={uploading} />
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>
            {backups.length} backup{backups.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No backups available</p>
              <p className="text-sm mt-1">Create your first backup to get started</p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({backups.length})</TabsTrigger>
                <TabsTrigger value="database">Database ({databaseBackups.length})</TabsTrigger>
                <TabsTrigger value="files">Files ({filesBackups.length})</TabsTrigger>
                <TabsTrigger value="full">Full ({fullBackups.length})</TabsTrigger>
                <TabsTrigger value="drive">Drive Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {backups.map((backup) => (
                  <BackupItem
                    key={backup.metadata.id}
                    backup={backup}
                    onDownload={() => downloadBackup(backup.metadata.id)}
                    onDelete={() => {
                      setSelectedBackup(backup);
                      setDeleteDialogOpen(true);
                    }}
                    onRestore={() => {
                      setSelectedBackup(backup);
                      setRestoreDialogOpen(true);
                    }}
                    formatBytes={formatBytes}
                    getIcon={getBackupTypeIcon}
                    getStatusVariant={getStatusBadgeVariant}
                  />
                ))}
              </TabsContent>

              <TabsContent value="database" className="space-y-3 mt-4">
                {databaseBackups.map((backup) => (
                  <BackupItem
                    key={backup.metadata.id}
                    backup={backup}
                    onDownload={() => downloadBackup(backup.metadata.id)}
                    onDelete={() => {
                      setSelectedBackup(backup);
                      setDeleteDialogOpen(true);
                    }}
                    onRestore={() => {
                      setSelectedBackup(backup);
                      setRestoreDialogOpen(true);
                    }}
                    formatBytes={formatBytes}
                    getIcon={getBackupTypeIcon}
                    getStatusVariant={getStatusBadgeVariant}
                  />
                ))}
                {databaseBackups.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No database backups
                  </p>
                )}
              </TabsContent>

              <TabsContent value="files" className="space-y-3 mt-4">
                {filesBackups.map((backup) => (
                  <BackupItem
                    key={backup.metadata.id}
                    backup={backup}
                    onDownload={() => downloadBackup(backup.metadata.id)}
                    onDelete={() => {
                      setSelectedBackup(backup);
                      setDeleteDialogOpen(true);
                    }}
                    onRestore={() => {
                      setSelectedBackup(backup);
                      setRestoreDialogOpen(true);
                    }}
                    formatBytes={formatBytes}
                    getIcon={getBackupTypeIcon}
                    getStatusVariant={getStatusBadgeVariant}
                  />
                ))}
                {filesBackups.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No files backups
                  </p>
                )}
              </TabsContent>

              <TabsContent value="full" className="space-y-3 mt-4">
                {fullBackups.map((backup) => (
                  <BackupItem
                    key={backup.metadata.id}
                    backup={backup}
                    onDownload={() => downloadBackup(backup.metadata.id)}
                    onDelete={() => {
                      setSelectedBackup(backup);
                      setDeleteDialogOpen(true);
                    }}
                    onRestore={() => {
                      setSelectedBackup(backup);
                      setRestoreDialogOpen(true);
                    }}
                    formatBytes={formatBytes}
                    getIcon={getBackupTypeIcon}
                    getStatusVariant={getStatusBadgeVariant}
                  />
                ))}
                {fullBackups.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No full backups
                  </p>
                )}
              </TabsContent>

              <TabsContent value="drive" className="space-y-3 mt-4">
                <DriveSettingsForm />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
              <br />
              <br />
              <span className="font-medium">{selectedBackup?.metadata.id}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBackup} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your data from the selected backup. Current data will be
              replaced.
              <br />
              <br />
              A pre-restore backup will be created automatically.
              <br />
              <br />
              <span className="font-medium">{selectedBackup?.metadata.id}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreBackup}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Progress Modal */}
      <RestoreProgressModal
        open={isRestoring || !!progress}
        progress={progress}
        onClose={() => {
          // Only allow closing if restore is complete or failed
          if (progress && (progress.status === 'COMPLETED' || progress.status === 'FAILED')) {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

// Backup Item Component
interface BackupItemProps {
  backup: BackupListItem;
  onDownload: () => void;
  onDelete: () => void;
  onRestore: () => void;
  formatBytes: (bytes: number) => string;
  getIcon: (type: BackupType) => React.ReactElement;
  getStatusVariant: (status: string) => 'default' | 'destructive' | 'secondary' | 'outline';
}

function BackupItem({
  backup,
  onDownload,
  onDelete,
  onRestore,
  formatBytes,
  getIcon,
  getStatusVariant,
}: BackupItemProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-1">{getIcon(backup.metadata.type)}</div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{backup.metadata.id}</p>
            <Badge variant={getStatusVariant(backup.status)} className="text-xs">
              {backup.status}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {backup.metadata.type}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{formatBytes(backup.fileSize || backup.metadata.size)}</span>
            <span>{format(new Date(backup.metadata.timestamp), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onDownload}
          variant="ghost"
          size="sm"
          title="Download backup"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={onRestore}
          variant="ghost"
          size="sm"
          title="Restore from this backup"
          disabled={backup.status === 'corrupted'}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          title="Delete backup"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
