"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { testDeviceConnection } from "@/app/actions/hr/biometric.action";
import { Wifi, RefreshCw, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateDevicePage() {
    const router = useRouter();
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        vendor: "ZKTeco",
        ipAddress: "192.168.1.201",
        port: 4370,
        location: ""
    });

    const handleTestConnection = async () => {
        if (!formData.ipAddress) {
            toast.error("Please enter an IP Address first.");
            return;
        }

        setIsTesting(true);
        toast.info(`Pinging ${formData.ipAddress}:${formData.port}...`);
        
        const res = await testDeviceConnection(formData.ipAddress, Number(formData.port));
        if (res.success) {
            toast.success(`Success! ${res.message}`);
        } else {
            toast.error(res.message);
        }
        
        setIsTesting(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Note: You will need a server action like `createBiometricDevice(formData)` here
        toast.success("Device created successfully!");
        router.push("/dashboard/hr/devices");
        setIsSaving(false);
    };

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/hr/devices">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New Device</h1>
                    <p className="text-muted-foreground mt-1">Register a new physical biometric scanner.</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <Card>
                    <CardHeader>
                        <CardTitle>Hardware Details</CardTitle>
                        <CardDescription>Enter the network configuration for the biometric device.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        
                        <div className="space-y-2">
                            <Label htmlFor="name">Device Name</Label>
                            <Input 
                                id="name" 
                                placeholder="e.g. Main Office Entrance" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendor">Manufacturer / Vendor</Label>
                                <Input 
                                    id="vendor" 
                                    value={formData.vendor}
                                    onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location (Optional)</Label>
                                <Input 
                                    id="location" 
                                    placeholder="e.g. Ground Floor" 
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-muted/40 border rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Network Configuration</h3>
                                    <p className="text-sm text-muted-foreground">The static IP and TCP port of the device on your local network.</p>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleTestConnection}
                                    disabled={isTesting}
                                >
                                    {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                                    Check Connection
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="ipAddress">IP Address</Label>
                                    <Input 
                                        id="ipAddress" 
                                        placeholder="192.168.1.100" 
                                        value={formData.ipAddress}
                                        onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="port">Port</Label>
                                    <Input 
                                        id="port" 
                                        type="number" 
                                        value={formData.port}
                                        onChange={(e) => setFormData({...formData, port: Number(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Link href="/dashboard/hr/devices">
                                <Button type="button" variant="ghost">Cancel</Button>
                            </Link>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save Device
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
