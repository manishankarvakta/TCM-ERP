"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchDeviceUserSyncPreview, generateMissingDeviceUserMappings, queueSingleUserInfoSyncTest } from "../_actions/device-sync.action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Rocket } from "lucide-react";

export default function UserSyncPreview({ deviceId }: { deviceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<any>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPreview = () => {
    startTransition(async () => {
      const res = await fetchDeviceUserSyncPreview(deviceId);
      if (res.success) {
        setPreview((res as any).preview);
      } else {
        toast({ variant: "destructive", title: "Failed to load preview", description: res.error });
      }
    });
  };

  const createMappings = () => {
    startTransition(async () => {
      const res = await generateMissingDeviceUserMappings(deviceId);
      if (res.success) {
        toast({ title: "Mappings Created", description: (res as any).message });
        loadPreview();
      } else {
        toast({ variant: "destructive", title: "Action Failed", description: res.error });
      }
    });
  };

  const handleQueueTestSync = () => {
    if (!selectedEmployeeId) return;
    startTransition(async () => {
      const res = await queueSingleUserInfoSyncTest({ deviceId, employeeId: selectedEmployeeId });
      if (res.success) {
        toast({ title: "Command Queued", description: (res as any).message });
        loadPreview();
      } else {
        toast({ variant: "destructive", title: "Action Failed", description: res.error });
      }
    });
  };

  useEffect(() => {
    loadPreview();
  }, [deviceId]);

  if (!preview && isPending) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-6 h-6" /></div>;
  }

  if (!preview) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="p-4 border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold">{preview.totalEmployees}</p>
        </div>
        <div className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/10">
          <p className="text-sm text-muted-foreground">Ready for Sync</p>
          <p className="text-2xl font-bold text-green-600">{preview.readyCount}</p>
        </div>
        <div className="p-4 border rounded-lg bg-red-50/50 dark:bg-red-900/10">
          <p className="text-sm text-muted-foreground">Blocked / Invalid</p>
          <p className="text-2xl font-bold text-red-600">{preview.blockedCount}</p>
        </div>
        <div className="p-4 border rounded-lg flex flex-col justify-center gap-2">
          <Button variant="outline" size="sm" onClick={loadPreview} disabled={isPending}>
            Refresh Preview
          </Button>
          <Button size="sm" onClick={createMappings} disabled={isPending || preview.readyCount === 0}>
            Create Missing Mappings
          </Button>
        </div>
      </div>

      <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Rocket className="w-4 h-4" /> Phase 3B Single-User Sync Test
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            Select one READY or ALREADY_MAPPED employee below to safely test the DATA UPDATE USERINFO command.
          </p>
        </div>
        <Button 
          onClick={handleQueueTestSync} 
          disabled={!selectedEmployeeId || isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Queue Single User Test Sync
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]">Select</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Device User ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dry-Run Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((row: any) => (
              <TableRow key={row.employeeId} className={selectedEmployeeId === row.employeeId ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}>
                <TableCell>
                  <input 
                    type="radio" 
                    name="employee-sync-select"
                    checked={selectedEmployeeId === row.employeeId}
                    onChange={() => setSelectedEmployeeId(row.employeeId)}
                    disabled={row.status === "NOT_READY" || row.status === "DUPLICATE"}
                    className="w-4 h-4"
                  />
                </TableCell>
                <TableCell>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {row.deviceUserId}
                </TableCell>
                <TableCell>
                  {row.status === "READY" && <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> READY</Badge>}
                  {row.status === "ALREADY_MAPPED" && <Badge variant="secondary">ALREADY MAPPED</Badge>}
                  {row.status === "NOT_READY" && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> NOT READY</Badge>}
                  {row.status === "DUPLICATE" && <Badge variant="destructive" className="bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3 mr-1" /> DUPLICATE</Badge>}
                  
                  {row.blockers.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      {row.blockers.map((b: string, i: number) => <div key={i}>• {b}</div>)}
                    </div>
                  )}
                  {row.warnings.length > 0 && (
                    <div className="mt-2 text-xs text-orange-600">
                      {row.warnings.map((w: string, i: number) => <div key={i}>• {w}</div>)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-[300px]">
                  {row.dryRunCommandText ? (
                    <code className="text-xs bg-muted p-1 rounded break-all">
                      {row.dryRunCommandText}
                    </code>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {preview.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No active employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded-lg text-sm border border-orange-200 dark:border-orange-900">
        <AlertTriangle className="w-4 h-4 inline mr-2 -mt-0.5" />
        <strong>DRY RUN MODE:</strong> Bulk real device user sync is currently disabled (<code>BIOMETRIC_USER_SYNC_ENABLED=false</code>). 
        You may only use the Phase 3B Single-User Test to safely verify command execution.
      </div>
    </div>
  );
}
