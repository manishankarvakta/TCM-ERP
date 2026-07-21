"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  mapDevicePinToEmployee, 
  reprocessUnmappedPunches,
  ignoreUnmappedPunch, 
  setDeviceUserAccessByPin 
} from "../../_actions/device-users.action";
import { FiUserPlus, FiXCircle, FiRefreshCw, FiToggleRight } from "react-icons/fi";
import Link from "next/link";

export default function DeviceUnmappedClient({ 
  deviceId, 
  deviceSerialNumber,
  unmappedLogs, 
  employees 
}: { 
  deviceId: string, 
  deviceSerialNumber: string,
  unmappedLogs: any[], 
  employees: any[] 
}) {
  const { toast } = useToast();
  
  const employeeOptions = employees.map(e => ({
    label: e.name,
    value: e.id,
    description: e.employeeCode || undefined
  }));
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const openMapModal = (log: any) => {
    setSelectedLog(log);
    setSelectedEmployeeId("");
    setMapModalOpen(true);
  };

  const handleMapAndReprocess = async () => {
    if (!selectedEmployeeId || !selectedLog) return;
    setIsProcessing(true);
    
    // 1. Map PIN
    const mapResult = await mapDevicePinToEmployee(
      deviceId, 
      deviceSerialNumber, 
      selectedLog.deviceUserId, 
      selectedEmployeeId
    );

    if (mapResult.success) {
      toast({ title: "Mapped successfully", description: "The PIN has been linked to the employee. Reprocessing punches..." });
      setMapModalOpen(false);
    } else {
      toast({ title: "Mapping Error", description: mapResult.error, variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    setIsProcessing(false);
  };

  const handleIgnore = async (logId: string) => {
    const res = await ignoreUnmappedPunch(logId, deviceId);
    if (res.success) toast({ title: "Punch Ignored" });
  };

  const handleReEnableAccess = async (pin: string) => {
    const res = await setDeviceUserAccessByPin(deviceId, pin, true);
    if (res.success) toast({ title: "Access Re-enabled", description: "The employee can now sync punches." });
    else toast({ title: "Error", description: res.error, variant: "destructive" });
  };

  const handleManualReprocess = async (pin: string) => {
    toast({ title: "Reprocessing...", description: `Reprocessing unresolved punches for PIN ${pin}` });
    const res = await reprocessUnmappedPunches(deviceId, deviceSerialNumber, pin);
    if (res.success) {
      toast({ title: "Complete", description: `Processed ${res.processed} unresolved punches.` });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  if (unmappedLogs.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center border rounded">No unknown punches found.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Punch Time</TableHead>
            <TableHead>PIN</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unmappedLogs.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">{format(new Date(log.punchTime), "MMM d, h:mm a")}</TableCell>
              <TableCell className="font-mono text-destructive font-bold">{log.deviceUserId}</TableCell>
              <TableCell className="text-muted-foreground">{log.reason}</TableCell>
              <TableCell>
                <Badge variant={log.status === "UNRESOLVED" ? "destructive" : "outline"}>{log.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {log.reason === "DISABLED_ACCESS" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleReEnableAccess(log.deviceUserId)}>
                        <FiToggleRight className="mr-1 h-4 w-4 text-green-500" /> Re-enable
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleIgnore(log.id)} className="text-muted-foreground">
                        Keep Rejected
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openMapModal(log)}>
                        <FiUserPlus className="mr-1 h-4 w-4" /> Map PIN
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleManualReprocess(log.deviceUserId)} title="Reprocess pending for this PIN">
                        <FiRefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleIgnore(log.id)} className="text-muted-foreground">
                        <FiXCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={mapModalOpen} onOpenChange={setMapModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map Biometric PIN</DialogTitle>
            <DialogDescription>
              Map Biometric PIN <strong className="font-mono text-black">{selectedLog?.deviceUserId}</strong> to an existing ERP employee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <SearchableSelect
                options={employeeOptions}
                value={selectedEmployeeId}
                onValueChange={(val) => setSelectedEmployeeId(val || "")}
                placeholder="Search or select employee..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapModalOpen(false)}>Cancel</Button>
            <Button onClick={handleMapAndReprocess} disabled={!selectedEmployeeId || isProcessing}>
              {isProcessing ? "Processing..." : "Map & Reprocess Punches"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
