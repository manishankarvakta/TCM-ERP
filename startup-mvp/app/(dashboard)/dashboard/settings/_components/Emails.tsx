"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Mail } from "lucide-react";
import { getSetting, upsertSetting } from "../_actions/settings.action";

export default function Emails() {
  const [formData, setFormData] = useState({
    host: "",
    port: "",
    user: "",
    password: "",
    fromAddress: "",
    fromName: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    const fetchEmailConfig = async () => {
      try {
        setIsLoading(true);
        const result = await getSetting("email_config", "accounts");
        
        if (result.success && result.setting) {
          const settings = result.setting.settings as any;
          setFormData({
            host: settings?.host || "",
            port: settings?.port || "",
            user: settings?.user || "",
            password: settings?.password || "",
            fromAddress: settings?.fromAddress || "",
            fromName: settings?.fromName || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch Email config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmailConfig();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "email_config",
          category: "accounts",
          title: "Email Configuration",
          settings: formData,
          isGlobal: false,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "Email settings updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save email settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save Email settings:", error);
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
          <h1 className="text-2xl font-semibold">Emails</h1>
          <p className="text-sm text-muted-foreground">Manage your email accounts</p>
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
        <h1 className="text-2xl font-semibold">Emails</h1>
        <p className="text-sm text-muted-foreground">Manage your SMTP email configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP Settings
          </CardTitle>
          <CardDescription>
            Configure your SMTP server to send emails from the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                id="host"
                placeholder="smtp.example.com"
                value={formData.host}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">SMTP Port</Label>
              <Input
                id="port"
                placeholder="587"
                value={formData.port}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">Username / Email</Label>
              <Input
                id="user"
                placeholder="user@example.com"
                value={formData.user}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="fromAddress">Default From Address</Label>
              <Input
                id="fromAddress"
                placeholder="noreply@example.com"
                value={formData.fromAddress}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Default From Name</Label>
              <Input
                id="fromName"
                placeholder="My Business"
                value={formData.fromName}
                onChange={handleChange}
              />
            </div>
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
