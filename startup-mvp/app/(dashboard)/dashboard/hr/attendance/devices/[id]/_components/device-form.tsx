"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { upsertBiometricDevice } from "../../../_actions/device.action";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FiSave, FiChevronLeft } from "react-icons/fi";
import { Wifi, RefreshCw } from "lucide-react";
import { testDeviceConnection } from "@/app/actions/hr/biometric.action";
import { getWarehouses } from "../../../../../master/warehouses/_actions/warehouse.action";

const deviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  vendor: z.string().min(1, "Vendor is required"),
  connectionType: z.string().default("IP"),
  ipAddress: z.string().optional(),
  port: z.coerce.number().default(4370),
  apiKey: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  status: z.string().default("active"),
  brand: z.string().optional(),
  model: z.string().optional(),
  protocol: z.string().default("TCP_IP"),
  company: z.string().optional(),
  branchId: z.string().optional(),
  timeZone: z.string().default("Asia/Dhaka"),
  autoSync: z.boolean().default(false),
  syncInterval: z.coerce.number().default(60),
});

interface DeviceFormProps {
  initialData?: any;
}

export default function DeviceForm({ initialData }: DeviceFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{status: 'idle' | 'testing' | 'success' | 'error', message: string}>({ status: 'idle', message: '' });
  const [branches, setBranches] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function loadBranches() {
      const res = await getWarehouses(1, 100);
      if (res.success && res.warehouses) {
        setBranches(res.warehouses);
      }
    }
    loadBranches();
  }, []);

  const form = useForm<z.infer<typeof deviceSchema>>({
    resolver: zodResolver(deviceSchema) as any,
    defaultValues: initialData ? {
      ...initialData,
      port: initialData.port ?? 4370,
      protocol: initialData.protocol ?? "TCP_IP",
      timeZone: initialData.timeZone ?? "Asia/Dhaka",
      autoSync: initialData.autoSync ?? false,
      syncInterval: initialData.syncInterval ?? 60,
    } : {
      name: "",
      vendor: "ZKTeco",
      connectionType: "IP",
      port: 4370,
      status: "active",
      brand: "",
      model: "",
      protocol: "TCP_IP",
      company: "",
      branchId: "",
      timeZone: "Asia/Dhaka",
      autoSync: false,
      syncInterval: 60,
    },
  }) as any;

  const onSubmit = async (values: z.infer<typeof deviceSchema>) => {
    const result = await upsertBiometricDevice(values);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      router.push("/dashboard/hr/attendance/devices");
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleTestConnection = async () => {
    const ip = form.getValues("ipAddress");
    const port = form.getValues("port");
    
    if (!ip) {
      toast({ title: "Error", description: "Please enter an IP Address first", variant: "destructive" });
      setTestResult({ status: 'error', message: 'Please enter an IP Address' });
      return;
    }
    
    setIsTesting(true);
    setTestResult({ status: 'testing', message: `Pinging ${ip}:${port}... Please wait (up to 10s)` });
    toast({ title: "Connecting...", description: `Pinging ${ip}:${port}` });
    
    try {
      const res = await testDeviceConnection(ip, Number(port));
      
      if (res.success) {
        setTestResult({ status: 'success', message: res.message || 'Connected successfully!' });
        toast({ title: "Success!", description: res.message });
      } else {
        setTestResult({ status: 'error', message: res.message || 'Connection timeout.' });
        toast({ title: "Connection Failed", description: res.message, variant: "destructive" });
      }
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message || 'Internal error' });
    }
    
    setIsTesting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Main Entrance Gate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ZKTeco">ZKTeco</SelectItem>
                        <SelectItem value="eSSL">eSSL</SelectItem>
                        <SelectItem value="FingerTec">FingerTec</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. ZKTeco, Hikvision" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. K40, UA300" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Communication Protocol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TCP_IP">TCP/IP (Direct Socket)</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                        <SelectItem value="HTTP_PUSH">HTTP Push SDK</SelectItem>
                        <SelectItem value="REST_API">REST API</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. ZK1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. TechSoul Ltd." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Zone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="autoSync"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-6">
                      <div className="space-y-0.5">
                        <FormLabel>Auto Sync</FormLabel>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="syncInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Interval (Seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="connectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connection Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="IP">TCP/IP (Direct)</SelectItem>
                        <SelectItem value="WEB_API">Web API (Cloud)</SelectItem>
                        <SelectItem value="USB">USB Import</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("connectionType") === "IP" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-sm font-medium">Network Settings</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                      Check Connection
                    </Button>
                  </div>
                  {testResult.status !== 'idle' && (
                    <span className={`text-xs font-medium ${testResult.status === 'success' ? 'text-green-600' : testResult.status === 'error' ? 'text-red-500' : 'text-yellow-600'}`}>
                      {testResult.message}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IP Address</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.100" {...field} />
                        </FormControl>
                        <FormDescription>Static IP of the device</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>Default: 4370</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {form.watch("connectionType") === "WEB_API" && (
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key / Cloud Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter security key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Installation Location</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Dhaka Factory - Floor 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <FiChevronLeft className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <FiSave className="mr-2 h-4 w-4" /> {initialData ? "Update Device" : "Add Device"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
