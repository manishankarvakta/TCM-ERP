"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FiMoreVertical, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import Link from "next/link";
import { deletePermissionTemplate } from "@/app/actions/permission.action";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { PermissionTemplateData } from "@/types/permissions";
import { MODULES } from "@/types/permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PermissionTemplatesListProps {
  initialTemplates: PermissionTemplateData[];
}

export default function PermissionTemplatesList({
  initialTemplates,
}: PermissionTemplatesListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (templateId: string, templateName: string) => {
    setDeleteTarget({ id: templateId, name: templateName });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id: templateId, name: templateName } = deleteTarget;
    setDeleteTarget(null);

    setDeletingId(templateId);
    const result = await deletePermissionTemplate(templateId);

    if (result.success) {
      setTemplates(templates.filter((t) => t.id !== templateId));
      toast({
        title: "Template deleted",
        description: `Template "${templateName}" has been deleted.`,
      });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete template",
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  const getModuleCount = (permissions: any) => {
    return Object.keys(permissions || {}).length;
  };

  const getOperationCount = (permissions: any) => {
    return Object.values(permissions || {}).reduce(
      (total: number, ops: any) => total + (Array.isArray(ops) ? ops.length : 0),
      0
    );
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No templates found</p>
          <Button asChild>
            <Link href="/dashboard/settings/permissions/templates/new">
              <FiPlus className="mr-2 h-4 w-4" />
              Create First Template
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const moduleCount = getModuleCount(template.permissions);
        const operationCount = getOperationCount(template.permissions);

        return (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <FiMoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/settings/permissions/templates/${template.id}/edit`}>
                        <FiEdit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(template.id, template.name)}
                      disabled={deletingId === template.id}
                      className="text-destructive"
                    >
                      <FiTrash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {moduleCount} {moduleCount === 1 ? "module" : "modules"}
                </Badge>
                <Badge variant="secondary">
                  {operationCount} {operationCount === 1 ? "operation" : "operations"}
                </Badge>
                {!template.isActive && (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deleteTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

