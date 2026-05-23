"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiCpu, FiActivity, FiTrash2, FiEdit2, FiLink } from "react-icons/fi";
import { deleteBiometricDevice } from "../../_actions/device.action";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeviceListProps {
  devices: any[];
}

export default function DeviceList({ devices }: DeviceListProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    const result = await deleteBiometricDevice(id);
    if (result.success) {
      toast({ title: "Success", description: "Device deleted successfully" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {devices.length === 0 ? (
        <Card className="col-span-full py-12 border-dashed">
          <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
            <FiCpu className="h-12 w-12 mb-4 opacity-20" />
            <p>No biometric devices configured yet.</p>
            <Link href="/dashboard/hr/attendance/devices/new" className="mt-4">
              <Button variant="outline" size="sm">Add First Device</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        devices.map((device) => (
          <Card key={device.id} className="group hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiCpu className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{device.vendor}</p>
                  </div>
                </div>
                <Badge variant={device.status === "active" ? "default" : "secondary"}>
                  {device.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiActivity className="h-4 w-4" />
                  <span>{device.connectionType}: {device.ipAddress || "Web URL"}</span>
                </div>
                {device.port && (
                  <div className="text-xs text-muted-foreground ml-6">
                    Port: {device.port}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FiLink className="h-4 w-4" />
                  <span>Last Sync: {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : "Never"}</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t mt-4">
                  <Link href={`/dashboard/hr/attendance/devices/${device.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <FiEdit2 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the device configuration. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(device.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Device
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
