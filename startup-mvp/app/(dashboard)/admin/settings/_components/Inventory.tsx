"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { getInventorySettings, updateInventorySettings } from "../_actions/inventory.action";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/inventory/stock/_actions/stock.action";
import { useToast } from "@/hooks/use-toast";

const inventorySettingsSchema = z.object({
  defaultWarehouseId: z.string().nullable(),
});

type InventorySettingsData = z.infer<typeof inventorySettingsSchema>;

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<InventorySettingsData>({
    resolver: zodResolver(inventorySettingsSchema),
    defaultValues: {
      defaultWarehouseId: null,
    },
  });

  const defaultWarehouseId = watch("defaultWarehouseId");

  // Fetch settings and warehouses
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const [settingsResult, warehousesResult] = await Promise.all([
          getInventorySettings(),
          getActiveWarehouses(),
        ]);

        if (!settingsResult.success) {
          setError(settingsResult.error || "Failed to load settings");
          setLoading(false);
          return;
        }

        if (warehousesResult.success && warehousesResult.warehouses) {
          setWarehouses(warehousesResult.warehouses);
        }

        if (settingsResult.settings) {
          reset({
            defaultWarehouseId: settingsResult.settings.defaultWarehouseId || null,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reset]);

  const onSubmit = async (data: InventorySettingsData) => {
    setError("");
    setSuccess(false);
    setSaving(true);

    startTransition(async () => {
      try {
        const result = await updateInventorySettings({
          defaultWarehouseId: data.defaultWarehouseId || null,
        });

        if (result.success) {
          setSuccess(true);
          toast({
            title: "Success",
            description: "Inventory settings updated successfully",
          });
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setError(result.error || "Failed to update settings");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setSaving(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure default inventory settings
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-2 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-sm text-green-600">
          <FiCheckCircle className="h-4 w-4" />
          <span>Settings saved successfully</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
            <CardDescription>
              Set default values for inventory operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="defaultWarehouseId">Default Warehouse</Label>
              <Select
                value={defaultWarehouseId || "none"}
                onValueChange={(value) =>
                  setValue("defaultWarehouseId", value === "none" ? null : value)
                }
              >
                <SelectTrigger id="defaultWarehouseId">
                  <SelectValue placeholder="Select default warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No default)</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This warehouse will be used as default when creating stock adjustments or transactions
              </p>
              {errors.defaultWarehouseId && (
                <p className="text-sm text-destructive">
                  {errors.defaultWarehouseId.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={saving || isPending}>
                {saving || isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
