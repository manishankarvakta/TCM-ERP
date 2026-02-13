"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getSetting, upsertSetting } from "../_actions/settings.action";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SystemSettings() {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isChanged, setIsChanged] = useState(false);
  const [settings, setSettings] = useState({
    fileSizeLimit: "10",
    supportedFileTypes: "jpg,png,pdf,docx",
    allowExports: true,
    allowImports: true,
    enablePublicSharing: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function fetchSettings() {
      const response = await getSetting("system", "general");
      if (response.success && response.setting) {
        const savedSettings = response.setting.settings as any;
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      }
    }
    fetchSettings();
  }, [mounted]);

  const handleUpdate = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsChanged(true);
  };

  const handleSave = async () => {
    startTransition(async () => {
      const response = await upsertSetting({
        code: "system",
        category: "general",
        title: "System General Settings",
        settings: settings,
        isGlobal: true, // System settings are usually global
      });

      if (response.success) {
        setIsChanged(false);
        toast.success("System settings saved successfully");
      } else {
        toast.error(response.error || "Failed to save settings");
      }
    });
  };

  if (!mounted) return null;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-lg font-medium">System Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Manage system-wide settings for files, uploads, and data handling.
        </p>
      </div>

      <div className="space-y-6">
        {/* File Upload Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">File Uploads</h3>
          
          <div className="grid gap-2">
            <Label htmlFor="fileSizeLimit">Max File Size (MB)</Label>
            <Input
              id="fileSizeLimit"
              type="number"
              value={settings.fileSizeLimit}
              onChange={(e) => handleUpdate("fileSizeLimit", e.target.value)}
              placeholder="e.g. 10"
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">Maximum allowed file size for user uploads.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="supportedFileTypes">Supported File Extensions</Label>
            <Input
              id="supportedFileTypes"
              value={settings.supportedFileTypes}
              onChange={(e) => handleUpdate("supportedFileTypes", e.target.value)}
              placeholder="e.g. jpg, png, pdf"
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of allowed file extensions.</p>
          </div>
        </section>

        {/* Data Handling Settings */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Data Handling</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowExports"
              checked={settings.allowExports}
              onCheckedChange={(checked) => handleUpdate("allowExports", checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="allowExports" className="cursor-pointer">Enable Data Export</Label>
              <p className="text-xs text-muted-foreground">Allow users to export data to CSV/Excel.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allowImports"
              checked={settings.allowImports}
              onCheckedChange={(checked) => handleUpdate("allowImports", checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="allowImports" className="cursor-pointer">Enable Data Import</Label>
              <p className="text-xs text-muted-foreground">Allow users to import data from external sources.</p>
            </div>
          </div>

           <div className="flex items-center space-x-2">
            <Checkbox
              id="enablePublicSharing"
              checked={settings.enablePublicSharing}
              onCheckedChange={(checked) => handleUpdate("enablePublicSharing", checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="enablePublicSharing" className="cursor-pointer">Public File Sharing</Label>
              <p className="text-xs text-muted-foreground">Allow generating public links for uploaded files.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="pt-6 border-t flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={!isChanged || isPending}
          className="min-w-[120px]"
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
