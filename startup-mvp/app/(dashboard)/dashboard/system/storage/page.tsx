"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Database, ShieldCheck, RefreshCw, Download, FileArchive, Plus, CheckCircle2, Lock, CloudUpload } from "lucide-react";
import { getStorageMetrics, triggerManualSystemBackup } from "@/app/actions/system-operations.action";
import { toast } from "sonner";

export default function StorageUsagePage() {
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);

  const fetchStorage = async () => {
    setLoading(true);
    const res = await getStorageMetrics();
    if (res.success) {
      setMetrics(res.metrics);
      setBackups(res.backups || []);
    } else {
      toast.error(res.error || "Failed to load storage telemetry");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStorage();
  }, []);

  const handleCreateBackup = async (type: "database" | "files" | "full") => {
    setCreatingBackup(true);
    toast.info(`Generating ${type} system backup with AES-256-GCM encryption...`);
    const res = await triggerManualSystemBackup(type);
    if (res.success) {
      toast.success(res.message);
      fetchStorage();
    } else {
      toast.error(res.error || "Backup generation failed");
    }
    setCreatingBackup(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">System Storage & Backup Center</h1>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              AES-256-GCM Encrypted
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage media storage allocations, database dumps, automated cloud sync, and backup archives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStorage} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Storage
          </Button>
          <Button onClick={() => handleCreateBackup("database")} disabled={creatingBackup} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Backup Database
          </Button>
          <Button onClick={() => handleCreateBackup("full")} disabled={creatingBackup} variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <FileArchive className="w-4 h-4 mr-2" />
            Create Full Backup
          </Button>
        </div>
      </div>

      {/* Storage Allocation Card */}
      <Card className="shadow-sm border-l-4 border-l-primary">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xl flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-primary" />
                Storage Quota & Utilization
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {metrics?.uploadsSizeFormatted || "0 B"} Media Uploads + {metrics?.backupsSizeFormatted || "0 B"} Backup Archives
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-foreground">{metrics?.usedPercentage || 0}%</span>
              <span className="text-xs text-muted-foreground block">of {metrics?.allocatedStorageGb || 50} GB Storage Cap</span>
            </div>
          </div>

          <Progress value={metrics?.usedPercentage || 0} className="h-3" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-muted/40 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Database className="w-4 h-4 text-blue-500" />
                Uploaded Assets
              </div>
              <p className="text-lg font-bold">{metrics?.uploadsSizeFormatted || "0 B"}</p>
              <p className="text-xs text-muted-foreground">{metrics?.totalFileCount || 0} Total Files</p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <FileArchive className="w-4 h-4 text-emerald-500" />
                System Backups
              </div>
              <p className="text-lg font-bold">{metrics?.backupsSizeFormatted || "0 B"}</p>
              <p className="text-xs text-muted-foreground">{metrics?.backupCount || 0} Zip Archives</p>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                Drive & Telegram Sync
              </div>
              <p className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Enabled
              </p>
              <p className="text-xs text-muted-foreground">Auto-Uploaded on Backup</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-primary" />
                System Backup Archives
              </CardTitle>
              <CardDescription>
                Empirical disaster recovery snapshots stored in local storage and cloud mirrors.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-y">
                <tr>
                  <th className="px-6 py-3">Filename</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3">Encryption</th>
                  <th className="px-6 py-3">Created Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No system backup archives found.
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-foreground">
                        {backup.filename || backup.id}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {backup.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {backup.sizeFormatted}
                      </td>
                      <td className="px-6 py-4">
                        {backup.encrypted ? (
                          <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 flex items-center gap-1 w-fit">
                            <Lock className="w-3 h-3" />
                            AES-256-GCM
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Standard Zip</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`/api/backup/${backup.id}`}
                          download
                          className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium border rounded-md hover:bg-muted"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

