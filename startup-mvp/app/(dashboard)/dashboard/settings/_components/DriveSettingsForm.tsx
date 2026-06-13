"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CloudUpload } from "lucide-react";

const driveSettingsSchema = z.object({
  googleDriveFolderId: z.string().optional(),
  googleServiceAccountJson: z.string().optional(),
});

type DriveSettingsFormValues = z.infer<typeof driveSettingsSchema>;

export function DriveSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<DriveSettingsFormValues>({
    resolver: zodResolver(driveSettingsSchema),
    defaultValues: {
      googleDriveFolderId: "",
      googleServiceAccountJson: "",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings/backup');
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            form.reset({
              googleDriveFolderId: data.settings.googleDriveFolderId ?? "",
              googleServiceAccountJson: data.settings.googleServiceAccountJson ?? "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load drive settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [form]);

  async function onSubmit(data: DriveSettingsFormValues) {
    setSaving(true);
    try {
      const saveRes = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!saveRes.ok) throw new Error("Failed to save settings");

      // Note: we don't strictly need to restart the scheduler for Drive API key changes, 
      // but it doesn't hurt. The upload logic reads the config during execution anyway, 
      // but let's keep it safe.

      toast({
        title: "Success",
        description: "Google Drive API keys saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <CloudUpload className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-medium">Google Drive Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Configure your service account to securely upload backups.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="googleDriveFolderId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drive Folder ID</FormLabel>
                <FormControl>
                  <Input placeholder="1abc2def..." {...field} />
                </FormControl>
                <FormDescription>
                  The ID of the Google Drive folder to upload to. (Found in the folder URL).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="googleServiceAccountJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Account JSON Credentials</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='{ "type": "service_account", "project_id": "..." }' 
                    className="font-mono h-48"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Paste your entire Google Cloud Service Account JSON key here. Ensure the service account email is shared with the Drive folder.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Drive Keys
          </Button>
        </form>
      </Form>
    </div>
  );
}
