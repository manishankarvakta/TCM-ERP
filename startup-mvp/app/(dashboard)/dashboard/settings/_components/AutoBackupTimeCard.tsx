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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const autoBackupSchema = z.object({
  isAutoBackupEnabled: z.boolean().default(false),
  backupTime: z.string().min(1, "Backup time is required").regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  enableGoogleDrive: z.boolean().default(false), // A UI-only toggle to indicate intent to use Drive (actual keys are in another tab)
  backupType: z.enum(['database', 'files', 'full']).default('full'),
  backupFrequency: z.enum(['once', 'daily', 'weekly', 'monthly']).default('daily'),
});

type AutoBackupFormValues = z.infer<typeof autoBackupSchema>;

export function AutoBackupTimeCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<AutoBackupFormValues>({
    resolver: zodResolver(autoBackupSchema) as any,
    defaultValues: {
      isAutoBackupEnabled: false,
      backupTime: "02:00",
      enableGoogleDrive: false,
      backupType: "full",
      backupFrequency: "daily",
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
              isAutoBackupEnabled: data.settings.isAutoBackupEnabled ?? false,
              backupTime: data.settings.backupTime ?? "02:00",
              enableGoogleDrive: data.settings.enableGoogleDrive ?? false,
              backupType: data.settings.backupType ?? "full",
              backupFrequency: data.settings.backupFrequency ?? "daily",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load auto backup settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [form]);

  async function onSubmit(data: AutoBackupFormValues) {
    setSaving(true);
    try {
      // 1. Save settings
      const saveRes = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!saveRes.ok) throw new Error("Failed to save settings");

      // 2. Trigger scheduler update
      const scheduleRes = await fetch('/api/backup/schedule', {
        method: 'POST',
      });
      
      if (!scheduleRes.ok) throw new Error("Settings saved but failed to restart scheduler");

      toast({
        title: "Success",
        description: "Auto backup schedule updated successfully",
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
      <Card>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Automatic Backup Schedule</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Configure automatic backups to protect your data.
            </CardDescription>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={saving} size="sm" variant="outline" className="h-8">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <Form {...form}>
          <form className="flex flex-col lg:flex-row lg:flex-wrap items-start lg:items-center gap-x-6 gap-y-5">
            
            <FormField
              control={form.control}
              name="isAutoBackupEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium m-0 cursor-pointer">Auto Backup</FormLabel>
                </FormItem>
              )}
            />

            <div className="w-px h-5 bg-border hidden lg:block mx-1" />

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <FormField
                control={form.control}
                name="backupFrequency"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormLabel className="text-sm text-muted-foreground m-0">Every</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px] h-9">
                          <SelectValue placeholder="Frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="daily">Day</SelectItem>
                        <SelectItem value="weekly">Week</SelectItem>
                        <SelectItem value="monthly">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backupTime"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormLabel className="text-sm text-muted-foreground m-0">at</FormLabel>
                    <FormControl>
                      <Input type="time" className="w-[125px] h-9" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backupType"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormLabel className="text-sm text-muted-foreground m-0">taking</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[110px] h-9">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="files">Files</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormLabel className="text-sm text-muted-foreground m-0 hidden sm:block">backup</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex-1 hidden lg:block" />

            <FormField
              control={form.control}
              name="enableGoogleDrive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium m-0 cursor-pointer text-muted-foreground">Sync to Drive</FormLabel>
                </FormItem>
              )}
            />

          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
