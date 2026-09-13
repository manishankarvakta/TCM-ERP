"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiSave,
  FiPrinter,
  FiSettings,
  FiAward,
  FiPercent,
  FiGift,
  FiCheckCircle,
  FiMonitor,
  FiTv,
  FiLayout,
  FiShield,
} from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";
import { getPOSSettingsAction, savePOSSettingsAction } from "../_actions/pos-settings.action";
import { posSettingsSchema, type POSSettings, DEFAULT_POS_SETTINGS } from "../_actions/pos-settings.types";
import { getMembershipSettingsAction, saveMembershipSettingsAction } from "../_actions/membership-settings.action";
import { DEFAULT_MEMBERSHIP_SETTINGS, type MembershipSettings } from "../_actions/membership-settings.types";
import MediaSelector from "@/components/MediaSelector";
import ReceiptBarcode from "@/app/print/invoice/[id]/ReceiptBarcode";



const membershipFormSchema = z.object({
  pointsSpentRatio: z.coerce.number().min(0.01, "Earning ratio must be greater than 0"),
  pointValue: z.coerce.number().min(0, "Point value cannot be negative"),
  enableThresholdDiscount: z.boolean(),
  minPurchaseForDiscount: z.coerce.number().min(0, "Purchase threshold cannot be negative"),
  discountPercentage: z.coerce.number().min(0, "Discount percentage cannot be negative").max(100, "Discount cannot exceed 100%"),
});

type MembershipFormData = z.infer<typeof membershipFormSchema>;

export default function POSSettingsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: "print" | "screen" | "membership" =
    tabParam === "screen" || tabParam === "membership" || tabParam === "print"
      ? tabParam
      : "print";

  const handleTabChange = (newTab: "print" | "screen" | "membership") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", "pos");
    params.set("tab", newTab);
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false });
  };

  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // POS Print Form
  const posForm = useForm<POSSettings>({
    resolver: zodResolver(posSettingsSchema) as any,
    defaultValues: DEFAULT_POS_SETTINGS,
  });

  // Membership Form
  const membershipForm = useForm<MembershipFormData>({
    resolver: zodResolver(membershipFormSchema) as any,
    defaultValues: DEFAULT_MEMBERSHIP_SETTINGS,
  });

  const watchPOS = posForm.watch();
  const enableThresholdDiscount = membershipForm.watch("enableThresholdDiscount");

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        setLoadingSettings(true);
        const [posResult, membershipResult] = await Promise.all([
          getPOSSettingsAction(),
          getMembershipSettingsAction(),
        ]);

        if (posResult.success && posResult.settings) {
          const settings = posResult.settings;
          const computedMode = settings.discountRuleMode === "max_percent" || settings.enableMaxDiscountPercent ? "max_percent" : "below_cost";
          const isLimitsEnabled = settings.enableDiscountLimits ?? (
            settings.preventBelowCostPrice || settings.enableMaxDiscountPercent || false
          );
          posForm.reset({
            ...settings,
            enableDiscountLimits: isLimitsEnabled,
            discountRuleMode: computedMode,
          });
        }
        if (membershipResult.success && membershipResult.settings) {
          membershipForm.reset(membershipResult.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError("Failed to load POS settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    loadAllSettings();
  }, [posForm, membershipForm]);

  const onSubmitPOS = async (data: POSSettings) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result = await savePOSSettingsAction(data);

      if (!result.success) {
        throw new Error(result.error || "Failed to save POS settings");
      }

      setSuccess("POS settings saved successfully!");
      toast.success("POS settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitMembership = async (data: MembershipFormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const result = await saveMembershipSettingsAction(data as MembershipSettings);

      if (!result.success) {
        throw new Error(result.error || "Failed to save membership settings");
      }

      setSuccess("Membership settings saved successfully!");
      toast.success("Membership settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">POS & Print Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure POS layouts, receipt design, and customer loyalty rules
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground animate-pulse">Loading settings configurations...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">POS & Print Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure POS layouts, receipt design, and customer loyalty rules
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-500/10 text-emerald-500 text-sm rounded-md flex items-center gap-2">
          <FiCheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-border gap-4">
        <button
          type="button"
          onClick={() => handleTabChange("print")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "print"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FiPrinter className="h-4 w-4" />
          Receipt & Print Design
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("screen")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "screen"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FiMonitor className="h-4 w-4" />
          POS Screen
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("membership")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "membership"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FiAward className="h-4 w-4" />
          Loyalty & Membership
        </button>
      </div>

      <div className={activeTab === "screen" ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 xl:grid-cols-3 gap-6"}>
        {/* Main Settings Form */}
        <div className={activeTab === "screen" ? "lg:col-span-1 space-y-6" : "xl:col-span-2 space-y-6"}>
          {activeTab === "print" ? (
            <form onSubmit={posForm.handleSubmit(onSubmitPOS)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiSettings className="h-5 w-5 text-primary" />
                    Layout Settings
                  </CardTitle>
                  <CardDescription>
                    Choose paper sizes and visibility configs for POS receipt output.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="paperSize">Default Paper Size</Label>
                      <Controller
                        name="paperSize"
                        control={posForm.control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="paperSize">
                              <SelectValue placeholder="Select paper size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="80mm">Thermal 80mm Roll</SelectItem>
                              <SelectItem value="58mm">Thermal 58mm Roll</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between border-l pl-4 sm:pl-6 border-border">
                      <div className="space-y-0.5">
                        <Label htmlFor="showHeaderLogo">Show Header Logo</Label>
                        <p className="text-xs text-muted-foreground">Print custom branding image at the top</p>
                      </div>
                      <Controller
                        name="showHeaderLogo"
                        control={posForm.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="showHeaderLogo"
                          />
                        )}
                      />
                    </div>
                  </div>

                  {watchPOS.showHeaderLogo && (
                    <div className="space-y-2 pt-2 border-t border-border animate-in fade-in duration-200">
                      <Label>Receipt Logo</Label>
                      <Controller
                        name="logoUrl"
                        control={posForm.control}
                        render={({ field }) => (
                          <MediaSelector
                            value={field.value || ""}
                            onChange={field.onChange}
                            width={160}
                            height={80}
                          />
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="headerText">Header / Organization Name</Label>
                    <Controller
                      name="headerText"
                      control={posForm.control}
                      render={({ field }) => (
                        <Input id="headerText" {...field} />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subHeaderText">Sub-Header details (BIN / Tax registration)</Label>
                    <Controller
                      name="subHeaderText"
                      control={posForm.control}
                      render={({ field }) => (
                        <Input id="subHeaderText" {...field} />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footerText">Receipt Footer Message</Label>
                    <Controller
                      name="footerText"
                      control={posForm.control}
                      render={({ field }) => (
                        <Textarea id="footerText" rows={3} {...field} />
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showBiller">Show Biller Name</Label>
                        <p className="text-xs text-muted-foreground">Include cashier/biller's name on invoice</p>
                      </div>
                      <Controller
                        name="showBiller"
                        control={posForm.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="showBiller"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showTaxDetails">Show VAT/Tax breakdown</Label>
                        <p className="text-xs text-muted-foreground">Display calculated VAT tax line</p>
                      </div>
                      <Controller
                        name="showTaxDetails"
                        control={posForm.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="showTaxDetails"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showBarcode">Show Invoice Barcode</Label>
                        <p className="text-xs text-muted-foreground">Print invoice number barcode at bottom</p>
                      </div>
                      <Controller
                        name="showBarcode"
                        control={posForm.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="showBarcode"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowNegativeSale">Allow Negative Sale</Label>
                        <p className="text-xs text-muted-foreground">Show 0 stock items and SKUs in POS</p>
                      </div>
                      <Controller
                        name="allowNegativeSale"
                        control={posForm.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="allowNegativeSale"
                          />
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowDueSale">Allow Due Sale</Label>
                        <p className="text-xs text-muted-foreground">Show credit/partial payment options in POS</p>
                      </div>
                      <Controller
                        name="allowDueSale"
                        control={posForm.control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="allowDueSale"
                          />
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="gap-2">
                  <FiSave className="h-4 w-4" />
                  {loading ? "Saving POS settings..." : "Save POS settings"}
                </Button>
              </div>
            </form>
          ) : activeTab === "screen" ? (
            <form onSubmit={posForm.handleSubmit(onSubmitPOS)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FiMonitor className="h-5 w-5 text-primary" />
                    POS Screen Layout Selection
                  </CardTitle>
                  <CardDescription>
                    Select the preferred Point of Sale (POS) screen layout style for cashiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Controller
                    name="posScreenType"
                    control={posForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-3">
                        {/* Standard POS Screen Option */}
                        <div
                          onClick={() => field.onChange("standard")}
                          className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all flex items-center justify-between gap-3 ${
                            field.value === "standard"
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border hover:border-primary/40 hover:bg-accent/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg shrink-0 ${field.value === "standard" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                              <FiLayout className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-foreground">Standard POS Screen</h3>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  Default (Screen 1)
                                </span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="posScreenType"
                            value="standard"
                            checked={field.value === "standard"}
                            onChange={() => field.onChange("standard")}
                            className="h-4 w-4 text-primary shrink-0"
                          />
                        </div>

                        {/* Modern POS Screen Option */}
                        <div
                          onClick={() => field.onChange("modern")}
                          className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all flex items-center justify-between gap-3 ${
                            field.value === "modern"
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border hover:border-primary/40 hover:bg-accent/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg shrink-0 ${field.value === "modern" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                              <FiTv className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-foreground">Modern POS Screen</h3>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                                  Touchscreen Ready (Screen 2)
                                </span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="posScreenType"
                            value="modern"
                            checked={field.value === "modern"}
                            onChange={() => field.onChange("modern")}
                            className="h-4 w-4 text-primary shrink-0"
                          />
                        </div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* POS Screen Feature Controls Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FiSettings className="h-5 w-5 text-primary" />
                    POS Feature Controls
                  </CardTitle>
                  <CardDescription>
                    Enable or disable specific checkout features on the POS screen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Discount (Order Level) */}
                    <Controller
                      name="allowDiscount"
                      control={posForm.control}
                      render={({ field }) => (
                        <div className="flex items-start space-x-3 rounded-xl border p-3 bg-card hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="allowDiscount"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 leading-none">
                            <Label htmlFor="allowDiscount" className="font-semibold text-sm cursor-pointer">
                              Discount (Order Level)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow overall order discount at checkout
                            </p>
                          </div>
                        </div>
                      )}
                    />

                    {/* 2. Coupon */}
                    <Controller
                      name="allowCoupon"
                      control={posForm.control}
                      render={({ field }) => (
                        <div className="flex items-start space-x-3 rounded-xl border p-3 bg-card hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="allowCoupon"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 leading-none">
                            <Label htmlFor="allowCoupon" className="font-semibold text-sm cursor-pointer">
                              Coupon
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Enable coupon and promo code input
                            </p>
                          </div>
                        </div>
                      )}
                    />

                    {/* 3. Due Sale / Due Payment */}
                    <Controller
                      name="allowDueSale"
                      control={posForm.control}
                      render={({ field }) => (
                        <div className="flex items-start space-x-3 rounded-xl border p-3 bg-card hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="allowDueSale"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 leading-none">
                            <Label htmlFor="allowDueSale" className="font-semibold text-sm cursor-pointer">
                              Due Sale / Credit
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow credit and partial due sales at checkout
                            </p>
                          </div>
                        </div>
                      )}
                    />

                    {/* 4. Customer Points */}
                    <Controller
                      name="allowCustomerPoints"
                      control={posForm.control}
                      render={({ field }) => (
                        <div className="flex items-start space-x-3 rounded-xl border p-3 bg-card hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="allowCustomerPoints"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 leading-none">
                            <Label htmlFor="allowCustomerPoints" className="font-semibold text-sm cursor-pointer">
                              Customer Points
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow redeeming customer reward points
                            </p>
                          </div>
                        </div>
                      )}
                    />

                    {/* 5. Tax / VAT */}
                    <Controller
                      name="allowTax"
                      control={posForm.control}
                      render={({ field }) => (
                        <div className="flex items-start space-x-3 rounded-xl border p-3 bg-card hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="allowTax"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 leading-none">
                            <Label htmlFor="allowTax" className="font-semibold text-sm cursor-pointer">
                              Tax / VAT
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Enable Tax and VAT calculation on POS orders
                            </p>
                          </div>
                        </div>
                      )}
                    />

                    {/* 6. Allow Negative Sale */}
                    <Controller
                      name="allowNegativeSale"
                      control={posForm.control}
                      render={({ field }) => (
                        <div className="flex items-start space-x-3 rounded-xl border p-3 bg-card hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="allowNegativeSale"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 leading-none">
                            <Label htmlFor="allowNegativeSale" className="font-semibold text-sm cursor-pointer">
                              Allow Negative Sale
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow selling and showing items with zero (0) or negative (&lt; 0) stock
                            </p>
                          </div>
                        </div>
                      )}
                    />

                  </div>

                  {/* Default Tax / VAT Rate % Input */}
                  {posForm.watch("allowTax") && (
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-3">
                      <Label htmlFor="defaultTaxRate" className="font-semibold text-xs whitespace-nowrap">
                        Default Tax / VAT Rate (%):
                      </Label>
                      <Input
                        id="defaultTaxRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...posForm.register("defaultTaxRate")}
                        placeholder="0.00"
                        className="w-32 h-8 text-xs font-semibold"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Discount Limit Rules Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <FiPercent className="h-4 w-4 text-primary" />
                    Discount Limit Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enable discount limit rules and select how POS discount limits will be enforced
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Master Limit Discount Checkbox */}
                  <Controller
                    name="enableDiscountLimits"
                    control={posForm.control}
                    render={({ field }) => (
                      <div className="flex items-start space-x-3 rounded-xl border p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <Checkbox
                          id="enableDiscountLimits"
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            const isChecked = !!checked;
                            field.onChange(isChecked);
                            const mode = posForm.getValues("discountRuleMode") || "below_cost";
                            posForm.setValue("preventBelowCostPrice", isChecked && mode === "below_cost");
                            posForm.setValue("enableMaxDiscountPercent", isChecked && mode === "max_percent");
                          }}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5 leading-none">
                          <Label htmlFor="enableDiscountLimits" className="font-bold text-sm cursor-pointer">
                            Limit Discount
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Enable discount limit restrictions during POS checkout
                          </p>
                        </div>
                      </div>
                    )}
                  />

                  {/* Radio options (visible when Limit Discount checkbox is checked) */}
                  {posForm.watch("enableDiscountLimits") && (
                    <div className="pl-1 space-y-3 pt-2 border-t border-border">
                      <Controller
                        name="discountRuleMode"
                        control={posForm.control}
                        render={({ field }) => (
                          <RadioGroup
                            value={field.value || "below_cost"}
                            onValueChange={(val) => {
                              field.onChange(val);
                              posForm.setValue("preventBelowCostPrice", val === "below_cost");
                              posForm.setValue("enableMaxDiscountPercent", val === "max_percent");
                            }}
                            className="space-y-3"
                          >
                            {/* Option 1: Prevent Discount Below Stock / Cost Value */}
                            <div className="flex items-start space-x-3 rounded-xl border p-3.5 bg-card hover:bg-accent/30 transition-colors">
                              <RadioGroupItem value="below_cost" id="rule-below-cost" className="mt-0.5" />
                              <div className="space-y-0.5 leading-none">
                                <Label htmlFor="rule-below-cost" className="font-bold text-sm cursor-pointer">
                                  1. Prevent Discount Below Stock / Cost Value
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Discounted price cannot be lower than product's cost price or stock value
                                </p>
                              </div>
                            </div>

                            {/* Option 2: Fixed Maximum Discount Limit (%) */}
                            <div className="rounded-xl border p-3.5 bg-card hover:bg-accent/30 transition-colors space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start space-x-3">
                                  <RadioGroupItem value="max_percent" id="rule-max-percent" className="mt-0.5" />
                                  <div className="space-y-0.5 leading-none">
                                    <Label htmlFor="rule-max-percent" className="font-bold text-sm cursor-pointer">
                                      2. Fixed Maximum Discount Limit (%)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Set maximum allowed discount percentage for any item or order
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                  <Input
                                    id="maxDiscountPercentage"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    disabled={field.value !== "max_percent"}
                                    {...posForm.register("maxDiscountPercentage")}
                                    placeholder="0"
                                    className="w-24 h-8 text-xs text-right font-bold disabled:opacity-50"
                                  />
                                  <span className="text-xs font-bold text-muted-foreground">%</span>
                                </div>
                              </div>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Secure POS Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <FiShield className="h-4 w-4 text-primary" />
                    Secure POS Settings
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enable security restrictions and manager permission enforcement for sensitive POS actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="securePos"
                    control={posForm.control}
                    render={({ field }) => (
                      <div className="flex items-start space-x-3 rounded-xl border p-3.5 bg-card hover:bg-accent/30 transition-colors">
                        <Checkbox
                          id="securePos"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5 leading-none">
                          <Label htmlFor="securePos" className="font-bold text-sm cursor-pointer">
                            Secure POS
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Require password verification from authorized users (with POS permissions) for sensitive POS operations like due sales.
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="gap-2">
                  <FiSave className="h-4 w-4" />
                  {loading ? "Saving POS settings..." : "Save POS Screen Settings"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={membershipForm.handleSubmit(onSubmitMembership)} className="space-y-6">
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
                      <Controller
                        name="pointsSpentRatio"
                        control={membershipForm.control}
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
                      <p className="text-xs text-muted-foreground">
                        Spent amount required to earn 1 point (e.g. spend 100 Taka = 1 point)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pointValue">Point Monetary Value</Label>
                      <Controller
                        name="pointValue"
                        control={membershipForm.control}
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
                        Value of 1 point during checkout redemption (e.g. 1 point = 1.0 Taka discount)
                      </p>
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
                      control={membershipForm.control}
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
                          control={membershipForm.control}
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
                          Required total spent to qualify for the discount (e.g., 20,000 Taka)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                        <div className="relative">
                          <Controller
                            name="discountPercentage"
                            control={membershipForm.control}
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
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="gap-2">
                  <FiSave className="h-4 w-4" />
                  {loading ? "Saving Membership settings..." : "Save Membership settings"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Live Template Design Preview */}
        <div className={activeTab === "screen" ? "lg:col-span-1" : "xl:col-span-1"}>
          {activeTab === "screen" ? (
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FiMonitor className="h-4 w-4 text-primary" />
                    POS Screen Skeleton Preview
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {watchPOS.posScreenType === "modern" ? "Screen 2 (Modern)" : "Screen 1 (Standard)"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <POSScreenSkeleton screenType={watchPOS.posScreenType || "standard"} />
              </CardContent>
            </Card>
          ) : (
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Receipt Preview ({watchPOS.paperSize || "80mm"})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`bg-white text-black p-4 border rounded-md shadow-inner font-mono text-xs overflow-hidden mx-auto transition-all ${
                    watchPOS.paperSize === "58mm"
                      ? "max-w-[240px]"
                      : "max-w-[280px]"
                  }`}
                >
                  {/* Logo Image */}
                  {watchPOS.showHeaderLogo && (
                    <div className="flex justify-center mb-3">
                      {watchPOS.logoUrl ? (
                        <img
                          src={watchPOS.logoUrl}
                          alt="Logo"
                          className="max-h-12 object-contain"
                        />
                      ) : (
                        <div className="border border-dashed border-gray-400 p-2 text-center text-[10px] w-full text-gray-500">
                          [ No Logo Selected ]
                        </div>
                      )}
                    </div>
                  )}

                  {/* Header Text */}
                  <div className="text-center font-bold text-sm uppercase">
                    {watchPOS.headerText || "Ferrari Fashion"}
                  </div>
                  <div className="text-center text-[10px] text-gray-600 mb-2">
                    {watchPOS.subHeaderText || "BIN 004601696-0102 | Mushak 6.3"}
                  </div>

                  <div className="border-b border-dashed border-gray-300 pb-2 mb-2 text-[10px] text-gray-700">
                    <div>Invoice: FF-POS-100231</div>
                    <div>Date: {new Date().toLocaleDateString()}</div>
                    {watchPOS.showBiller && <div>Biller: Admin User</div>}
                  </div>

                  {/* Item Details */}
                  <table className="w-full text-[10px] mb-2 border-b border-dashed border-gray-300 pb-2">
                    <thead>
                      <tr className="border-b border-gray-300 text-left">
                        <th>Qty</th>
                        <th>Item</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>Casual Slim Shirt (Blue / M)</td>
                        <td className="text-right">1,200.00</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>Denim Skinny Jeans (Black)</td>
                        <td className="text-right">3,000.00</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="text-[10px] space-y-1 mb-3 text-gray-700">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>4,200.00</span>
                    </div>
                    {watchPOS.showTaxDetails && (
                      <div className="flex justify-between">
                        <span>VAT (5%):</span>
                        <span>210.00</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-dashed border-gray-300 pt-1 text-black">
                      <span>Net Amount:</span>
                      <span>4,410.00</span>
                    </div>
                  </div>

                  {/* Footer Message */}
                  {watchPOS.footerText && (
                    <div className="text-center text-[10px] text-gray-500 border-t border-dashed border-gray-300 pt-2 whitespace-pre-line">
                      {watchPOS.footerText}
                    </div>
                  )}

                  {/* Real Barcode */}
                  {watchPOS.showBarcode && (
                    <div className="mt-2 border-t border-dashed border-gray-300 pt-1">
                      <ReceiptBarcode value="FF-POS-100231" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function POSScreenSkeleton({ screenType }: { screenType: "standard" | "modern" }) {
  if (screenType === "standard") {
    return (
      <div className="border border-border/90 rounded-2xl bg-card p-3.5 shadow-sm space-y-3 font-sans select-none">
        {/* Top Navigation Bar Skeleton */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border/70 gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 bg-muted-foreground/35 rounded-full"></div>
            <div className="h-6 w-36 bg-muted-foreground/20 rounded-full"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 bg-muted-foreground/20 rounded-full"></div>
            <div className="h-6 w-20 bg-muted-foreground/20 rounded-full"></div>
            <div className="h-6 w-10 bg-muted-foreground/30 rounded-full"></div>
          </div>
        </div>

        {/* Dual Column Layout Skeleton */}
        <div className="grid grid-cols-12 gap-3 min-h-[300px]">
          {/* Left Column (7 cols): Catalog & Categories */}
          <div className="col-span-7 space-y-3 border-r border-border/70 pr-2">
            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-hidden">
              <div className="h-5 w-10 bg-muted-foreground/40 rounded-full"></div>
              <div className="h-5 w-14 bg-muted-foreground/20 rounded-full"></div>
              <div className="h-5 w-12 bg-muted-foreground/20 rounded-full"></div>
              <div className="h-5 w-16 bg-muted-foreground/20 rounded-full"></div>
              <div className="h-5 w-10 bg-muted-foreground/20 rounded-full"></div>
            </div>

            {/* Product Cards Grid (3x2) */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-border/70 rounded-xl p-2 bg-muted-foreground/10 space-y-2 flex flex-col justify-between">
                  <div className="h-12 bg-muted-foreground/25 rounded-lg w-full"></div>
                  <div className="space-y-1">
                    <div className="h-2 bg-muted-foreground/30 rounded-full w-5/6"></div>
                    <div className="h-2 bg-muted-foreground/20 rounded-full w-1/2"></div>
                  </div>
                  <div className="h-4 bg-muted-foreground/30 rounded-lg w-full"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Active Cart & Totals */}
          <div className="col-span-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-border/70">
                <div className="h-3.5 w-20 bg-muted-foreground/35 rounded-full"></div>
                <div className="h-3.5 w-10 bg-muted-foreground/20 rounded-full"></div>
              </div>

              {/* Cart Items */}
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-1.5 bg-muted-foreground/10 rounded-xl border border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 w-2/3">
                      <div className="h-5 w-5 bg-muted-foreground/30 rounded-md"></div>
                      <div className="space-y-1 flex-1">
                        <div className="h-2 bg-muted-foreground/30 rounded-full w-full"></div>
                        <div className="h-1.5 bg-muted-foreground/20 rounded-full w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-3 w-10 bg-muted-foreground/25 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Checkout Button */}
            <div className="space-y-2 pt-2 border-t border-border/70">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-2.5 w-14 bg-muted-foreground/20 rounded-full"></div>
                  <div className="h-2.5 w-12 bg-muted-foreground/20 rounded-full"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-2.5 w-12 bg-muted-foreground/20 rounded-full"></div>
                  <div className="h-2.5 w-10 bg-muted-foreground/20 rounded-full"></div>
                </div>
                <div className="flex justify-between p-1.5 bg-muted-foreground/15 rounded-lg">
                  <div className="h-3 w-16 bg-muted-foreground/35 rounded-full"></div>
                  <div className="h-3 w-16 bg-muted-foreground/35 rounded-full"></div>
                </div>
              </div>
              <div className="h-8 bg-muted-foreground/45 rounded-xl w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modern Screen 2 Skeleton matching user image with zero overflow
  return (
    <div className="border border-border/90 rounded-2xl bg-card p-3 shadow-xs space-y-2.5 font-sans select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-1 gap-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
          <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
          <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-7 w-12 bg-muted-foreground/35 rounded-xl"></div>
          <div className="h-7 w-10 bg-muted-foreground/20 rounded-xl"></div>
          <div className="h-7 w-12 bg-muted-foreground/25 rounded-xl"></div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-12 gap-2.5 min-h-[290px] min-w-0 overflow-hidden">
        {/* Left Section (8 cols): Search Bar + Cart Rows + Bottom Toolbar */}
        <div className="col-span-8 flex flex-col justify-between space-y-2 min-w-0 overflow-hidden">
          <div className="space-y-2 min-w-0">
            {/* Search Input Bar */}
            <div className="h-8 w-full bg-muted-foreground/20 rounded-xl"></div>

            {/* Table Header Bar */}
            <div className="h-5 w-full bg-muted-foreground/15 rounded-xl flex items-center px-2.5 justify-between gap-2 min-w-0">
              <div className="h-2 w-16 bg-muted-foreground/25 rounded-full"></div>
              <div className="h-2 w-10 bg-muted-foreground/25 rounded-full"></div>
              <div className="h-2 w-10 bg-muted-foreground/25 rounded-full"></div>
              <div className="h-2 w-12 bg-muted-foreground/25 rounded-full"></div>
            </div>

            {/* 3 Item Row Cards */}
            <div className="space-y-1.5 min-w-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-full border border-border/60 rounded-xl p-1.5 bg-muted-foreground/10 flex items-center justify-between px-2.5 gap-2 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    <div className="h-5 w-5 bg-muted-foreground/30 rounded-md shrink-0"></div>
                    <div className="h-2 bg-muted-foreground/25 rounded-full flex-1 max-w-[100px]"></div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-2 w-8 bg-muted-foreground/25 rounded-full"></div>
                    <div className="h-2 w-6 bg-muted-foreground/25 rounded-full"></div>
                    <div className="h-5 w-10 bg-muted-foreground/35 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Toolbar: 5 rounded pill buttons */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/60 min-w-0">
            <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
            <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
            <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
            <div className="h-7 flex-1 min-w-0 bg-muted-foreground/20 rounded-xl"></div>
            <div className="h-7 w-8 bg-muted-foreground/15 rounded-xl shrink-0"></div>
          </div>
        </div>

        {/* Right Section (4 cols): Direct Payment Sidebar */}
        <div className="col-span-4 flex flex-col justify-between space-y-2 min-w-0 overflow-hidden">
          <div className="space-y-2 min-w-0">
            {/* Totals Summary Box */}
            <div className="p-2 border border-border/60 rounded-xl bg-muted-foreground/10 space-y-1.5 min-w-0">
              <div className="flex justify-between gap-1">
                <div className="h-2 w-10 bg-muted-foreground/20 rounded-full"></div>
                <div className="h-2 w-10 bg-muted-foreground/20 rounded-full"></div>
              </div>
              <div className="flex justify-between gap-1">
                <div className="h-2 w-8 bg-muted-foreground/20 rounded-full"></div>
                <div className="h-2 w-8 bg-muted-foreground/20 rounded-full"></div>
              </div>
              <div className="h-6 bg-muted-foreground/20 border border-border/60 rounded-lg flex items-center justify-between px-2 gap-1 min-w-0">
                <div className="h-2.5 w-8 bg-muted-foreground/35 rounded-full"></div>
                <div className="h-2.5 w-10 bg-muted-foreground/40 rounded-full"></div>
              </div>
            </div>

            {/* 3 Payment Input Cards */}
            <div className="space-y-1.5 min-w-0">
              <div className="h-6 w-full border border-border/60 bg-muted-foreground/10 rounded-xl flex items-center justify-between px-2 gap-1 min-w-0 overflow-hidden">
                <div className="h-2 w-8 bg-muted-foreground/25 rounded-full shrink-0"></div>
                <div className="h-2 w-8 bg-muted-foreground/35 rounded-full shrink-0"></div>
              </div>
              <div className="h-6 w-full border border-border/60 bg-muted-foreground/10 rounded-xl flex items-center justify-between px-2 gap-1 min-w-0 overflow-hidden">
                <div className="h-2 w-8 bg-muted-foreground/25 rounded-full shrink-0"></div>
                <div className="h-2 w-8 bg-muted-foreground/35 rounded-full shrink-0"></div>
              </div>
              <div className="h-6 w-full border border-border/60 bg-muted-foreground/10 rounded-xl flex items-center justify-between px-2 gap-1 min-w-0 overflow-hidden">
                <div className="h-2 w-8 bg-muted-foreground/25 rounded-full shrink-0"></div>
                <div className="h-2 w-8 bg-muted-foreground/35 rounded-full shrink-0"></div>
              </div>
            </div>
          </div>

          {/* Large Action Button at Bottom Right */}
          <div className="pt-1">
            <div className="h-10 w-full bg-muted-foreground/45 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
