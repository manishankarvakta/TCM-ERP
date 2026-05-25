"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { testDeviceConnection, syncDeviceAttendance, syncDeviceUsers } from "@/app/actions/hr/biometric.action";
import { Server, Wifi, RefreshCw, Clock, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function BiometricDevicesPage() {
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Dummy data for visual representation until database query is wired in the server component
    const devices = [
        {
            id: "d1",
            name: "Main Entrance",
            ipAddress: "192.168.1.201",
            port: 4370,
            status: "active",
            lastSyncAt: new Date().toISOString()
        }
    ];

    const handleTest = async (ip: string, port: number) => {
        setIsTesting(true);
        toast.info(`Pinging ${ip}...`);
        const res = await testDeviceConnection(ip, port);
        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error(res.message);
        }
        setIsTesting(false);
    };

    const handleSync = async (id: string) => {
        setIsSyncing(true);
        toast.info("Connecting to device to pull attendance logs...");
        const res = await syncDeviceAttendance(id);
        if (res.success) {
            toast.success(`Successfully pulled ${res.count} new logs!`);
        } else {
            toast.error(res.error || "Failed to sync");
        }
        setIsSyncing(false);
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Biometric Devices</h1>
                    <p className="text-muted-foreground mt-1">Manage physical ZKTeco attendance devices on your network.</p>
                </div>
                <Link href="/dashboard/hr/devices/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Device
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map(device => (
                    <Card key={device.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/40 pb-4 border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Server className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{device.name}</CardTitle>
                                        <CardDescription className="font-mono text-xs mt-0.5">
                                            {device.ipAddress}:{device.port}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant={device.status === 'active' ? 'default' : 'destructive'} className="uppercase">
                                    {device.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-6">
                            <div className="space-y-3">
                                <div className="text-sm flex justify-between items-center text-muted-foreground">
                                    <span>Last Sync:</span>
                                    <span className="font-medium text-foreground">
                                        {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : "Never"}
                                    </span>
                                </div>
                                <div className="text-sm flex justify-between items-center text-muted-foreground">
                                    <span>Connection:</span>
                                    <span className="font-medium text-foreground flex items-center gap-1">
                                        TCP/IP <Wifi className="w-3 h-3 text-green-500" />
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full flex-1" 
                                    onClick={() => handleTest(device.ipAddress, device.port)}
                                    disabled={isTesting}
                                >
                                    {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                                    Ping
                                </Button>
                                <Button 
                                    variant="outline"
                                    className="w-full flex-1"
                                    onClick={() => handleSync(device.id)}
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                                    Sync Logs
                                </Button>
                            </div>
                            <Link href={`/dashboard/hr/devices/${device.id}`}>
                                <Button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground" variant="secondary">
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit Device
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
