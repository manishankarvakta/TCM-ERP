"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { resolveUnmappedBiometricLog } from "../_actions/unmapped-logs.action";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface ResolveModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  unmappedLog: any;
  employees: any[];
  devices: any[];
  onSuccess: () => void;
}

export function ResolveUnmappedModal({
  isOpen,
  setIsOpen,
  unmappedLog,
  employees,
  devices,
  onSuccess,
}: ResolveModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [employeeId, setEmployeeId] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceUserId, setDeviceUserId] = useState<string>("");
  const [createMapping, setCreateMapping] = useState(true);
  const [reprocessAttendance, setReprocessAttendance] = useState(true);

  // Pre-fill default values when modal opens
  useEffect(() => {
    if (unmappedLog) {
      setDeviceUserId(unmappedLog.deviceUserId || "");
      
      // Auto-select device if serial number matches
      if (unmappedLog.deviceSerialNumber) {
        const matchedDevice = devices.find(d => d.serialNumber === unmappedLog.deviceSerialNumber);
        if (matchedDevice) {
          setDeviceId(matchedDevice.id);
        } else {
          setDeviceId("");
        }
      } else {
        setDeviceId("");
      }
      
      setEmployeeId(""); // Reset employee selection
      setCreateMapping(true);
      setReprocessAttendance(true);
    }
  }, [unmappedLog, devices]);

  if (!unmappedLog) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast({ title: "Error", description: "Please select an employee.", variant: "destructive" });
      return;
    }
    if (!deviceUserId) {
      toast({ title: "Error", description: "Device PIN / User ID is required.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = await resolveUnmappedBiometricLog({
        unmappedLogId: unmappedLog.id,
        employeeId,
        deviceId: deviceId || null,
        deviceSerialNumber: unmappedLog.deviceSerialNumber,
        deviceUserId,
        createMapping,
        reprocessAttendance,
      });

      if (result.success) {
        toast({ title: "Success", description: "Log resolved successfully." });
        setIsOpen(false);
        onSuccess();
      } else {
        toast({ title: "Resolution Failed", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Resolve Unmapped Log</DialogTitle>
            <DialogDescription>
              Map this raw punch to a specific employee and optionally save the mapping.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Context Info Box */}
            <div className="bg-muted p-3 rounded-md text-sm grid grid-cols-2 gap-2">
              <div><span className="font-medium text-muted-foreground">Serial:</span> {unmappedLog.deviceSerialNumber || "N/A"}</div>
              <div><span className="font-medium text-muted-foreground">Punch PIN:</span> {unmappedLog.deviceUserId}</div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Punch Time:</span>{" "}
                {format(new Date(unmappedLog.punchTime), "MMM d, yyyy HH:mm:ss")}
              </div>
              <div className="col-span-2">
                <span className="font-medium text-muted-foreground">Reason:</span> {unmappedLog.reason}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employeeId">Select Employee</Label>
              <SearchableSelect
                value={employeeId}
                onValueChange={(val) => setEmployeeId(val || "")}
                placeholder="Select an Employee..."
                options={employees.map(emp => ({
                  value: emp.id,
                  label: emp.name,
                  description: emp.employeeCode || undefined
                }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deviceId">Select Device (Optional)</Label>
              <SearchableSelect
                value={deviceId}
                onValueChange={(val) => setDeviceId(val || "")}
                placeholder="Select Device..."
                options={[
                  { value: "none", label: "-- None / Unknown --" },
                  ...devices.map(dev => ({
                    value: dev.id,
                    label: dev.name,
                    description: dev.serialNumber || undefined
                  }))
                ]}
              />
              <p className="text-xs text-muted-foreground">Auto-selected if serial number matches.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deviceUserId">Device PIN / User ID</Label>
              <Input 
                id="deviceUserId" 
                value={deviceUserId} 
                onChange={e => setDeviceUserId(e.target.value)} 
                required 
              />
            </div>

            <div className="flex flex-col gap-3 mt-2 border rounded-md p-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="createMapping" 
                  checked={createMapping} 
                  onCheckedChange={(val) => setCreateMapping(!!val)} 
                  disabled={!deviceId && !unmappedLog.deviceSerialNumber}
                />
                <Label htmlFor="createMapping" className="text-sm font-normal cursor-pointer">
                  Create Employee Device Mapping (Saves PIN to this employee)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="reprocessAttendance" 
                  checked={reprocessAttendance} 
                  onCheckedChange={(val) => setReprocessAttendance(!!val)} 
                />
                <Label htmlFor="reprocessAttendance" className="text-sm font-normal cursor-pointer">
                  Reprocess this attendance punch now
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Resolving..." : "Resolve Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
