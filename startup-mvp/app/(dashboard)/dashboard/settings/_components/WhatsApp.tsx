"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSetting, upsertSetting } from "../_actions/settings.action";
import { Loader2, Copy, Check, MessageSquare, ShieldCheck, Key } from "lucide-react";
import { toast } from "sonner";

export default function WhatsApp() {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isChanged, setIsChanged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");
  
  const [settings, setSettings] = useState({
    fbAppSecret: "",
    fbVerifyToken: "",
    fbPageAccessToken: "",
    whatsappVerifyToken: "",
    whatsappAccessToken: "",
    whatsappPhoneNumberId: "",
    whatsappBusinessAccountId: "",
  });

  useEffect(() => {
    setMounted(true);
    setCallbackUrl(`${window.location.origin}/api/webhooks/whatsapp`);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function fetchSettings() {
      const response = await getSetting("meta_credentials", "integrations");
      if (response.success && response.setting) {
        const savedSettings = response.setting.settings as any;
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      }
    }
    fetchSettings();
  }, [mounted]);

  const handleUpdate = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsChanged(true);
  };

  const handleSave = async () => {
    startTransition(async () => {
      const response = await upsertSetting({
        code: "meta_credentials",
        category: "integrations",
        title: "Meta Integrations Credentials",
        settings: settings,
        isGlobal: true,
      });

      if (response.success) {
        setIsChanged(false);
        toast.success("WhatsApp configuration saved successfully");
      } else {
        toast.error(response.error || "Failed to save configuration");
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    toast.success("Callback URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-500" />
          WhatsApp Integration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure credentials and webhooks to synchronize WhatsApp messages with your CRM leads in real time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* API Credentials */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              API Credentials
            </CardTitle>
            <CardDescription>
              Provide the API tokens generated on your Meta Developer Portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappAccessToken">System Access Token</Label>
              <Input
                id="whatsappAccessToken"
                type="password"
                value={settings.whatsappAccessToken}
                onChange={(e) => handleUpdate("whatsappAccessToken", e.target.value)}
                placeholder="E.g., EAAG..."
              />
              <p className="text-xs text-muted-foreground">
                WhatsApp permanent access token with whatsapp_business_messaging permissions.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappPhoneNumberId">Phone Number ID</Label>
              <Input
                id="whatsappPhoneNumberId"
                value={settings.whatsappPhoneNumberId}
                onChange={(e) => handleUpdate("whatsappPhoneNumberId", e.target.value)}
                placeholder="E.g., 1029384756..."
              />
              <p className="text-xs text-muted-foreground">
                The unique phone number identifier for messages API.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappBusinessAccountId">WhatsApp Business Account ID</Label>
              <Input
                id="whatsappBusinessAccountId"
                value={settings.whatsappBusinessAccountId}
                onChange={(e) => handleUpdate("whatsappBusinessAccountId", e.target.value)}
                placeholder="E.g., 5647382910..."
              />
              <p className="text-xs text-muted-foreground">
                The ID of your Meta WhatsApp Business Manager Account.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhooks Setup */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Webhook Setup
            </CardTitle>
            <CardDescription>
              Configure webhook URL and validation token in your Meta App Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappVerifyToken">Verify Token</Label>
              <Input
                id="whatsappVerifyToken"
                value={settings.whatsappVerifyToken}
                onChange={(e) => handleUpdate("whatsappVerifyToken", e.target.value)}
                placeholder="Define a secure token"
              />
              <p className="text-xs text-muted-foreground">
                Verification handshake token configured on Meta Webhook Dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Webhook Callback URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={callbackUrl}
                  className="bg-muted text-muted-foreground font-mono text-xs select-all flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy this URL and enter it as the callback in the WhatsApp Webhook configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!isChanged || isPending}
          className="min-w-[140px]"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
