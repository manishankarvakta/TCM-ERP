"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  checkDeviceStatus, 
  queueSyncUsersToDevice, 
  queueSyncAttendanceLogs, 
  queueFullDeviceSync 
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
        toast({ title: successTitle, description: res.message || "Action queued successfully." });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Action Failed", description: res.error });
      }
    });
  };

  return (
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
      <div className="p-4 border rounded-lg space-y-3 bg-muted/30 sm:col-span-2 lg:col-span-3 border-primary/20">
        <h4 className="font-medium text-sm text-primary">Full Sync</h4>
        <p className="text-xs text-muted-foreground">Run all sync actions.</p>
        <Button className="w-full" disabled={isPending} onClick={() => handleAction(queueFullDeviceSync, "Full Sync Orchestrated")}>
          {isPending ? "Working..." : "Run Full Sync"}
        </Button>
      </div>
    </div>
  );
}
