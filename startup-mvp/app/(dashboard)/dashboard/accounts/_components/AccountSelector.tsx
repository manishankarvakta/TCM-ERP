"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FiSearch, FiInfo } from "react-icons/fi";
import { formatCurrency, getRelativeTime } from "../_lib/voucher-form-helpers";
import { cn } from "@/lib/utils";

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  balance?: number;
  lastActivity?: Date | string;
}

interface AccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
  accounts: AccountOption[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showBalance?: boolean;
  showType?: boolean;
  showSearch?: boolean;
  groupByType?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

export default function AccountSelector({
  value,
  onChange,
  accounts,
  label = "Account",
  placeholder = "Select an account",
  required = true,
  disabled = false,
  showBalance = true,
  showType = true,
  showSearch = true,
  groupByType = true,
  error,
  className,
  id = "account",
}: AccountSelectorProps) {
  const [search, setSearch] = useState("");

  const selectedAccount = accounts.find((acc) => acc.id === value);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const searchLower = search.toLowerCase();
    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(searchLower) ||
        account.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, search]);

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    if (!groupByType) return { All: filteredAccounts };
    
    const groups: Record<string, AccountOption[]> = {};
    filteredAccounts.forEach((acc) => {
      if (!groups[acc.type]) {
        groups[acc.type] = [];
      }
      groups[acc.type].push(acc);
    });
    return groups;
  }, [filteredAccounts, groupByType]);

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "ASSET":
        return "default";
      case "LIABILITY":
        return "secondary";
      case "EQUITY":
        return "outline";
      case "REVENUE":
        return "default";
      case "EXPENSE":
        return "destructive";
      case "CASH":
        return "default";
      case "BANK":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className={cn(error && "border-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* Search Input */}
          {showSearch && (
            <div className="p-2 border-b">
              <div className="relative">
                <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                <Input
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") e.preventDefault();
                  }}
                  className="pl-8 h-8 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredAccounts.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                No accounts found
              </div>
            ) : (
              Object.entries(groupedAccounts).map(([type, accs]) => {
                if (accs.length === 0) return null;
                return (
                  <div key={type}>
                    {groupByType && (
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 border-b">
                        {type}
                      </div>
                    )}
                    {accs.map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3 w-full min-w-[300px]">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {account.code}
                              </span>
                              <span className="truncate">{account.name}</span>
                            </div>
                          </div>
                          {showBalance && account.balance !== undefined && (
                            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                              {formatCurrency(account.balance)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </SelectContent>
      </Select>

      {/* Selected Account Info */}
      {selectedAccount && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {showType && (
                <Badge
                  variant={getTypeBadgeVariant(selectedAccount.type)}
                  className="text-[10px] px-1.5 py-0"
                >
                  {selectedAccount.type}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {selectedAccount.code} - {selectedAccount.name}
              </span>
            </div>
            {showBalance && selectedAccount.balance !== undefined && (
              <span className="text-sm font-semibold font-mono whitespace-nowrap">
                {formatCurrency(selectedAccount.balance)}
              </span>
            )}
          </div>
          
          {selectedAccount.lastActivity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FiInfo className="h-3 w-3" />
              <span>Last activity: {getRelativeTime(selectedAccount.lastActivity)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
