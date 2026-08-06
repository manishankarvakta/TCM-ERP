"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSetting, upsertSetting } from "../_actions/settings.action";
import { Loader2, Copy, Check, Facebook as FacebookIcon, ShieldCheck, Key } from "lucide-react";
import { toast } from "sonner";

export default function Facebook() {
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
    setCallbackUrl(`${window.location.origin}/api/webhooks/facebook`);
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
        toast.success("Facebook Lead Ads configuration saved successfully");
      } else {
        toast.error(response.error || "Failed to save settings");
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
          <FacebookIcon className="h-6 w-6 text-blue-600" />
          Facebook Lead Ads Integration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure credentials and webhooks to automatically capture leads from your Facebook Lead Ads.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Facebook App Secrets */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Meta App Secret & Tokens
            </CardTitle>
            <CardDescription>
              Provide configuration credentials for authenticating Meta API requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fbAppSecret">App Secret</Label>
              <Input
                id="fbAppSecret"
                type="password"
                value={settings.fbAppSecret}
                onChange={(e) => handleUpdate("fbAppSecret", e.target.value)}
                placeholder="Enter App Secret"
              />
              <p className="text-xs text-muted-foreground">
                The App Secret from your Meta App Settings. Used to verify webhook signature headers.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fbPageAccessToken">Page Access Token</Label>
              <Input
                id="fbPageAccessToken"
                type="password"
                value={settings.fbPageAccessToken}
                onChange={(e) => handleUpdate("fbPageAccessToken", e.target.value)}
                placeholder="E.g., EAAW..."
              />
              <p className="text-xs text-muted-foreground">
                Permanent Page Access Token with lead_retrieval and pages_show_list permissions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Settings */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Webhook Handshake
            </CardTitle>
            <CardDescription>
              Register this webhook inside Meta App Webhooks Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fbVerifyToken">Verify Token</Label>
              <Input
                id="fbVerifyToken"
                value={settings.fbVerifyToken}
                onChange={(e) => handleUpdate("fbVerifyToken", e.target.value)}
                placeholder="Define a secure verify token"
              />
              <p className="text-xs text-muted-foreground">
                Matches the Verify Token entered when creating webhook subscription in Meta Developer Portal.
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
                Enter this Callback URL in Meta Portal and subscribe to the "leadgen" page webhook topic.
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
