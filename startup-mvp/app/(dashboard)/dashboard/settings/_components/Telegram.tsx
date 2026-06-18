"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Send } from "lucide-react";
import { getSetting, upsertSetting } from "../_actions/settings.action";

export default function Telegram() {
  const [formData, setFormData] = useState({
    botToken: "",
    chatId: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    const fetchTelegramConfig = async () => {
      try {
        setIsLoading(true);
        const result = await getSetting("telegram_config", "accounts");
        
        if (result.success && result.setting) {
          const settings = result.setting.settings as any;
          setFormData({
            botToken: settings?.botToken || "",
            chatId: settings?.chatId || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch Telegram config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTelegramConfig();
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "telegram_config",
          category: "accounts",
          title: "Telegram Configuration",
          settings: formData,
          isGlobal: false,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "Telegram settings updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save telegram settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save Telegram settings:", error);
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
          <h1 className="text-2xl font-semibold">Telegram</h1>
          <p className="text-sm text-muted-foreground">Manage your Telegram integration</p>
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
        <h1 className="text-2xl font-semibold">Telegram</h1>
        <p className="text-sm text-muted-foreground">Configure Telegram Bot for notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            Bot Configuration
          </CardTitle>
          <CardDescription>
            Enter your Bot Token from @BotFather and your target Chat ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot API Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="123456789:ABCDE..."
              value={formData.botToken}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              placeholder="-1001234567890"
              value={formData.chatId}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              Personal Chat ID or Group/Channel ID starting with -100
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
