"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { getSetting, upsertSetting } from "../_actions/settings.action";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SystemSettings from "./SystemSettings";

// ... existing constants ...
const TIMEZONES = [
  { value: "Asia/Dhaka", label: "System settings - (GMT+06:00) Bangladesh Standard Time - Dhaka" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time - New York" },
];

const DATE_FORMATS = [
  { value: "DD MMM, YYYY", label: "System settings - 12 Feb, 2026" },
  { value: "MM/DD/YYYY", label: "02/12/2026" },
  { value: "YYYY-MM-DD", label: "2026-02-12" },
];

const TIME_FORMATS = [
  { value: "HH:mm", label: "System Settings - 12:42" },
  { value: "hh:mm A", label: "12:42 PM" },
];

const NUMBER_FORMATS = [
  { value: "en-US", label: "System Settings - 1,234.56" },
  { value: "de-DE", label: "1.234,56" },
];

const WEEK_DAYS = [
  { value: "monday", label: "System settings - Monday" },
  { value: "sunday", label: "Sunday" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "bn", label: "Bengali" },
];

const AppearanceCard = ({ id, label, active, onClick, children }: any) => (
  <div 
    className="group space-y-2 cursor-pointer"
    onClick={() => onClick(id)}
  >
    <Card 
      className={cn(
        "relative w-full aspect-[4/3] overflow-hidden border-2 transition-all p-0 shadow-none",
        active 
          ? "border-primary ring-1 ring-primary/20" 
          : "border-muted group-hover:border-muted-foreground/30 text-muted-foreground"
      )}
    >
      {children}
      {active && (
        <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
          <Check className="h-3 w-3" />
        </div>
      )}
    </Card>
    <span className={cn(
      "text-xs font-medium transition-colors block text-center", 
      active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
    )}>
      {label}
    </span>
  </div>
);

export default function Experience() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isChanged, setIsChanged] = useState(false);
  const [settings, setSettings] = useState({
    appearance: "system",
    language: "en",
    timezone: "Asia/Dhaka",
    dateFormat: "DD MMM, YYYY",
    timeFormat: "HH:mm",
    numberFormat: "en-US",
    calendarStartDay: "monday",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function fetchSettings() {
      const response = await getSetting("preferences", "experience");
      if (response.success && response.setting) {
        const savedSettings = response.setting.settings as any;
        setSettings((prev) => ({ ...prev, ...savedSettings }));
        
        if (savedSettings.appearance) {
          setTheme(savedSettings.appearance);
        }
      } else if (theme) {
        // Initial sync of settings state with current theme if no DB record
        setSettings(prev => ({ ...prev, appearance: theme }));
      }
    }
    fetchSettings();
  }, [mounted]); // Removed setTheme, theme to prevent feedback loops

  const handleUpdate = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsChanged(true);

    if (key === "appearance") {
      setTheme(value);
    }
  };

  if (!mounted) return null;

  const handleSave = async () => {
    startTransition(async () => {
      const response = await upsertSetting({
        code: "preferences",
        category: "experience",
        title: "User Experience Preferences",
        settings: settings,
      });

      if (response.success) {
        setIsChanged(false);
      }
    });
  };

  return (
    <Tabs defaultValue="ui" className="max-w-xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Experience</h1>
          <p className="text-sm text-muted-foreground">Manage your interface and system preferences.</p>
        </div>
        <TabsList>
          <TabsTrigger value="ui">UI & Appearance</TabsTrigger>
          <TabsTrigger value="general">System General</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="ui" className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Appearance</h2>
          <div className="grid grid-cols-3 gap-3">
            <AppearanceCard 
              id="light" 
              label="Light" 
              active={settings.appearance === "light"}
              onClick={(id: string) => handleUpdate("appearance", id)}
            >
              <div className="h-full w-full bg-[#f8f9fa] p-2.5 flex items-center justify-center">
                <div className="bg-white rounded p-2.5 shadow-xs border border-black/5">
                  <span className="text-base font-medium text-black leading-none">Aa</span>
                </div>
              </div>
            </AppearanceCard>

            <AppearanceCard 
              id="dark" 
              label="Dark" 
              active={settings.appearance === "dark"}
              onClick={(id: string) => handleUpdate("appearance", id)}
            >
              <div className="h-full w-full bg-[#0a0a0a] p-2.5 flex items-center justify-center">
                <div className="bg-[#1a1a1a] rounded p-2.5 shadow-xs border border-white/5">
                  <span className="text-base font-medium text-white leading-none">Aa</span>
                </div>
              </div>
            </AppearanceCard>

            <AppearanceCard 
              id="system" 
              label="System settings" 
              active={settings.appearance === "system"}
              onClick={(id: string) => handleUpdate("appearance", id)}
            >
              <div className="h-full w-full flex">
                <div className="w-1/2 bg-[#f8f9fa] p-2 flex items-center justify-center border-r border-black/10">
                  <div className="bg-white rounded p-1.5 shadow-xs border border-black/5">
                    <span className="text-sm font-medium text-black leading-none">Aa</span>
                  </div>
                </div>
                <div className="w-1/2 bg-[#1a1a1a] p-2 flex items-center justify-center">
                  <div className="bg-[#0a0a0a] rounded p-1.5 shadow-xs border border-white/5">
                    <span className="text-sm font-medium text-white leading-none">Aa</span>
                  </div>
                </div>
              </div>
            </AppearanceCard>
          </div>
        </section>

        <section className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Language</h2>
            <p className="text-xs text-muted-foreground/60">Select your preferred language</p>
          </div>
          <Select 
            value={settings.language} 
            onValueChange={(v) => handleUpdate("language", v)}
          >
            <SelectTrigger className="w-full h-9 bg-muted/20 text-sm">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-5">
          <div className="space-y-0.5">
            <h2 className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">Formats</h2>
            <p className="text-xs text-muted-foreground/60">Configure date, time, number, timezone, and calendar start day</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Time zone</Label>
              <Select 
                value={settings.timezone} 
                onValueChange={(v) => handleUpdate("timezone", v)}
              >
                <SelectTrigger className="w-full h-9 bg-muted/20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Date format</Label>
              <Select 
                value={settings.dateFormat} 
                onValueChange={(v) => handleUpdate("dateFormat", v)}
              >
                <SelectTrigger className="w-full h-9 bg-muted/20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map(df => (
                    <SelectItem key={df.value} value={df.value}>{df.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Time format</Label>
              <Select 
                value={settings.timeFormat} 
                onValueChange={(v) => handleUpdate("timeFormat", v)}
              >
                <SelectTrigger className="w-full h-9 bg-muted/20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Number format</Label>
              <Select 
                value={settings.numberFormat} 
                onValueChange={(v) => handleUpdate("numberFormat", v)}
              >
                <SelectTrigger className="w-full h-9 bg-muted/20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_FORMATS.map(nf => (
                    <SelectItem key={nf.value} value={nf.value}>{nf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Calendar start day</Label>
              <Select 
                value={settings.calendarStartDay} 
                onValueChange={(v) => handleUpdate("calendarStartDay", v)}
              >
                <SelectTrigger className="w-full h-9 bg-muted/20 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map(wd => (
                    <SelectItem key={wd.value} value={wd.value}>{wd.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

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
              "Save changes"
            )}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="general">
        <SystemSettings />
      </TabsContent>
    </Tabs>
  );
}
