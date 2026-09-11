"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FiSearch, FiChevronDown, FiCheck } from "react-icons/fi";
import { cn } from "@/lib/utils";

export interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface SearchableAccountSelectProps {
  options: AccountOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableAccountSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select Account...",
  className = "",
}: SearchableAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedAccount = useMemo(() => {
    return options.find((opt) => opt.id === value);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.code.toLowerCase().includes(term) ||
        opt.name.toLowerCase().includes(term)
    );
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal text-left h-10 px-3", className)}
        >
          {selectedAccount ? (
            <span className="truncate">
              <strong className="font-mono text-primary mr-1">{selectedAccount.code}</strong> - {selectedAccount.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <FiChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        {/* Search Input Box */}
        <div className="relative mb-2">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <Input
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            autoFocus
          />
        </div>

        {/* Scrollable Options List */}
        <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No matching accounts found
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="truncate pr-2">
                    <span className="font-mono font-semibold text-primary">{opt.code}</span> - {opt.name}
                  </span>
                  {isSelected && <FiCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
