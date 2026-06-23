"use client";

import * as React from "react";
import { ChevronDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxCount?: number;
  className?: string;
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      value,
      defaultValue = [],
      onValueChange,
      placeholder = "Select options...",
      disabled = false,
      maxCount = 3,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Use controlled value if provided, otherwise use internal state
    const isControlled = value !== undefined;
    const selectedValues = isControlled ? (value || []) : internalValue;

    // Update internal state when controlled value changes
    React.useEffect(() => {
      if (isControlled && value !== undefined) {
        setInternalValue(value);
      }
    }, [isControlled, value]);

    const handleToggle = (optionValue: string) => {
      if (disabled) return;

      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];

      if (!isControlled) {
        setInternalValue(newValues);
      }
      onValueChange(newValues);
    };

    const handleSelectAll = () => {
      if (disabled) return;
      const allValues = options.filter((opt) => !opt.disabled).map((opt) => opt.value);
      const newValues = selectedValues.length === allValues.length ? [] : allValues;

      if (!isControlled) {
        setInternalValue(newValues);
      }
      onValueChange(newValues);
    };

    const handleClear = () => {
      if (disabled) return;
      if (!isControlled) {
        setInternalValue([]);
      }
      onValueChange([]);
    };

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      
      const query = searchQuery.toLowerCase();
      return options.filter(
        (option) =>
          option.label.toLowerCase().includes(query) ||
          option.value.toLowerCase().includes(query)
      );
    }, [options, searchQuery]);

    const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));
    const allSelected = options.filter((opt) => !opt.disabled).length > 0 &&
      selectedValues.length === options.filter((opt) => !opt.disabled).length;

    return (
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between text-left font-normal",
              !selectedValues.length && "text-muted-foreground",
              className
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedValues.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {selectedOptions.slice(0, maxCount).map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      className="mr-1 text-left"
                    >
                      {option.label}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggle(option.value);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggle(option.value);
                        }}
                        aria-label={`Remove ${option.label}`}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </span>
                    </Badge>
                  ))}
                  {selectedValues.length > maxCount && (
                    <Badge variant="secondary" className="mr-1">
                      +{selectedValues.length - maxCount} more
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-left">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="flex flex-col">
            {/* Search input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            {options.length > 0 && (
              <div className="flex items-center justify-between border-b px-3 py-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-left hover:underline"
                  disabled={disabled}
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-sm text-left text-muted-foreground hover:text-foreground hover:underline"
                    disabled={disabled}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No results found" : "No options available"}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isOptionDisabled = option.disabled || disabled;

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
                        isOptionDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
                      )}
                      onClick={() => {
                        if (!isOptionDisabled) {
                          handleToggle(option.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !isOptionDisabled) {
                          e.preventDefault();
                          handleToggle(option.value);
                        }
                      }}
                      tabIndex={isOptionDisabled ? -1 : 0}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isOptionDisabled}
                        className="mr-2 pointer-events-none"
                        tabIndex={-1}
                      />
                      <span className="text-left flex-1">{option.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
