/**
 * Backup & Restore Settings Page
 * 
 * New implementation with streamlined UI and real-time progress tracking
 */

"use client";

import { useState, useEffect } from 'react';
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
  Plus,
  Edit2,
  Settings,
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBackups } from '@/hooks/useBackups';
import { useRestore } from '@/hooks/useRestore';
import { RestoreProgressModal } from '@/components/backup/RestoreProgressModal';
import { BackupUploadZone } from '@/components/backup/BackupUploadZone';
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

  const { progress, isRestoring, startRestore, cancelRestore } = useRestore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupListItem | null>(null);

  // Automatic Backup Scheduler State
  const [schedule, setSchedule] = useState({
    autoBackup: false,
    frequency: 'Day',
    time: '02:00',
    backupType: 'full',
    syncToDrive: false,
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Google Drive Configurations State
  const [driveConfigs, setDriveConfigs] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [editingDriveId, setEditingDriveId] = useState<string | null>(null);
  const [driveForm, setDriveForm] = useState({
    name: '',
    folderId: '',
    serviceAccountJson: '',
    isActive: false,
  });

  // Telegram Configurations State
  const [telegramConfigs, setTelegramConfigs] = useState<any[]>([]);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [showTelegramForm, setShowTelegramForm] = useState(false);
  const [editingTelegramId, setEditingTelegramId] = useState<string | null>(null);
  const [telegramForm, setTelegramForm] = useState({
    name: '',
    botToken: '',
    chatId: '',
    isActive: false,
  });

  // Fetch Scheduler settings
  const fetchScheduleSettings = async () => {
    try {
      const res = await fetch('/api/backup/settings');
      if (res.ok) {
        const data = await res.json();
        setSchedule({
          autoBackup: data.autoBackup ?? false,
          frequency: data.frequency ?? 'Day',
          time: data.time ?? '02:00',
          backupType: data.backupType ?? 'full',
          syncToDrive: data.syncToDrive ?? false,
        });
      }
    } catch (e) {
      console.error('Failed to fetch schedule settings', e);
    }
  };

  // Fetch Drive configs
  const fetchDriveConfigs = async () => {
    setLoadingDrive(true);
    try {
      const res = await fetch('/api/backup/drive-config');
      if (res.ok) {
        const data = await res.json();
        setDriveConfigs(data);
      }
    } catch (e) {
      console.error('Failed to fetch drive configs', e);
    } finally {
      setLoadingDrive(false);
    }
  };

  // Fetch Telegram configs
  const fetchTelegramConfigs = async () => {
    setLoadingTelegram(true);
    try {
      const res = await fetch('/api/backup/telegram-config');
      if (res.ok) {
        const data = await res.json();
        setTelegramConfigs(data);
      }
    } catch (e) {
      console.error('Failed to fetch telegram configs', e);
    } finally {
      setLoadingTelegram(false);
    }
  };

  useEffect(() => {
    fetchScheduleSettings();
    fetchDriveConfigs();
    fetchTelegramConfigs();
  }, []);

  // Save Schedule settings
  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/backup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      if (res.ok) {
        toast({
          title: 'Schedule saved',
          description: 'Automatic backup schedule settings saved successfully',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (e: any) {
      toast({
        title: 'Error saving settings',
        description: e.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Save Drive configuration
  const handleSaveDriveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/backup/drive-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDriveId,
          ...driveForm,
        }),
      });
      if (res.ok) {
        toast({
          title: editingDriveId ? 'Configuration updated' : 'Configuration created',
          description: 'Google Drive configuration saved successfully',
        });
        setDriveForm({ name: '', folderId: '', serviceAccountJson: '', isActive: false });
        setEditingDriveId(null);
        setShowDriveForm(false);
        await fetchDriveConfigs();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (e: any) {
      toast({
        title: 'Error saving configuration',
        description: e.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  };

  // Delete Drive configuration
  const handleDeleteDriveConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      const res = await fetch(`/api/backup/drive-config/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({
          title: 'Configuration deleted',
          description: 'Google Drive configuration deleted successfully',
        });
        await fetchDriveConfigs();
      } else {
        throw new Error('Failed to delete configuration');
      }
    } catch (e: any) {
      toast({
        title: 'Delete failed',
        description: e.message || 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  };

  // Save Telegram configuration
  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/backup/telegram-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTelegramId,
          ...telegramForm,
        }),
      });
      if (res.ok) {
        toast({
          title: editingTelegramId ? 'Configuration updated' : 'Configuration created',
          description: 'Telegram configuration saved successfully',
        });
        setTelegramForm({ name: '', botToken: '', chatId: '', isActive: false });
        setEditingTelegramId(null);
        setShowTelegramForm(false);
        await fetchTelegramConfigs();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (e: any) {
      toast({
        title: 'Error saving configuration',
        description: e.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  };

  // Delete Telegram configuration
  const handleDeleteTelegramConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      const res = await fetch(`/api/backup/telegram-config/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({
          title: 'Configuration deleted',
          description: 'Telegram configuration deleted successfully',
        });
        await fetchTelegramConfigs();
      } else {
        throw new Error('Failed to delete configuration');
      }
    } catch (e: any) {
      toast({
        title: 'Delete failed',
        description: e.message || 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  };

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

      {/* Automatic Backup Scheduler Panel */}
      <Card className="border border-muted-foreground/10 shadow-sm bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Automatic Backup Schedule
          </CardTitle>
          <CardDescription>Configure automatic backups to protect your data</CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Switch
                id="autoBackup"
                checked={schedule.autoBackup}
                onCheckedChange={(checked) => setSchedule((prev) => ({ ...prev, autoBackup: checked }))}
              />
              <Label htmlFor="autoBackup" className="font-semibold text-foreground/90 mr-2 cursor-pointer">
                Auto Backup
              </Label>
            </div>

            {schedule.autoBackup && (
              <>
                <span className="text-muted-foreground">Every</span>
                <Select
                  value={schedule.frequency}
                  onValueChange={(val) => setSchedule((prev) => ({ ...prev, frequency: val }))}
                >
                  <SelectTrigger className="w-[100px] h-9 bg-background/50 border-muted-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Week">Week</SelectItem>
                    <SelectItem value="Month">Month</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">at</span>
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, time: e.target.value }))}
                  className="h-9 px-3 py-1 bg-background border border-muted-foreground/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all"
                />

                <span className="text-muted-foreground">taking</span>
                <Select
                  value={schedule.backupType}
                  onValueChange={(val) => setSchedule((prev) => ({ ...prev, backupType: val }))}
                >
                  <SelectTrigger className="w-[120px] h-9 bg-background/50 border-muted-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="files">Files</SelectItem>
                    <SelectItem value="full">Full Backup</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">backup</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="flex items-center gap-2">
              <Switch
                id="syncToDrive"
                checked={schedule.syncToDrive}
                onCheckedChange={(checked) => setSchedule((prev) => ({ ...prev, syncToDrive: checked }))}
              />
              <Label htmlFor="syncToDrive" className="font-semibold text-foreground/90 cursor-pointer">
                Sync to Drive
              </Label>
            </div>

            <Button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              size="sm"
              className="bg-primary/95 hover:bg-primary text-primary-foreground font-semibold px-4 shadow-sm h-9"
            >
              {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup Section */}
      <Card className="border border-muted-foreground/10 shadow-sm">
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
              className="h-auto py-5 flex flex-col gap-2 bg-card hover:bg-muted/30 border border-muted-foreground/10 transition-all rounded-xl"
            >
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Database className="h-6 w-6 text-primary/80" />
              )}
              <span className="font-semibold">Database</span>
              <span className="text-xs text-muted-foreground">
                Backup database only
              </span>
            </Button>

            {/* Files Backup */}
            <Button
              onClick={() => handleCreateBackup('files')}
              disabled={creating || loading}
              variant="outline"
              className="h-auto py-5 flex flex-col gap-2 bg-card hover:bg-muted/30 border border-muted-foreground/10 transition-all rounded-xl"
            >
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Files className="h-6 w-6 text-primary/80" />
              )}
              <span className="font-semibold">Files</span>
              <span className="text-xs text-muted-foreground">
                Backup files only
              </span>
            </Button>

            {/* Full Backup */}
            <Button
              onClick={() => handleCreateBackup('full')}
              disabled={creating || loading}
              variant="outline"
              className="h-auto py-5 flex flex-col gap-2 bg-card hover:bg-muted/30 border border-muted-foreground/10 transition-all rounded-xl"
            >
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <HardDrive className="h-6 w-6 text-primary/80" />
              )}
              <span className="font-semibold">Full Backup</span>
              <span className="text-xs text-muted-foreground">
                Database + Files
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Backup Section */}
      <Card className="border border-muted-foreground/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
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
      <Card className="border border-muted-foreground/10 shadow-sm bg-card/20">
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
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="all">All ({backups.length})</TabsTrigger>
                <TabsTrigger value="database">Database ({databaseBackups.length})</TabsTrigger>
                <TabsTrigger value="files">Files ({filesBackups.length})</TabsTrigger>
                <TabsTrigger value="full">Full ({fullBackups.length})</TabsTrigger>
                <TabsTrigger value="drive">Drive Settings</TabsTrigger>
                <TabsTrigger value="telegram">Telegram Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
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

              <TabsContent value="database" className="space-y-3">
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

              <TabsContent value="files" className="space-y-3">
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

              <TabsContent value="full" className="space-y-3">
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

              {/* Google Drive Configuration Tab */}
              <TabsContent value="drive" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-foreground/90">Google Drive Service Accounts</h3>
                  {!showDriveForm && (
                    <Button
                      onClick={() => {
                        setEditingDriveId(null);
                        setDriveForm({ name: '', folderId: '', serviceAccountJson: '', isActive: false });
                        setShowDriveForm(true);
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Configuration
                    </Button>
                  )}
                </div>

                {showDriveForm && (
                  <Card className="border border-muted-foreground/10 bg-muted/10 shadow-inner">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-semibold">
                        {editingDriveId ? "Edit Drive Configuration" : "New Drive Configuration"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form onSubmit={handleSaveDriveConfig} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Configuration Name</Label>
                            <Input
                              required
                              placeholder="e.g. Production Drive Storage"
                              value={driveForm.name}
                              onChange={(e) => setDriveForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Folder ID</Label>
                            <Input
                              required
                              placeholder="Google Drive Folder ID"
                              value={driveForm.folderId}
                              onChange={(e) => setDriveForm((prev) => ({ ...prev, folderId: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Service Account Credentials JSON</Label>
                          <textarea
                            required
                            rows={6}
                            placeholder='{"type": "service_account", ...}'
                            value={driveForm.serviceAccountJson}
                            onChange={(e) => setDriveForm((prev) => ({ ...prev, serviceAccountJson: e.target.value }))}
                            className="w-full font-mono text-xs p-3 bg-background hover:bg-background/80 border border-muted-foreground/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            id="driveActive"
                            checked={driveForm.isActive}
                            onCheckedChange={(checked) => setDriveForm((prev) => ({ ...prev, isActive: checked }))}
                          />
                          <Label htmlFor="driveActive" className="text-xs font-semibold cursor-pointer">
                            Set as Active Configuration
                          </Label>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowDriveForm(false);
                              setEditingDriveId(null);
                            }}
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" size="sm">
                            Save Configuration
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {loadingDrive ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : driveConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p>No Google Drive configurations configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {driveConfigs.map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/60">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{config.name}</span>
                            {config.isActive && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px]">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Folder ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">{config.folderId}</code></p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingDriveId(config.id);
                              setDriveForm({
                                name: config.name,
                                folderId: config.folderId,
                                serviceAccountJson: config.serviceAccountJson,
                                isActive: config.isActive,
                              });
                              setShowDriveForm(true);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteDriveConfig(config.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Telegram Configurations Tab */}
              <TabsContent value="telegram" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-foreground/90">Telegram Notification Channels</h3>
                  {!showTelegramForm && (
                    <Button
                      onClick={() => {
                        setEditingTelegramId(null);
                        setTelegramForm({ name: '', botToken: '', chatId: '', isActive: false });
                        setShowTelegramForm(true);
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Configuration
                    </Button>
                  )}
                </div>

                {showTelegramForm && (
                  <Card className="border border-muted-foreground/10 bg-muted/10 shadow-inner">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-semibold">
                        {editingTelegramId ? "Edit Telegram Configuration" : "New Telegram Configuration"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form onSubmit={handleSaveTelegramConfig} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Configuration Name</Label>
                          <Input
                            required
                            placeholder="e.g. Telegram Channel Alerts"
                            value={telegramForm.name}
                            onChange={(e) => setTelegramForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Bot Token</Label>
                            <Input
                              required
                              placeholder="7754866323:AAF6..."
                              value={telegramForm.botToken}
                              onChange={(e) => setTelegramForm((prev) => ({ ...prev, botToken: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Chat ID</Label>
                            <Input
                              required
                              placeholder="877939799"
                              value={telegramForm.chatId}
                              onChange={(e) => setTelegramForm((prev) => ({ ...prev, chatId: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            id="telegramActive"
                            checked={telegramForm.isActive}
                            onCheckedChange={(checked) => setTelegramForm((prev) => ({ ...prev, isActive: checked }))}
                          />
                          <Label htmlFor="telegramActive" className="text-xs font-semibold cursor-pointer">
                            Set as Active Configuration
                          </Label>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowTelegramForm(false);
                              setEditingTelegramId(null);
                            }}
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" size="sm">
                            Save Configuration
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {loadingTelegram ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : telegramConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p>No Telegram notification channels configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {telegramConfigs.map((config) => (
                      <div key={config.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/60">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{config.name}</span>
                            {config.isActive && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px]">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Chat ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">{config.chatId}</code></p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingTelegramId(config.id);
                              setTelegramForm({
                                name: config.name,
                                botToken: config.botToken,
                                chatId: config.chatId,
                                isActive: config.isActive,
                              });
                              setShowTelegramForm(true);
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTelegramConfig(config.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <span className="font-medium text-foreground">{selectedBackup?.metadata.id}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBackup} className="bg-destructive hover:bg-destructive/90 text-white">
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
              <span className="font-medium text-foreground">{selectedBackup?.metadata.id}</span>
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
          cancelRestore();
          fetchBackups();
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
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-1 text-primary">{getIcon(backup.metadata.type)}</div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm truncate max-w-[250px] sm:max-w-md">{backup.metadata.id}.zip</p>
            <Badge variant={getStatusVariant(backup.status)} className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize">
              {backup.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize">
              {backup.metadata.type}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/80 font-medium">
            <span>{formatBytes(backup.fileSize || backup.metadata.size)}</span>
            <span>{format(new Date(backup.metadata.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onDownload}
          variant="ghost"
          size="sm"
          title="Download backup"
          className="hover:bg-muted"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={onRestore}
          variant="ghost"
          size="sm"
          title="Restore from this backup"
          disabled={backup.status === 'corrupted'}
          className="hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          title="Delete backup"
          className="hover:bg-muted text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
