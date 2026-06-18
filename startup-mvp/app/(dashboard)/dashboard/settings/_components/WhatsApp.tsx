"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, MessageSquareText } from "lucide-react";
import { getSetting, upsertSetting } from "../_actions/settings.action";

export default function WhatsApp() {
  const [formData, setFormData] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    verifyToken: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    const fetchWhatsAppConfig = async () => {
      try {
        setIsLoading(true);
        const result = await getSetting("whatsapp_config", "accounts");
        
        if (result.success && result.setting) {
          const settings = result.setting.settings as any;
          setFormData({
            accessToken: settings?.accessToken || "",
            phoneNumberId: settings?.phoneNumberId || "",
            businessAccountId: settings?.businessAccountId || "",
            verifyToken: settings?.verifyToken || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch WhatsApp config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWhatsAppConfig();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "whatsapp_config",
          category: "accounts",
          title: "WhatsApp Configuration",
          settings: formData,
          isGlobal: false,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "WhatsApp settings updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save WhatsApp settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save WhatsApp settings:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Manage your WhatsApp integration</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Configure WhatsApp Cloud API for automated messaging</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            Cloud API Credentials
          </CardTitle>
          <CardDescription>
            Enter your credentials from the Facebook Developer Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessToken">System User Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="EAAGO..."
              value={formData.accessToken}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                placeholder="1029384756..."
                value={formData.phoneNumberId}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAccountId">WhatsApp Business Account ID</Label>
              <Input
                id="businessAccountId"
                placeholder="987654321..."
                value={formData.businessAccountId}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="verifyToken">Webhook Verify Token</Label>
            <Input
              id="verifyToken"
              placeholder="my_custom_verify_token"
              value={formData.verifyToken}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Used to verify webhooks from Meta
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Toaster toasts={toasts as any} onClose={closeToast} />
    </div>
  );
}
