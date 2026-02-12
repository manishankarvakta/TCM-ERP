"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import PermissionMatrix from "@/components/permissions/permission-matrix";
import {
  createPermissionTemplate,
  updatePermissionTemplate,
} from "@/app/actions/permission.action";
import type {
  EnhancedPermissions,
  PermissionTemplateData,
  PartialPermissions,
} from "@/types/permissions";
import {
  isEnhancedPermissions,
  convertToEnhancedPermissions,
} from "@/types/permissions";
import { FiSave, FiX } from "react-icons/fi";

interface TemplateFormProps {
  template?: PermissionTemplateData | null;
  mode: "create" | "edit";
}

export default function TemplateForm({ template, mode }: TemplateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  
  // Convert legacy permissions to enhanced format if needed
  const initialPermissions = template?.permissions
    ? isEnhancedPermissions(template.permissions)
      ? (template.permissions as Partial<EnhancedPermissions>)
      : convertToEnhancedPermissions(template.permissions)
    : {};
  
  const [permissions, setPermissions] = useState<Partial<EnhancedPermissions>>(
    initialPermissions
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes
  useEffect(() => {
    if (mode === "create") {
      setHasChanges(name.length > 0 || Object.keys(permissions).length > 0);
    } else {
      const nameChanged = name !== (template?.name || "");
      const descChanged = description !== (template?.description || "");
      const templatePerms = template?.permissions
        ? isEnhancedPermissions(template.permissions)
          ? (template.permissions as Partial<EnhancedPermissions>)
          : convertToEnhancedPermissions(template.permissions)
        : {};
      const permsChanged =
        JSON.stringify(permissions) !== JSON.stringify(templatePerms);
      setHasChanges(nameChanged || descChanged || permsChanged);
    }
  }, [name, description, permissions, template, mode]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let result;
      if (mode === "create") {
        result = await createPermissionTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
      } else {
        if (!template) return;
        result = await updatePermissionTemplate(template.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          permissions,
        });
      }

      if (result.success) {
        toast({
          title: mode === "create" ? "Template created" : "Template updated",
          description:
            mode === "create"
              ? "Permission template has been successfully created."
              : "Permission template has been successfully updated.",
        });
        router.push("/dashboard/settings/permissions/templates");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${mode} template`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const pageCount = Object.keys(permissions).length;
  const operationCount = Object.values(permissions).reduce(
    (total, pagePerm) =>
      total + ((pagePerm as any)?.operations?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a new permission template"
              : "Edit permission template details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Manager, Sales Executive, Accounts"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Configure permissions for each module and operation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {operationCount} {operationCount === 1 ? "operation" : "operations"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PermissionMatrix
            permissions={permissions}
            onChange={setPermissions}
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
          <FiX className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          <FiSave className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : mode === "create" ? "Create Template" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

