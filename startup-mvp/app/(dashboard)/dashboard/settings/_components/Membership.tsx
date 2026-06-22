"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { FiSave, FiAward, FiGift, FiPercent } from "react-icons/fi";
import { getMembershipSettingsAction, saveMembershipSettingsAction } from "../_actions/membership-settings.action";
import type { MembershipSettings } from "../_actions/membership-settings.types";
import { DEFAULT_MEMBERSHIP_SETTINGS } from "../_actions/membership-settings.types";

const membershipFormSchema = z.object({
  pointsSpentRatio: z.coerce.number().min(0.01, "Earning ratio must be greater than 0"),
  pointValue: z.coerce.number().min(0, "Point value cannot be negative"),
  enableThresholdDiscount: z.boolean(),
  minPurchaseForDiscount: z.coerce.number().min(0, "Purchase threshold cannot be negative"),
  discountPercentage: z.coerce.number().min(0, "Discount percentage cannot be negative").max(100, "Discount cannot exceed 100%"),
});

type MembershipFormData = z.infer<typeof membershipFormSchema>;

export default function Membership() {
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<MembershipFormData>({
    resolver: zodResolver(membershipFormSchema) as any,
    defaultValues: DEFAULT_MEMBERSHIP_SETTINGS,
  });

  const enableThresholdDiscount = watch("enableThresholdDiscount");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        const result = await getMembershipSettingsAction();
        if (result.success && result.settings) {
          reset(result.settings);
        }
      } catch (err) {
        console.error("Failed to load membership settings:", err);
        setError("Failed to load membership settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [reset]);

  const onSubmit = async (data: MembershipFormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result = await saveMembershipSettingsAction(data as MembershipSettings);

      if (!result.success) {
        throw new Error(result.error || "Failed to save membership settings");
      }

      setSuccess("Membership settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Membership Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure rules for point earning, redemption, and loyalty discounts
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground animate-pulse">Loading membership settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Membership Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure rules for point earning, redemption, and loyalty discounts
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 text-emerald-500 text-sm rounded-md">
            {success}
          </div>
        )}

        {/* Earning & Redemption Points Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiAward className="h-5 w-5 text-primary" />
              Points Calculations
            </CardTitle>
            <CardDescription>
              Configure how clients earn points and their monetary redemption value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pointsSpentRatio">Points Earning Ratio</Label>
                <div className="relative">
                  <Controller
                    name="pointsSpentRatio"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        id="pointsSpentRatio"
                        placeholder="e.g., 100"
                        {...field}
                      />
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The spent amount required to earn 1 point (e.g. spend 100 Taka = 1 point)
                </p>
                {errors.pointsSpentRatio && (
                  <p className="text-xs text-destructive">{errors.pointsSpentRatio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pointValue">Point Monetary Value</Label>
                <Controller
                  name="pointValue"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      id="pointValue"
                      placeholder="e.g., 1.0"
                      {...field}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  The value of 1 point during checkout redemption (e.g. 1 point = 1.0 Taka discount)
                </p>
                {errors.pointValue && (
                  <p className="text-xs text-destructive">{errors.pointValue.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Discount Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FiGift className="h-5 w-5 text-primary" />
                  Membership Purchases Discount
                </CardTitle>
                <CardDescription>
                  Configure discount rewards when clients hit a purchase volume threshold
                </CardDescription>
              </div>
              <Controller
                name="enableThresholdDiscount"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {enableThresholdDiscount && (
              <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="minPurchaseForDiscount">Minimum Purchase Amount (Threshold)</Label>
                  <Controller
                    name="minPurchaseForDiscount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="number"
                        id="minPurchaseForDiscount"
                        placeholder="e.g., 20000"
                        {...field}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required total spent / purchase amount to qualify for the discount (e.g., 20,000 Taka)
                  </p>
                  {errors.minPurchaseForDiscount && (
                    <p className="text-xs text-destructive">{errors.minPurchaseForDiscount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                  <div className="relative">
                    <Controller
                      name="discountPercentage"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          id="discountPercentage"
                          placeholder="e.g., 5"
                          {...field}
                        />
                      )}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <FiPercent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Discount percentage applied automatically at checkout (e.g., 5%)
                  </p>
                  {errors.discountPercentage && (
                    <p className="text-xs text-destructive">{errors.discountPercentage.message}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="gap-2">
            <FiSave className="h-4 w-4" />
            {loading ? "Saving Settings..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
