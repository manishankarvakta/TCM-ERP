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
import { getAccountingSettings, updateAccountingSettings, type COGSMethod } from "../_actions/accounting.action";
import { useToast } from "@/hooks/use-toast";

const accountingSettingsSchema = z.object({
  cogsMethod: z.enum(["FIFO", "LIFO", "AVERAGE", "SPECIFIC_IDENTIFICATION"]),
});

type AccountingSettingsData = z.infer<typeof accountingSettingsSchema>;

const cogsMethodOptions: Array<{ value: COGSMethod; label: string; description: string }> = [
  {
    value: "FIFO",
    label: "FIFO (First In, First Out)",
    description: "Assumes the oldest inventory items are sold first",
  },
  {
    value: "LIFO",
    label: "LIFO (Last In, First Out)",
    description: "Assumes the newest inventory items are sold first",
  },
  {
    value: "AVERAGE",
    label: "Average Cost",
    description: "Uses the average cost of all inventory items",
  },
  {
    value: "SPECIFIC_IDENTIFICATION",
    label: "Specific Identification",
    description: "Tracks the cost of each specific inventory item",
  },
];

export default function Accounting() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AccountingSettingsData>({
    resolver: zodResolver(accountingSettingsSchema),
    defaultValues: {
      cogsMethod: "FIFO",
    },
  });

  const cogsMethod = watch("cogsMethod");

  // Fetch settings
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const settingsResult = await getAccountingSettings();

        if (!settingsResult.success) {
          setError(settingsResult.error || "Failed to load settings");
          setLoading(false);
          return;
        }

        if (settingsResult.settings) {
          reset({
            cogsMethod: settingsResult.settings.cogsMethod,
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

  const onSubmit = async (data: AccountingSettingsData) => {
    setError("");
    setSuccess(false);
    setSaving(true);

    startTransition(async () => {
      try {
        const result = await updateAccountingSettings({
          cogsMethod: data.cogsMethod,
        });

        if (result.success) {
          setSuccess(true);
          toast({
            title: "Success",
            description: "Accounting settings updated successfully",
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
        <h1 className="text-2xl font-semibold">Accounting Defaults</h1>
        <p className="text-sm text-muted-foreground">
          Configure default accounting settings
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
            <CardTitle>Cost of Goods Sold (COGS) Method</CardTitle>
            <CardDescription>
              Select the default method for calculating Cost of Goods Sold
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cogsMethod">COGS Calculation Method</Label>
              <Select
                value={cogsMethod}
                onValueChange={(value) => setValue("cogsMethod", value as COGSMethod)}
              >
                <SelectTrigger id="cogsMethod">
                  <SelectValue placeholder="Select COGS method" />
                </SelectTrigger>
                <SelectContent>
                  {cogsMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cogsMethod && (
                <p className="text-xs text-muted-foreground">
                  {cogsMethodOptions.find((opt) => opt.value === cogsMethod)?.description}
                </p>
              )}
              {errors.cogsMethod && (
                <p className="text-sm text-destructive">
                  {errors.cogsMethod.message}
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-semibold">Method Details:</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                {cogsMethodOptions.map((option) => (
                  <div key={option.value} className={cogsMethod === option.value ? "font-medium" : ""}>
                    <strong>{option.label}:</strong> {option.description}
                  </div>
                ))}
              </div>
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
