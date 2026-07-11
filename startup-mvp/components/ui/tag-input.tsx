"use client";

import React, { useState, KeyboardEvent, useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TagInput({ value, onChange, placeholder = "Type and press enter...", disabled = false, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (value) {
      setTags(value.split(",").map(t => t.trim()).filter(Boolean));
    } else {
      setTags([]);
    }
  }, [value]);

  const updateParent = (newTags: string[]) => {
    onChange(newTags.join(","));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      updateParent(newTags);
      setInputValue("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, i) => i !== indexToRemove);
    setTags(newTags);
    updateParent(newTags);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1 max-w-full">
            <span className="truncate max-w-[200px]" title={tag}>{tag}</span>
            <button
              type="button"
              className="rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ml-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  removeTag(index);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => removeTag(index)}
              disabled={disabled}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
            if (inputValue.trim()) {
                addTag();
            }
        }}
        placeholder={tags.length === 0 ? placeholder : "Add another link..."}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
