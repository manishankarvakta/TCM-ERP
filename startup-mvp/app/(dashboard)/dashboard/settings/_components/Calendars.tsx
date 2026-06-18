"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Calendar, Globe } from "lucide-react";
import { getSetting, upsertSetting } from "../_actions/settings.action";

export default function Calendars() {
  const [formData, setFormData] = useState({
    googleEnabled: false,
    outlookEnabled: false,
    primaryCalendarId: "",
    timezone: "UTC",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    const fetchCalendarConfig = async () => {
      try {
        setIsLoading(true);
        const result = await getSetting("calendar_config", "accounts");
        
        if (result.success && result.setting) {
          const settings = result.setting.settings as any;
          setFormData({
            googleEnabled: settings?.googleEnabled || false,
            outlookEnabled: settings?.outlookEnabled || false,
            primaryCalendarId: settings?.primaryCalendarId || "",
            timezone: settings?.timezone || "UTC",
          });
        }
      } catch (error) {
        console.error("Failed to fetch Calendar config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarConfig();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "calendar_config",
          category: "accounts",
          title: "Calendar Configuration",
          settings: formData,
          isGlobal: false,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "Calendar settings updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save calendar settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save Calendar settings:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Calendars</h1>
          <p className="text-sm text-muted-foreground">Manage your calendar integrations</p>
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
        <h1 className="text-2xl font-semibold">Calendars</h1>
        <p className="text-sm text-muted-foreground">Sync your business events across platforms</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Sync Settings
            </CardTitle>
            <CardDescription>
              Basic configuration for your calendar synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Google Calendar Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Sync upcoming appointments with your Google Calendar
                </p>
              </div>
              <Switch
                checked={formData.googleEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, googleEnabled: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Outlook Calendar Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Sync upcoming appointments with your Outlook Calendar
                </p>
              </div>
              <Switch
                checked={formData.outlookEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, outlookEnabled: checked }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Input
                  id="timezone"
                  placeholder="UTC"
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryCalendarId">Primary Calendar ID</Label>
                <Input
                  id="primaryCalendarId"
                  placeholder="Primary"
                  value={formData.primaryCalendarId}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryCalendarId: e.target.value }))}
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
      </div>
      <Toaster toasts={toasts as any} onClose={closeToast} />
    </div>
  );
}
