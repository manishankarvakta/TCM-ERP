"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { Loader2, Save } from "lucide-react";
import { getSetting, upsertSetting } from "../_actions/settings.action";

export default function TOS() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    // Fetch TOS setting
    const fetchTOS = async () => {
      try {
        setIsLoading(true);
        const result = await getSetting("tos", "quotation");
        
        if (result.success && result.setting) {
          const settings = result.setting.settings as { content?: string };
          setContent(settings?.content || "");
        } else {
          setContent("");
        }
      } catch (error) {
        console.error("Failed to fetch TOS:", error);
        toast({
          title: "Error",
          description: "Failed to load terms and conditions",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTOS();
  }, [toast]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "tos",
          category: "quotation",
          title: "Terms of Service",
          settings: {
            content: content,
          },
          isGlobal: true, // TOS is global for all users
        });

        if (result.success) {
          toast({
            title: "Success",
            description: result.isUpdate
              ? "Terms and conditions updated successfully"
              : "Terms and conditions saved successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save terms and conditions",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save TOS:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while saving",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            Manage your terms and conditions
          </p>
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
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">
          Manage your terms and conditions for quotations
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tos-content">Terms and Conditions</Label>
          <Textarea
            id="tos-content"
            placeholder="Enter your terms and conditions here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            This content will be used in quotations. You can use plain text or basic formatting.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="min-w-[120px]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
      <Toaster toasts={toasts as any} onClose={closeToast} />
    </div>
  );
}
