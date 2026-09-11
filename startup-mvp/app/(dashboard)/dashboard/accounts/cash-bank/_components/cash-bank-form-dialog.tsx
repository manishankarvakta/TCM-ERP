"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiAlertCircle } from "react-icons/fi";
import { CashBankAccountType, AccountType } from "@prisma/client";
import {
  createCashBankAccount,
  updateCashBankAccount,
  getUnlinkedAssetAccounts,
} from "../_actions/cash-bank.action";
import { getChartOfAccounts } from "../../chart-of-accounts/_actions/chart-of-accounts.action";

// Zod Schema matching ffERP
const cashBankFormSchema = z.object({
  mode: z.enum(["create", "link"]),
  type: z.nativeEnum(CashBankAccountType),
  status: z.string(),
  openingBalance: z.number().min(0).optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional(),
  chartOfAccountId: z.string().optional(),
});

type CashBankFormData = z.infer<typeof cashBankFormSchema>;

interface CashBankAccount {
  id: string;
  type: "CASH" | "BANK" | "MFS";
  status: string;
  chartOfAccount: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
  };
}

interface CashBankFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CashBankAccount | null;
}

export default function CashBankFormDialog({
  open,
  onOpenChange,
  initialData,
}: CashBankFormDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [unlinkedCoas, setUnlinkedCoas] = useState<{ id: string; code: string; name: string }[]>([]);
  const [allAssetCoas, setAllAssetCoas] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
  } = useForm<CashBankFormData>({
    resolver: zodResolver(cashBankFormSchema),
    defaultValues: {
      mode: "create",
      type: CashBankAccountType.CASH,
      status: "active",
      openingBalance: 0,
      code: "",
      name: "",
      parentId: null,
      description: "",
      chartOfAccountId: "",
    },
  });

  const selectedMode = watch("mode");

  // Load dropdown data when dialog is opened
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingDropdowns(true);
      try {
        const [unlinkedRes, allCoasRes] = await Promise.all([
          getUnlinkedAssetAccounts(),
          getChartOfAccounts(1, 1000, "", "active"),
        ]);

        if (unlinkedRes.success && unlinkedRes.accounts) {
          setUnlinkedCoas(unlinkedRes.accounts);
        }
        if (allCoasRes.success && allCoasRes.accounts) {
          const assets = allCoasRes.accounts
            .filter((acc: any) => acc.type === AccountType.ASSET)
            .map((acc: any) => ({
              id: acc.id,
              code: acc.code,
              name: acc.name,
            }));
          setAllAssetCoas(assets);
        }
      } catch (err) {
        console.error("Error loading dropdown data:", err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchData();
  }, [open]);

  // Set default values when opening dialog (edit vs create mode)
  useEffect(() => {
    if (!open) {
      setError("");
      return;
    }

    if (initialData) {
      reset({
        mode: "link",
        type: initialData.type as CashBankAccountType,
        status: initialData.status,
        code: initialData.chartOfAccount.code,
        name: initialData.chartOfAccount.name,
        parentId: initialData.chartOfAccount.parentId || null,
        description: initialData.chartOfAccount.description || "",
        chartOfAccountId: initialData.chartOfAccount.id,
      });
    } else {
      reset({
        mode: "create",
        type: CashBankAccountType.CASH,
        status: "active",
        openingBalance: 0,
        code: "",
        name: "",
        parentId: null,
        description: "",
        chartOfAccountId: "",
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: CashBankFormData) => {
    // Basic validations
    if (!isEditMode) {
      if (data.mode === "create") {
        if (!data.name || !data.name.trim()) {
          setError("Account name is required");
          return;
        }
      } else {
        if (!data.chartOfAccountId) {
          setError("Please select a chart of account to link");
          return;
        }
      }
    } else {
      if (!data.name || !data.name.trim()) {
        setError("Account name is required");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      if (isEditMode) {
        const result = await updateCashBankAccount(initialData.id, {
          type: data.type,
          status: data.status,
          code: data.code!,
          name: data.name!,
          parentId: data.parentId,
          description: data.description,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update cash/bank account");
        }
      } else {
        const result = await createCashBankAccount({
          mode: data.mode,
          type: data.type,
          status: data.status,
          openingBalance: data.openingBalance,
          code: data.mode === "create" ? data.code : undefined,
          name: data.mode === "create" ? data.name : undefined,
          parentId: data.mode === "create" ? data.parentId : undefined,
          description: data.mode === "create" ? data.description : undefined,
          chartOfAccountId: data.mode === "link" ? data.chartOfAccountId : undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create cash/bank account");
        }
      }

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const parentOptions = allAssetCoas
    .filter((coa) => !isEditMode || coa.id !== initialData?.chartOfAccount.id)
    .map((coa) => ({
      value: coa.id,
      label: `${coa.code} - ${coa.name}`,
    }));

  const unlinkedCoaOptions = unlinkedCoas.map((coa) => ({
    value: coa.id,
    label: `${coa.code} - ${coa.name}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {isEditMode ? "Edit Cash/Bank Account" : "Add Cash/Bank Account"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details for this cash, bank, or MFS account."
                : "Create a new ledger account or link an existing chart of account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Mode selection (Only in Create Mode) */}
            {!isEditMode && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Mode</Label>
                <div className="flex bg-muted p-1 rounded-lg">
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
                      selectedMode === "create"
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setValue("mode", "create")}
                  >
                    Create New Account
                  </button>
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${
                      selectedMode === "link"
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setValue("mode", "link")}
                  >
                    Link Existing COA
                  </button>
                </div>
              </div>
            )}

            {/* Link Existing Account Dropdown */}
            {!isEditMode && selectedMode === "link" && (
              <div className="space-y-2">
                <Label htmlFor="chartOfAccountId" className="text-sm font-medium">Chart of Account *</Label>
                <Controller
                  name="chartOfAccountId"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      options={unlinkedCoaOptions}
                      value={field.value || null}
                      onValueChange={(val) => field.onChange(val || "")}
                      placeholder={loadingDropdowns ? "Loading accounts..." : "Select chart of account"}
                      searchPlaceholder="Search accounts..."
                      disabled={loadingDropdowns || loading}
                    />
                  )}
                />
              </div>
            )}

            {/* Create New Fields */}
            {(isEditMode || selectedMode === "create") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium">Account Code (Optional)</Label>
                    <Input
                      id="code"
                      placeholder="Auto-generated if left blank"
                      {...register("code")}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Account Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Main Cash Wallet"
                      {...register("name")}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId" className="text-sm font-medium">Parent Account (Optional)</Label>
                  <Controller
                    name="parentId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={parentOptions}
                        value={field.value || null}
                        onValueChange={(val) => field.onChange(val)}
                        placeholder="Select parent account"
                        searchPlaceholder="Search accounts..."
                        disabled={loadingDropdowns || loading}
                        allowClear
                      />
                    )}
                  />
                </div>

                {!isEditMode && (
                  <div className="space-y-2">
                    <Label htmlFor="openingBalance" className="text-sm font-medium">Opening Balance (Optional)</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 5000"
                      {...register("openingBalance")}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Initial balance for this account. Hits debit side, offset by Owner's Equity (Code 3110) on credit side.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-type-select" className="text-sm font-medium">Account Type *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as CashBankAccountType)}
                      disabled={loading}
                    >
                      <SelectTrigger id="account-type-select">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CashBankAccountType.CASH}>Cash</SelectItem>
                        <SelectItem value={CashBankAccountType.BANK}>Bank</SelectItem>
                        <SelectItem value={CashBankAccountType.MFS}>Digital Wallet (MFS)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">Status *</Label>
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
              </div>
            </div>

            {(isEditMode || selectedMode === "create") && (
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Account description..."
                  {...register("description")}
                  disabled={loading}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
