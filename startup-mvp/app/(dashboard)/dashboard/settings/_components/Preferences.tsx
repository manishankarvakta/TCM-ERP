"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FiAlertCircle, FiSave, FiGlobe, FiClock } from "react-icons/fi";
import { getPreferencesAction, updatePreferencesAction } from "../_actions/preferences.action";
import type { PreferencesSettings } from "@/types/preferences";
import { Switch } from "@/components/ui/switch";
import {
  CURRENCIES,
  TIMEZONES,
  COUNTRIES,
  DATE_FORMATS,
  LANGUAGES,
  DEFAULT_PREFERENCES,
} from "@/lib/preferences-data";

const preferencesFormSchema = z.object({
  currency: z.string().min(3),
  currencySymbol: z.string().min(1),
  country: z.string().min(2),
  language: z.string().min(2),
  timezone: z.string().min(1),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(["12h", "24h"]),
  decimalSeparator: z.enum([".", ","]),
  thousandsSeparator: z.enum([",", ".", " ", "none"]),
  createPurchaseWithoutGRN: z.boolean().default(false),
});

type PreferencesFormData = z.infer<typeof preferencesFormSchema>;

export default function Preferences() {
  const [loading, setLoading] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesFormSchema) as any,
    defaultValues: DEFAULT_PREFERENCES,
  });

  // Watch currency to auto-update symbol
  const selectedCurrency = watch("currency");

  useEffect(() => {
    // Auto-update currency symbol when currency changes
    const currencyData = CURRENCIES.find((c) => c.code === selectedCurrency);
    if (currencyData) {
      setValue("currencySymbol", currencyData.symbol);
    }
  }, [selectedCurrency, setValue]);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoadingPreferences(true);
        const result = await getPreferencesAction();
        if (result.success && result.preferences) {
          reset(result.preferences);
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
        setError("Failed to load preferences");
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [reset]);

  const onSubmit = async (data: PreferencesFormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const preferences: PreferencesSettings = data;

      const result = await updatePreferencesAction(preferences);

      if (!result.success) {
        throw new Error(result.error || "Failed to save preferences");
      }

      setSuccess("Preferences saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loadingPreferences) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Preferences</h1>
          <p className="text-sm text-muted-foreground">
            Manage your regional and display preferences
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading preferences...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Manage your regional and display preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiGlobe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>
              Configure currency, language, and location preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency <span className="text-destructive">*</span></Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.currency && (
                  <p className="text-xs text-destructive">{errors.currency.message}</p>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.country && (
                  <p className="text-xs text-destructive">{errors.country.message}</p>
                )}
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language <span className="text-destructive">*</span></Label>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.language && (
                  <p className="text-xs text-destructive">{errors.language.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time & Date Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiClock className="h-5 w-5" />
              Time & Date Settings
            </CardTitle>
            <CardDescription>
              Configure timezone and date/time display formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone <span className="text-destructive">*</span></Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.timezone && (
                <p className="text-xs text-destructive">{errors.timezone.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Format */}
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format <span className="text-destructive">*</span></Label>
                <Controller
                  name="dateFormat"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.dateFormat && (
                  <p className="text-xs text-destructive">{errors.dateFormat.message}</p>
                )}
              </div>

              {/* Time Format */}
              <div className="space-y-2">
                <Label>Time Format <span className="text-destructive">*</span></Label>
                <Controller
                  name="timeFormat"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="12h" id="12h" />
                        <Label htmlFor="12h" className="font-normal cursor-pointer">12-hour (1:30 PM)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="24h" id="24h" />
                        <Label htmlFor="24h" className="font-normal cursor-pointer">24-hour (13:30)</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.timeFormat && (
                  <p className="text-xs text-destructive">{errors.timeFormat.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Number Formatting */}
        <Card>
          <CardHeader>
            <CardTitle>Number Formatting</CardTitle>
            <CardDescription>
              Configure how numbers are displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Decimal Separator */}
              <div className="space-y-2">
                <Label>Decimal Separator</Label>
                <Controller
                  name="decimalSeparator"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="." id="dot" />
                        <Label htmlFor="dot" className="font-normal cursor-pointer">Dot (1.23)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="," id="comma" />
                        <Label htmlFor="comma" className="font-normal cursor-pointer">Comma (1,23)</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Thousands Separator */}
              <div className="space-y-2">
                <Label>Thousands Separator</Label>
                <Controller
                  name="thousandsSeparator"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select separator..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=",">,  (1,000)</SelectItem>
                        <SelectItem value=".">. (1.000)</SelectItem>
                        <SelectItem value=" ">Space (1 000)</SelectItem>
                        <SelectItem value="none">None (1000)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Procurement Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Procurement Settings</CardTitle>
            <CardDescription>
              Configure how procurement documents behave
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Create Purchase Without GRN</Label>
                <p className="text-sm text-muted-foreground">
                  If enabled, you can create and approve purchases without an automatic Goods Receipt Note. You will need to create the GRN manually later.
                </p>
              </div>
              <Controller
                name="createPurchaseWithoutGRN"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="pt-6 border-t flex justify-end">
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={loading}>
            <FiSave className="mr-2" /> Save Preferences
          </Button>
        </div>
      </form>

      {success && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
            <FiSave /> {success}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-destructive text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
            <FiAlertCircle /> {error}
          </div>
        </div>
      )}
    </div>
  );
}
