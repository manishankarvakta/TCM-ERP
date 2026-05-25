"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface InlineAddRowProps {
  depth: number;
  placeholder?: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

export function InlineAddRow({ depth, placeholder = "Enter task name...", onSave, onCancel }: InlineAddRowProps) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus when row appears
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && title.trim()) {
      onSave(title.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex border-b border-border/50 bg-muted/20 h-12">
      {/* Sticky Left Sidebar Area */}
      <div 
        className="w-[300px] shrink-0 sticky left-0 border-r border-border/50 z-10 flex items-center pr-4" 
        style={{ paddingLeft: `${(depth * 20) + 16}px` }}
      >
        <div className="flex items-center gap-2 w-full ml-6">
          <Input 
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-8 text-sm bg-background border-input"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={() => title.trim() && onSave(title.trim())}
            disabled={!title.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right Timeline Area (Empty for inline add row) */}
      <div className="flex-1 min-w-0" />
    </div>
  );
}
