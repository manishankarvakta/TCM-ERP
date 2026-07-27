"use client";

import * as React from "react";
import { FiSearch } from "react-icons/fi";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  renderOption?: (option: SearchableSelectOption) => React.ReactNode;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  className,
  allowClear = false,
  renderOption,
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue === value && allowClear ? null : selectedValue);
    setSearchQuery("");
  };

  const defaultRenderOption = (option: SearchableSelectOption) => (
    <div className="flex items-center gap-2">
      <span className="truncate">{option.label}</span>
      {option.description && (
        <span className="text-xs text-muted-foreground truncate">
          ({option.description})
        </span>
      )}
    </div>
  );

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [open, filteredOptions]);

  return (
    <Select
      value={value || ""}
      onValueChange={handleSelect}
      disabled={disabled}
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery("");
      }}
    >
      <SelectTrigger className={cn("w-full text-left font-normal", !value && "text-muted-foreground", className)}>
        <SelectValue placeholder={placeholder}>
          {value && options.find(o => o.value === value) && (
            renderOption 
              ? renderOption(options.find(o => o.value === value)!) 
              : defaultRenderOption(options.find(o => o.value === value)!)
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <div className="p-2 border-b sticky top-0 bg-popover z-10">
          <div className="relative">
            <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                e.stopPropagation();
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                // Prevent Radix Select from handling navigation keys when typing in the input
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
              onKeyUp={(e) => e.stopPropagation()}
              onKeyPress={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="pl-8 h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
                className="cursor-pointer"
              >
                {renderOption ? renderOption(option) : defaultRenderOption(option)}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
