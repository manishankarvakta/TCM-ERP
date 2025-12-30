"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
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
  const [searchTerm, setSearchTerm] = useState("");
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleValueChange = (value: string) => {
    onSelect(value === "none" ? null : value);
  };

  // Filter templates based on search
  const filteredTemplates = templates.filter((template) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      template.name.toLowerCase().includes(search) ||
      template.description?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-2">
      <Label htmlFor="template-select">Designation Template</Label>
      <div className="flex items-center gap-2">
        <Select
          value={selectedTemplateId || "none"}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full text-left">
            <SelectValue placeholder="Select a template">
              {selectedTemplate ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <span>{selectedTemplate.name}</span>
                    {selectedTemplate.description && (
                      <span className="text-xs text-muted-foreground">
                        {selectedTemplate.description}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>No Template</span>
                  <Badge variant="outline" className="ml-2">
                    Custom
                  </Badge>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <div className="relative">
                <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                  className="pl-8 h-8 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <SelectItem value="none" className="text-left">
                <div className="flex items-center justify-between w-full">
                  <span>No Template</span>
                  <Badge variant="outline" className="ml-2">
                    Custom
                  </Badge>
                </div>
              </SelectItem>
              {filteredTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id} className="text-left">
                  <div className="flex flex-col items-start">
                    <span>{template.name}</span>
                    {template.description && (
                      <span className="text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
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

