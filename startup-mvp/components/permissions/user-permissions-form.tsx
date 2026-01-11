"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PermissionMatrix from "@/components/permissions/permission-matrix";
import TemplateSelector from "@/components/permissions/template-selector";
import { updateUserPermissionsAction, resetUserPermissionsToTemplate } from "@/app/actions/permission.action";
import type {
  EnhancedPermissions,
  PartialPermissions,
  PermissionTemplateData,
  Operation,
} from "@/types/permissions";
import {
  isEnhancedPermissions,
  convertToEnhancedPermissions,
} from "@/types/permissions";
import { FiSave, FiX } from "react-icons/fi";

interface UserPermissionsFormProps {
  userId: string;
  initialPermissions: PartialPermissions;
  initialTemplateId: string | null;
  templates: PermissionTemplateData[];
}

export default function UserPermissionsForm({
  userId,
  initialPermissions,
  initialTemplateId,
  templates,
}: UserPermissionsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);
  
  // Convert legacy permissions to enhanced format if needed
  const initialPermsEnhanced = isEnhancedPermissions(initialPermissions)
    ? (initialPermissions as Partial<EnhancedPermissions>)
    : convertToEnhancedPermissions(initialPermissions);
  
  const [permissions, setPermissions] = useState<Partial<EnhancedPermissions>>(
    initialPermsEnhanced
  );

  console.log(permissions);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes
  useEffect(() => {
    const templateChanged = templateId !== initialTemplateId;
    const permissionsChanged =
      JSON.stringify(permissions) !== JSON.stringify(initialPermsEnhanced);
    setHasChanges(templateChanged || permissionsChanged);
  }, [templateId, permissions, initialTemplateId, initialPermsEnhanced]);

  const handleTemplateChange = (newTemplateId: string | null) => {
    setTemplateId(newTemplateId);
    
    // If template is selected, load its permissions
    if (newTemplateId) {
      const template = templates.find((t) => t.id === newTemplateId);
      if (template) {
        const templatePerms = isEnhancedPermissions(template.permissions)
          ? (template.permissions as Partial<EnhancedPermissions>)
          : convertToEnhancedPermissions(template.permissions);
        setPermissions(templatePerms);
      }
    } else {
      // If no template selected, clear permissions
      setPermissions({});
    }
  };

  const handleReset = async () => {
    if (!templateId) return;

    setIsSaving(true);

    try {
      const result = await resetUserPermissionsToTemplate(userId, templateId);

      if (result.success && result.permissions) {
        // Convert reset permissions to enhanced format for display
        const resetPerms = isEnhancedPermissions(result.permissions)
          ? (result.permissions as Partial<EnhancedPermissions>)
          : convertToEnhancedPermissions(result.permissions as Partial<Record<string, Operation[]>>);
        
        setPermissions(resetPerms);
        
        toast({
          title: "Permissions reset",
          description: "User permissions have been reset to template permissions.",
        });
        router.refresh();
        setHasChanges(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reset permissions",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionsChange = (newPermissions: Partial<EnhancedPermissions>) => {
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Pass enhanced permissions directly to the action
      const result = await updateUserPermissionsAction(
        userId,
        templateId,
        permissions
      );

      if (result.success) {
        toast({
          title: "Permissions updated",
          description: "User permissions have been successfully updated.",
        });
        router.refresh();
        setHasChanges(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update permissions",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTemplateId(initialTemplateId);
    setPermissions(initialPermsEnhanced);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <TemplateSelector
            templates={templates}
            selectedTemplateId={templateId}
            onSelect={handleTemplateChange}
            onReset={handleReset}
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <PermissionMatrix
            permissions={permissions}
            onChange={handlePermissionsChange}
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <FiX className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <FiSave className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

