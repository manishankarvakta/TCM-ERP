"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { getProductionSettings, updateProductionSettings } from "../_actions/production.action";
import { useToast } from "@/hooks/use-toast";

const productionSettingsSchema = z.object({
  defaultWastagePercentage: z.number().min(0).max(100),
});

type ProductionSettingsData = z.infer<typeof productionSettingsSchema>;

export default function Production() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductionSettingsData>({
    resolver: zodResolver(productionSettingsSchema),
    defaultValues: {
      defaultWastagePercentage: 0,
    },
  });

  // Fetch settings
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const settingsResult = await getProductionSettings();

        if (!settingsResult.success) {
          setError(settingsResult.error || "Failed to load settings");
          setLoading(false);
          return;
        }

        if (settingsResult.settings) {
          reset({
            defaultWastagePercentage: settingsResult.settings.defaultWastagePercentage,
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

  const onSubmit = async (data: ProductionSettingsData) => {
    setError("");
    setSuccess(false);
    setSaving(true);

    startTransition(async () => {
      try {
        const result = await updateProductionSettings({
          defaultWastagePercentage: data.defaultWastagePercentage,
        });

        if (result.success) {
          setSuccess(true);
          toast({
            title: "Success",
            description: "Production settings updated successfully",
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
        <h1 className="text-2xl font-semibold">Production Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure default production settings
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
              Set default values for production operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="defaultWastagePercentage">
                Default Wastage Percentage (%)
              </Label>
              <Input
                id="defaultWastagePercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register("defaultWastagePercentage", { valueAsNumber: true })}
                placeholder="0.00"
                className={errors.defaultWastagePercentage ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Default wastage percentage to apply when creating production orders (0-100%)
              </p>
              {errors.defaultWastagePercentage && (
                <p className="text-sm text-destructive">
                  {errors.defaultWastagePercentage.message}
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
