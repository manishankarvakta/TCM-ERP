"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { biometricDeviceSchema, BiometricDeviceFormData } from "../_schemas/device.schema";
import { createBiometricDevice, updateBiometricDevice } from "../_actions/device.action";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface DeviceFormProps {
  mode: "create" | "edit";
  initialData?: any;
  warehouses?: { id: string; name: string; code: string }[];
}

export default function DeviceForm({ mode, initialData, warehouses = [] }: DeviceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BiometricDeviceFormData>({
    resolver: zodResolver(biometricDeviceSchema as any),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          serialNumber: initialData.serialNumber || "",
          vendor: initialData.vendor || "ZKTeco",
          ipAddress: initialData.ipAddress || "",
          port: initialData.port || 4370,
          location: initialData.location || "",
          deviceType: initialData.deviceType || "ATTENDANCE",
          connectionMode: initialData.connectionMode || "ADMS",
          isActive: initialData.isActive !== false,
          warehouseId: initialData.warehouseId || "",
          username: initialData.username || "",
          password: initialData.password || "",
        }
      : {
          name: "",
          serialNumber: "",
          vendor: "ZKTeco",
          ipAddress: "",
          port: 4370,
          location: "",
          deviceType: "ATTENDANCE",
          connectionMode: "ADMS",
          isActive: true,
          warehouseId: "",
          username: "",
          password: "",
        },
  });

  const onSubmit = async (data: BiometricDeviceFormData) => {
    console.log("onSubmit triggered with data:", data);
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createBiometricDevice(data);
      } else {
        result = await updateBiometricDevice(initialData.id, data);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Device ${mode === "create" ? "created" : "updated"} successfully`,
        });
        router.push("/dashboard/hr/biometric/devices");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check the form for invalid fields.",
      variant: "destructive",
    });
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Add New Device" : "Device Details"}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Register a new biometric attendance or access control device."
            : "Update the configuration for this device."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit as any, onError)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Device Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. Main Entrance Terminal"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number <span className="text-destructive">*</span></Label>
              <Input
                id="serialNumber"
                placeholder="e.g. BZXX12345678"
                {...register("serialNumber")}
              />
              {errors.serialNumber && (
                <p className="text-xs text-destructive">{errors.serialNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type</Label>
              <Select
                value={watch("deviceType")}
                onValueChange={(val) => setValue("deviceType", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                  <SelectItem value="ACCESS_CONTROL">Access Control</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionMode">Connection Mode</Label>
              <Select
                value={watch("connectionMode")}
                onValueChange={(val) => setValue("connectionMode", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  <SelectItem value="ADMS">ADMS (Push to Server)</SelectItem>
                  <SelectItem value="TCP_IP">Local Bridge (TCP/IP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Device Brand (Vendor)</Label>
              <Select
                value={watch("vendor")}
                onValueChange={(val) => setValue("vendor", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  <SelectItem value="ZKTeco">ZKTeco</SelectItem>
                  <SelectItem value="Hikvision">Hikvision</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Helps local agent load correct communication drivers.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse Assignment (Optional)</Label>
              <SearchableSelect
                value={watch("warehouseId") || "none"}
                onValueChange={(val) => setValue("warehouseId", val === "none" ? "" : (val || ""))}
                placeholder="Select a warehouse"
                options={[
                  { value: "none", label: "Unassigned" },
                  ...warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                    description: w.code || undefined
                  }))
                ]}
              />
              <p className="text-xs text-muted-foreground">Warehouse can be assigned later.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipAddress">IP Address (Optional)</Label>
              <Input
                id="ipAddress"
                placeholder="e.g. 192.168.1.200"
                {...register("ipAddress")}
              />
              <p className="text-xs text-muted-foreground">Required if using TCP/IP mode</p>
            </div>

             <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder="4370"
                {...register("port")}
              />
            </div>

            {watch("vendor") === "Hikvision" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="e.g. admin"
                    {...register("username")}
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    placeholder="Device connection password"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Head Office HQ"
                {...register("location")}
              />
            </div>
            
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive devices will be ignored by the sync service.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={watch("isActive")}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/hr/biometric/devices")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create Device" : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
