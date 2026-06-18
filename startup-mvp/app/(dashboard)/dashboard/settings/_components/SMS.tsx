"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Smartphone } from "lucide-react";
import { getSetting, upsertSetting } from "../_actions/settings.action";

export default function SMS() {
  const [formData, setFormData] = useState({
    provider: "twilio",
    apiKey: "",
    apiSecret: "",
    senderId: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    const fetchSMSConfig = async () => {
      try {
        setIsLoading(true);
        const result = await getSetting("sms_config", "accounts");
        
        if (result.success && result.setting) {
          const settings = result.setting.settings as any;
          setFormData({
            provider: settings?.provider || "twilio",
            apiKey: settings?.apiKey || "",
            apiSecret: settings?.apiSecret || "",
            senderId: settings?.senderId || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch SMS config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSMSConfig();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "sms_config",
          category: "accounts",
          title: "SMS Configuration",
          settings: formData,
          isGlobal: false,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "SMS settings updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save SMS settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save SMS settings:", error);
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
          <h1 className="text-2xl font-semibold">SMS</h1>
          <p className="text-sm text-muted-foreground">Manage your SMS settings</p>
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
        <h1 className="text-2xl font-semibold">SMS</h1>
        <p className="text-sm text-muted-foreground">Configure SMS gateway for text notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Gateway Settings
          </CardTitle>
          <CardDescription>
            Choose your provider and enter API credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">SMS Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
                <SelectItem value="messagebird">MessageBird</SelectItem>
                <SelectItem value="other">Other (Generic API)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key / SID</Label>
              <Input
                id="apiKey"
                placeholder="AC..."
                value={formData.apiKey}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret / Auth Token</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="••••••••"
                value={formData.apiSecret}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="senderId">Sender ID / From Number</Label>
            <Input
              id="senderId"
              placeholder="+1234567890"
              value={formData.senderId}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              The number or alphanumeric ID that will appear as the sender
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
