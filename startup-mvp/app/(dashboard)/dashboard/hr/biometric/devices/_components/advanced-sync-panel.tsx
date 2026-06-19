"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  checkDeviceStatus, 
  queueSyncUsersToDevice, 
  queueSyncAttendanceLogs, 
  queueFullDeviceSync,
  queueTestCommand
} from "../_actions/device-sync.action";
import { useRouter } from "next/navigation";

export default function AdvancedSyncPanel({ deviceId }: { deviceId: string }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleAction = (actionFn: (id: string) => Promise<any>, successTitle: string) => {
    startTransition(async () => {
      const res = await actionFn(deviceId);
      if (res.success) {
        toast({ title: successTitle, description: (res as any).message || "Action queued successfully." });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Action Failed", description: res.error });
      }
    });
  };

  const handleTestCommand = (type: "INFO" | "CHECK" | "USERINFO") => {
    startTransition(async () => {
      const res = await queueTestCommand(deviceId, type);
      if (res.success) {
        toast({ title: "Command Queued", description: (res as any).message });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Action Failed", description: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <h4 className="font-medium text-sm text-blue-600">Test: INFO</h4>
          <p className="text-xs text-muted-foreground">Send INFO command to get basic device parameters.</p>
          <Button variant="outline" className="w-full border-blue-200 text-blue-700" disabled={isPending} onClick={() => handleTestCommand("INFO")}>
            {isPending ? "Working..." : "Send INFO Command"}
          </Button>
        </div>
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <h4 className="font-medium text-sm text-blue-600">Test: CHECK</h4>
          <p className="text-xs text-muted-foreground">Send CHECK command to test connection liveliness.</p>
          <Button variant="outline" className="w-full border-blue-200 text-blue-700" disabled={isPending} onClick={() => handleTestCommand("CHECK")}>
            {isPending ? "Working..." : "Send CHECK Command"}
          </Button>
        </div>
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <h4 className="font-medium text-sm text-blue-600">Test: USERINFO</h4>
          <p className="text-xs text-muted-foreground">Send safe USERINFO read query.</p>
          <Button variant="outline" className="w-full border-blue-200 text-blue-700" disabled={isPending} onClick={() => handleTestCommand("USERINFO")}>
            {isPending ? "Working..." : "Send USERINFO Query"}
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <h4 className="font-medium text-sm">Check Device Status</h4>
          <p className="text-xs text-muted-foreground">Check whether this device recently connected.</p>
          <Button variant="outline" className="w-full" disabled={isPending} onClick={() => handleAction(checkDeviceStatus, "Status Check Complete")}>
            {isPending ? "Working..." : "Check Status"}
          </Button>
        </div>
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <h4 className="font-medium text-sm">Sync Employees</h4>
          <p className="text-xs text-muted-foreground">Send assigned employees to this device.</p>
          <Button variant="outline" className="w-full" disabled={isPending} onClick={() => handleAction(queueSyncUsersToDevice, "User Sync Queued")}>
            {isPending ? "Working..." : "Sync Employees"}
          </Button>
        </div>
        <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
          <h4 className="font-medium text-sm">Sync Attendance</h4>
          <p className="text-xs text-muted-foreground">Request missing attendance logs from this device.</p>
          <Button variant="outline" className="w-full" disabled={isPending} onClick={() => handleAction(queueSyncAttendanceLogs, "Log Sync Queued")}>
            {isPending ? "Working..." : "Sync Attendance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
