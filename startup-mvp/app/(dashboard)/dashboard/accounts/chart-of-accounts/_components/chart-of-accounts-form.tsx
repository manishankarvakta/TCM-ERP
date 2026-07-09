"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FiAlertCircle, FiSearch } from "react-icons/fi";
import { createChartOfAccount, updateChartOfAccount, getChartOfAccounts } from "../_actions/chart-of-accounts.action";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import { AccountType } from "@prisma/client";

const chartOfAccountFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(AccountType),
  parentId: z.string().optional().nullable(),
  isPostable: z.boolean().optional(),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type ChartOfAccountFormData = z.infer<typeof chartOfAccountFormSchema>;

interface ChartOfAccountFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    parentId: string | null;
    description: string | null;
    status: string;
  };
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export default function ChartOfAccountForm({ mode, initialData }: ChartOfAccountFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [parentSearch, setParentSearch] = useState("");

  // Filtered accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!parentSearch) return accounts;
    const query = parentSearch.toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query)
    );
  }, [accounts, parentSearch]);

  // Fetch accounts for parent selection
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await getChartOfAccounts(1, 1000, "", "active");
        if (result.success) {
          // Filter out current account if editing (to prevent self-parent)
          const filtered = initialData
            ? result.accounts.filter((a) => a.id !== initialData.id)
            : result.accounts;
          setAccounts(
            filtered.map((a) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type as AccountType,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [initialData]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ChartOfAccountFormData>({
    resolver: zodResolver(chartOfAccountFormSchema),
    defaultValues: initialData
      ? {
          code: initialData.code,
          name: initialData.name,
          type: initialData.type,
          parentId: initialData.parentId || null,
          isPostable: false,
          description: initialData.description || "",
          status: (initialData.status === "active" || initialData.status === "inactive")
            ? (initialData.status as "active" | "inactive")
            : "active",
        }
      : {
          code: "",
          name: "",
          type: AccountType.ASSET,
          parentId: null,
          isPostable: false,
          description: "",
          status: "active",
        },
  });

  const onSubmit = async (data: ChartOfAccountFormData) => {
    try {
      setLoading(true);
      setError("");

      // Extract isPostable (form-only field, not saved to DB)
      const { isPostable, ...serverData } = data;

      if (mode === "create") {
        const result = await createChartOfAccount({
          code: serverData.code,
          name: serverData.name,
          type: serverData.type,
          parentId: serverData.parentId || null,
          description: serverData.description || undefined,
          status: serverData.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create chart of account");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/accounts/chart-of-accounts`);
      } else {
        const result = await updateChartOfAccount(initialData!.id, {
          code: serverData.code,
          name: serverData.name,
          type: serverData.type,
          parentId: serverData.parentId || null,
          description: serverData.description || undefined,
          status: serverData.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update chart of account");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/accounts/chart-of-accounts`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const accountTypeOptions = [
    { value: AccountType.ASSET, label: "Asset" },
    { value: AccountType.LIABILITY, label: "Liability" },
    { value: AccountType.EQUITY, label: "Equity" },
    { value: AccountType.REVENUE, label: "Revenue" },
    { value: AccountType.EXPENSE, label: "Expense" },
  ];

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Chart of Account" : "Edit Chart of Account"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Enter account details to create a new chart of account"
              : "Update chart of account information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 col-span-full">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Account Code *</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="e.g., 1000, 2000, 3000"
                    {...register("code")}
                    disabled={loading}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Unique code for this account (e.g., 1000 for Assets, 2000 for Liabilities)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Account (Optional)</Label>
                  <Controller
                    name="parentId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || "__none__"}
                        onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                        onOpenChange={(open) => {
                          if (!open) setParentSearch("");
                        }}
                        disabled={loading || loadingAccounts}
                      >
                        <SelectTrigger id="parentId">
                          <SelectValue placeholder="Select parent account (optional)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                            <div className="relative">
                              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                              <Input
                                placeholder="Filter parent accounts..."
                                value={parentSearch}
                                onChange={(e) => setParentSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="pl-8 h-8 text-xs bg-muted/50"
                              />
                            </div>
                          </div>
                          <div className="pt-1">
                            <SelectItem value="__none__" className="text-left cursor-pointer py-2 focus:bg-accent">
                              <span className="text-sm font-medium">None (Top-level account)</span>
                            </SelectItem>
                            {filteredAccounts.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                                No accounts found
                              </div>
                            ) : (
                              filteredAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id} className="text-left cursor-pointer py-2 focus:bg-accent">
                                  <span className="text-sm font-medium">{account.code} - {account.name} ({account.type})</span>
                                </SelectItem>
                              ))
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.parentId && (
                    <p className="text-sm text-destructive">{errors.parentId.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select a parent account to create a hierarchical structure
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Account Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Cash, Accounts Payable, Sales Revenue"
                    {...register("name")}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Account Type *</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as AccountType)}
                        disabled={loading}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && (
                    <p className="text-sm text-destructive">{errors.type.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Account description..."
                  {...register("description")}
                  disabled={loading}
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="isPostable"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="isPostable"
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      )}
                    />
                    <Label htmlFor="isPostable" className="cursor-pointer">
                      Is Postable
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow direct posting to this account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-sm text-destructive">{errors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "Saving..."
                    : mode === "create"
                    ? "Create Account"
                    : "Update Account"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

