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
} from "react-icons/fi";
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
  const [activeTab, setActiveTab] = useState<"print" | "membership">("print");
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
          posForm.reset(posResult.settings);
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

      setSuccess("POS Print settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
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
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
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
          onClick={() => setActiveTab("print")}
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
          onClick={() => setActiveTab("membership")}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="xl:col-span-2 space-y-6">
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
        <div className="xl:col-span-1">
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
        </div>
      </div>
    </div>
  );
}
