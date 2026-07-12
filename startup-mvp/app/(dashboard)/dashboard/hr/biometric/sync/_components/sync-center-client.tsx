"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FiRefreshCw, FiAlertCircle, FiCheckCircle, FiClock, FiFileText } from "react-icons/fi";
import Link from "next/link";
import {
  actionReprocessRawLogs,
  actionReprocessUnknownPunches,
  actionReprocessFailedSyncs,
  actionTestAdmsHistoricalQuery,
  getBiometricSyncHistoryAction
} from "../_actions/sync.action";

export default function SyncCenterClient({ devices }: { devices: any[] }) {
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  // Initialize dates to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Fetch history when device changes
  useEffect(() => {
    if (selectedDeviceId) {
      loadHistory(selectedDeviceId);
    } else {
      setHistory([]);
    }
  }, [selectedDeviceId]);

  const loadHistory = async (deviceId: string) => {
    const res = await getBiometricSyncHistoryAction(deviceId);
    if (res.success && res.history) {
      setHistory(res.history);
    }
  };

  const executeAction = async (
    actionFn: (deviceId: string, from: string, to: string) => Promise<any>,
    name: string
  ) => {
    if (!selectedDeviceId) return toast({ title: "Select a device first", variant: "destructive" });
    if (!fromDate || !toDate) return toast({ title: "Select date range", variant: "destructive" });

    setIsProcessing(true);
    setLastResult(null);
    toast({ title: "Processing...", description: `Executing ${name}...` });

    const fromDateObj = new Date(fromDate);
    fromDateObj.setHours(0, 0, 0, 0);
    const toDateObj = new Date(toDate);
    toDateObj.setHours(23, 59, 59, 999);

    const res = await actionFn(selectedDeviceId, fromDateObj.toISOString(), toDateObj.toISOString());
    
    if (res.success) {
      setLastResult({ type: name, ...res });
      toast({ title: "Success", description: res.message || `Processed ${res.processed} records.` });
      loadHistory(selectedDeviceId); // Refresh history
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const handleTestQuery = async () => {
    if (!selectedDeviceId) return toast({ title: "Select a device first", variant: "destructive" });
    setIsProcessing(true);
    
    const res = await actionTestAdmsHistoricalQuery(selectedDeviceId);
    if (res.success) {
      toast({ title: "Test Queued", description: (res as any).message });
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
          <CardDescription>Select a device and date range to reprocess or recover missing attendance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Biometric Device</label>
              <SearchableSelect
                value={selectedDeviceId}
                onValueChange={(val) => setSelectedDeviceId(val || "")}
                placeholder="Select a device..."
                options={devices.map(d => ({
                  value: d.id,
                  label: d.name,
                  description: d.serialNumber || undefined
                }))}
              />
              {selectedDevice && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${selectedDevice.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  {selectedDevice.isActive ? 'Active' : 'Inactive'} • Last ping: {selectedDevice.lastPingAt ? format(new Date(selectedDevice.lastPingAt), "MMM d, h:mm a") : "Never"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Actions Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Actions</CardTitle>
          <CardDescription>Execute safely scoped operations to recover lost or missing data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="flex flex-col space-y-2 p-4 border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">Raw Logs</h4>
              <p className="text-xs text-muted-foreground flex-1">Reprocess local raw logs inside this date range to regenerate missing attendance.</p>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isProcessing || !selectedDeviceId} 
                onClick={() => executeAction(actionReprocessRawLogs, "Reprocess Raw Logs")}
              >
                <FiRefreshCw className="mr-2 h-4 w-4" /> Reprocess
              </Button>
            </div>

            <div className="flex flex-col space-y-2 p-4 border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">Unknown Punches</h4>
              <p className="text-xs text-muted-foreground flex-1">Scan for newly mapped PINs and reprocess their historical rejected/unknown punches.</p>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isProcessing || !selectedDeviceId}
                onClick={() => executeAction(actionReprocessUnknownPunches, "Reprocess Unknown Punches")}
              >
                <FiRefreshCw className="mr-2 h-4 w-4" /> Reprocess
              </Button>
            </div>

            <div className="flex flex-col space-y-2 p-4 border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">Failed Syncs</h4>
              <p className="text-xs text-muted-foreground flex-1">Attempt to reconstruct payloads from failed background sync jobs.</p>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isProcessing || !selectedDeviceId}
                onClick={() => executeAction(actionReprocessFailedSyncs, "Reprocess Failed Syncs")}
              >
                <FiAlertCircle className="mr-2 h-4 w-4" /> Retry Failed
              </Button>
            </div>

            <div className="flex flex-col space-y-2 p-4 border rounded-md bg-blue-50/50">
              <h4 className="font-semibold text-sm text-blue-700">Test ADMS Query</h4>
              <p className="text-xs text-blue-600/70 flex-1">Queue a safe query command to test if the physical device supports historical pulls.</p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700" 
                size="sm" 
                disabled={isProcessing || !selectedDeviceId}
                onClick={handleTestQuery}
              >
                <FiCheckCircle className="mr-2 h-4 w-4" /> Test Support
              </Button>
              <span className="text-[10px] text-center text-blue-500">Needs physical verification</span>
            </div>

          </div>

          <div className="mt-6 border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Fallback options if automatic sync fails completely:
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/hr/biometric/csv-import">
                <FiFileText className="mr-2 h-4 w-4" /> Open CSV Import
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Summary Banner */}
      {lastResult && (
        <div className={`p-4 rounded-md border flex items-start gap-3 ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="mt-0.5">
            {lastResult.success ? <FiCheckCircle className="h-5 w-5 text-green-600" /> : <FiAlertCircle className="h-5 w-5 text-red-600" />}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {lastResult.type} - {lastResult.success ? "Success" : "Failed"}
            </h4>
            <div className={`text-sm mt-1 ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {lastResult.success ? (
                <>
                  <p>{lastResult.message || `Job enqueued. Found ${lastResult.processed} valid payload rows to ingest.`}</p>
                  {lastResult.syncLogId && <p className="text-xs mt-1 font-mono">Trace ID: {lastResult.syncLogId}</p>}
                </>
              ) : (
                <p>{lastResult.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>Execution logs for the selected device.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border rounded-md">
              <FiClock className="mx-auto h-8 w-8 mb-3 opacity-20" />
              <p>{selectedDeviceId ? "No sync history found for this device." : "Select a device to view history."}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Records</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Trace ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.syncTime), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          log.status === "SUCCESS" ? "default" :
                          log.status === "FAILED" ? "destructive" : "secondary"
                        }>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.recordsCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.syncedBy || "SYSTEM"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.id.slice(-8)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
