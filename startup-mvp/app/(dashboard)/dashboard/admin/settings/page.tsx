"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Shield, Mail, Database, Globe, Key, RefreshCw } from "lucide-react";
import { getAdminSettingsAction, updateAdminSettingsAction } from "@/app/actions/system-operations.action";
import { toast } from "sonner";

export default function GlobalAdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "CRM Platform",
    timezone: "Asia/Dhaka",
    currency: "USD",
    rateLimitMax: 100,
    sessionTimeoutMinutes: 120,
    autoBackupEnabled: true,
    backupFrequency: "Day",
    backupTime: "02:00",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    metaToken: "",
  });

  const fetchSettings = async () => {
    setLoading(true);
    const res = await getAdminSettingsAction();
    if (res.success && res.settings) {
      setFormData((prev) => ({ ...prev, ...res.settings }));
    } else {
      toast.error(res.error || "Failed to load admin settings");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateAdminSettingsAction(formData);
    if (res.success) {
      toast.success(res.message);
      fetchSettings();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Global Admin & System Settings</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              System Admin Scope
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure system-wide parameters, security thresholds, automated backup rules, and API integration keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleSubmit} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Settings Form Portal */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-background border p-1 grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Backups
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email SMTP
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Key className="w-4 h-4" /> Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> General Platform Configuration
              </CardTitle>
              <CardDescription>System organization parameters and localization defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company / Platform Title</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency Code</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Security & Rate Limiting Thresholds
              </CardTitle>
              <CardDescription>Authentication security rules and API protection boundaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimitMax">Max Requests Per Minute (Rate Limit)</Label>
                  <Input
                    id="rateLimitMax"
                    type="number"
                    value={formData.rateLimitMax}
                    onChange={(e) => setFormData({ ...formData, rateLimitMax: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeoutMinutes">Session Inactivity Timeout (Minutes)</Label>
                  <Input
                    id="sessionTimeoutMinutes"
                    type="number"
                    value={formData.sessionTimeoutMinutes}
                    onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 120 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Schedule Tab */}
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" /> Automated Backup Schedule
              </CardTitle>
              <CardDescription>Configure automatic node-cron disaster recovery creation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl">
                <div>
                  <h4 className="font-semibold text-foreground">Enable Automated Backups</h4>
                  <p className="text-xs text-muted-foreground">Automatically trigger node-cron backup scheduler task</p>
                </div>
                <Switch
                  checked={formData.autoBackupEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoBackupEnabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Backup Frequency</Label>
                  <Select
                    value={formData.backupFrequency}
                    onValueChange={(val) => setFormData({ ...formData, backupFrequency: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day">Daily</SelectItem>
                      <SelectItem value="Week">Weekly (Sundays)</SelectItem>
                      <SelectItem value="Month">Monthly (1st of Month)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backupTime">Execution Time (24h HH:mm)</Label>
                  <Input
                    id="backupTime"
                    value={formData.backupTime}
                    onChange={(e) => setFormData({ ...formData, backupTime: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email SMTP Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Outbound SMTP Email Configuration
              </CardTitle>
              <CardDescription>Configure Nodemailer SMTP server transport options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Server Host</Label>
                  <Input
                    id="smtpHost"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* External Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> Meta & WhatsApp API Credentials
              </CardTitle>
              <CardDescription>Meta Cloud API Tokens for Meta Lead Ads & WhatsApp Webhooks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaToken">Meta Graph API Page Access Token</Label>
                <Input
                  id="metaToken"
                  type="password"
                  value={formData.metaToken}
                  placeholder="EAA..."
                  onChange={(e) => setFormData({ ...formData, metaToken: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

