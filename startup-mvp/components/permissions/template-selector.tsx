"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiRefreshCw } from "react-icons/fi";
import type { PermissionTemplateData } from "@/types/permissions";

interface TemplateSelectorProps {
  templates: PermissionTemplateData[];
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null) => void;
  onReset?: () => void;
  disabled?: boolean;
}

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  onReset,
  disabled = false,
}: TemplateSelectorProps) {
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-2">
      <Label htmlFor="template-select">Designation Template</Label>
      <div className="flex items-center gap-2">
        <Select
          value={selectedTemplateId || "none"}
          onValueChange={(value) => onSelect(value === "none" ? null : value)}
          disabled={disabled}
        >
          <SelectTrigger id="template-select" className="w-full text-left">
            <SelectValue placeholder="Select a template" className="text-left  px-2 py-4" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-left justify-between w-full">
                <span>No Template</span>
                <Badge variant="outline" className="ml-2">
                  Custom
                </Badge>
              </div>
            </SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span>{template.name}</span>
                    {template.description && (
                      <span className="text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplateId && onReset && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onReset}
            disabled={disabled}
            title="Reset to template permissions"
          >
            <FiRefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      {selectedTemplate && (
        <p className="text-sm text-muted-foreground">
          Template: <span className="font-medium">{selectedTemplate.name}</span>
          {selectedTemplate.description && (
            <> - {selectedTemplate.description}</>
          )}
        </p>
      )}
    </div>
  );
}

