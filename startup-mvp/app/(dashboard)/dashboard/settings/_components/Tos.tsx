"use client";

import { useState, useEffect, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, Save, FileText, LayoutGrid, Smartphone, Globe, Sparkles, Trash2, Plus, Copy } from "lucide-react";
import { getSetting, upsertSetting, getSettingsByCategory, deleteSetting } from "../_actions/settings.action";
import { QUOTATION_TEMPLATES } from "@/lib/quotation/templates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function TOS() {
  const [content, setContent] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [terminationPolicy, setTerminationPolicy] = useState("");
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, toasts, closeToast } = useToast();

  useEffect(() => {
    // Fetch TOS and Payment Terms settings
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const [tosResult, customTplResult] = await Promise.all([
          getSetting("tos", "quotation"),
          getSettingsByCategory("quotation_template")
        ]);
        
        if (tosResult.success && tosResult.setting) {
          const settings = tosResult.setting.settings as { content?: string, paymentTerms?: string, refundPolicy?: string, terminationPolicy?: string };
          setContent(settings?.content || "");
          setPaymentTerms(settings?.paymentTerms || "");
          setRefundPolicy(settings?.refundPolicy || "");
          setTerminationPolicy(settings?.terminationPolicy || "");
        } else {
          setContent("");
          setPaymentTerms("");
          setRefundPolicy("");
          setTerminationPolicy("");
        }

        if (customTplResult.success) {
          setCustomTemplates(customTplResult.settings || []);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast({
          title: "Error",
          description: "Failed to load quotation settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: "tos",
          category: "quotation",
          title: "Quotation Settings (TOS & Payment Terms)",
          settings: {
            content: content,
            paymentTerms: paymentTerms,
            refundPolicy: refundPolicy,
            terminationPolicy: terminationPolicy,
          },
          isGlobal: true, // TOS/Payment Terms are global
        });

        if (result.success) {
          toast({
            title: "Success",
            description: result.isUpdate
              ? "Settings updated successfully"
              : "Settings saved successfully",
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to save settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to save settings:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while saving",
          variant: "destructive",
        });
      }
    });
  };

  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your template",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await upsertSetting({
          code: `tpl_${Date.now()}`,
          category: "quotation_template",
          title: newTemplateName,
          settings: {
            content: content,
            paymentTerms: paymentTerms,
            refundPolicy: refundPolicy,
            terminationPolicy: terminationPolicy,
          },
          isGlobal: true,
        });

        if (result.success) {
          toast({
            title: "Template Created",
            description: `Template "${newTemplateName}" has been saved.`,
          });
          setCustomTemplates([...customTemplates, result.setting]);
          setNewTemplateName("");
          setIsDialogOpen(false);
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({
          title: "Failed to Save Template",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    });
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) return;

    startTransition(async () => {
      try {
        const result = await deleteSetting(id);
        if (result.success) {
          setCustomTemplates(customTemplates.filter(t => t.id !== id));
          toast({
            title: "Template Deleted",
            description: `"${name}" has been removed.`,
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({
          title: "Delete Failed",
          description: error.message || "Could not delete template",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Quotation Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your defaults for terms and conditions
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
        <h1 className="text-2xl font-semibold">Quotation Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your terms, conditions, and payment terms for proposals
        </p>
      </div>

      {/* Quick Templates Section */}
      <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary/80 uppercase tracking-wider">Quick Templates</h2>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Click to apply</p>
        </div>
        
        <div className="space-y-4">
          {/* Built-in Templates */}
          <div className="flex flex-wrap gap-2">
            {QUOTATION_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.id}
                variant="outline"
                size="sm"
                className="bg-background hover:bg-primary/5 hover:text-primary transition-all border-primary/10 h-8"
                onClick={() => {
                  setContent(tpl.tos);
                  setPaymentTerms(tpl.paymentTerms);
                  setRefundPolicy(tpl.refundPolicy);
                  setTerminationPolicy(tpl.terminationPolicy);
                  toast({
                    title: `${tpl.name} Applied`,
                    description: "Remember to save your changes below.",
                  });
                }}
              >
                {tpl.category === 'software' && <LayoutGrid className="mr-2 h-3.5 w-3.5" />}
                {tpl.category === 'wordpress' && <Globe className="mr-2 h-3.5 w-3.5" />}
                {tpl.category === 'mobile' && <Smartphone className="mr-2 h-3.5 w-3.5" />}
                {tpl.name}
              </Button>
            ))}
          </div>

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <div className="pt-2 border-t border-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase italic">Your Custom Templates</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {customTemplates.map((tpl) => (
                  <div key={tpl.id} className="group relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-background hover:bg-primary/5 hover:text-primary transition-all border-primary/10 h-8 pr-8"
                      onClick={() => {
                        const s = tpl.settings as { content?: string, paymentTerms?: string, refundPolicy?: string, terminationPolicy?: string };
                        setContent(s?.content || "");
                        setPaymentTerms(s?.paymentTerms || "");
                        setRefundPolicy(s?.refundPolicy || "");
                        setTerminationPolicy(s?.terminationPolicy || "");
                        toast({
                          title: `"${tpl.title}" Applied`,
                          description: "Custom template loaded successfully.",
                        });
                      }}
                    >
                      <Copy className="mr-2 h-3 w-3 text-muted-foreground group-hover:text-primary" />
                      {tpl.title}
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(tpl.id, tpl.title);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Template"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* TOS Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tos-content" className="text-base font-medium">Terms and Conditions</Label>
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Enter your terms and conditions here..."
                className="min-h-[250px]"
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              General terms and conditions used in quotations.
            </p>
          </div>
        </div>

        {/* Payment Terms Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-terms" className="text-base font-medium">Payment Terms</Label>
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <RichTextEditor
                value={paymentTerms}
                onChange={setPaymentTerms}
                placeholder="Enter your default payment terms here..."
                className="min-h-[150px]"
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Specific payment terms and schedules for quotations.
            </p>
          </div>
        </div>

        {/* Refund Policy Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-policy" className="text-base font-medium">Refund Policy</Label>
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <RichTextEditor
                value={refundPolicy}
                onChange={setRefundPolicy}
                placeholder="Enter your default refund policy here..."
                className="min-h-[150px]"
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Standard refund and return policies for quotations.
            </p>
          </div>
        </div>

        {/* Termination Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="termination-policy" className="text-base font-medium">Termination / Cancellation Policy</Label>
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <RichTextEditor
                value={terminationPolicy}
                onChange={setTerminationPolicy}
                placeholder="Enter your default termination/cancellation terms here..."
                className="min-h-[150px]"
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Terms for cancelling projects or terminating services.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" type="button" className="gap-2">
                <Plus className="h-4 w-4" />
                Save as Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
                <DialogDescription>
                  Save these terms as a reusable template for future quotations.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Enterprise Software Template"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveAsTemplate} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>
      <Toaster toasts={toasts} onClose={closeToast} />
    </div>
  );
}
