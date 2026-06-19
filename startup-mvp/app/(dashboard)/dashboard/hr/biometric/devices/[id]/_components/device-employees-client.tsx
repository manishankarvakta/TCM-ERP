"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setDeviceUserAccessStatus } from "../../_actions/device-users.action";
import { useToast } from "@/hooks/use-toast";
import { FiUsers, FiToggleLeft, FiToggleRight } from "react-icons/fi";

export default function DeviceEmployeesClient({ deviceId, mappings }: { deviceId: string, mappings: any[] }) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleAccess = async (mappingId: string, currentStatus: boolean) => {
    setLoadingId(mappingId);
    const result = await setDeviceUserAccessStatus(mappingId, deviceId, !currentStatus);
    setLoadingId(null);
    if (result.success) {
      toast({ title: "Success", description: "Access status updated." });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  if (mappings.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <FiUsers className="mx-auto h-8 w-8 mb-3 opacity-20" />
        <p>No users mapped to this device yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Biometric ID / PIN</TableHead>
            <TableHead>Local Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((m: any) => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.employee?.name}</TableCell>
              <TableCell>{m.employee?.employeeCode || "-"}</TableCell>
              <TableCell className="font-mono font-medium">{m.deviceUserId}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge variant={m.isActive ? "default" : "secondary"}>
                    {m.isActive ? "Active" : "Disabled"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground leading-tight px-1.5 py-0">
                    Local Only (Pending ADMS)
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleAccess(m.id, m.isActive)}
                  disabled={loadingId === m.id}
                >
                  {m.isActive ? <FiToggleRight className="text-green-500 h-5 w-5" /> : <FiToggleLeft className="text-muted-foreground h-5 w-5" />}
                  <span className="ml-2">{m.isActive ? "Disable" : "Enable"}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
