"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiAlertCircle, FiSave, FiInfo } from "react-icons/fi";
import { getAccountingOperationSettingsAction, updateAccountingOperationSettings } from "../../_actions/accounting-settings.action";
import { getChartOfAccounts } from "../../../accounts/chart-of-accounts/_actions/chart-of-accounts.action";
import type { AccountingOperationSettings } from "@/types/accounting-settings";
import { AccountType } from "@prisma/client";

const operationSettingsSchema = z.object({
  // Purchase
  purchaseInventoryAccountId: z.string().min(1, "Required"),
  purchasePayableAccountId: z.string().min(1, "Required"),
  
  // Sales
  salesRevenueAccountId: z.string().min(1, "Required"),
  salesReceivableAccountId: z.string().min(1, "Required"),
  salesCogsAccountId: z.string().min(1, "Required"),
  
  // Production
  productionRawMaterialInventoryId: z.string().min(1, "Required"),
  productionWipAccountId: z.string().min(1, "Required"),
  productionFinishedGoodsInventoryId: z.string().min(1, "Required"),
  
  // Payment
  paymentCashAccountId: z.string().min(1, "Required"),
  paymentPayableAccountId: z.string().min(1, "Required"),
  
  // Receipt
  receiptCashAccountId: z.string().min(1, "Required"),
  receiptReceivableAccountId: z.string().min(1, "Required"),
  
  // Contra
  contraFromAccountId: z.string().optional(),
  contraToAccountId: z.string().optional(),
  
  // Inventory Adjustment
  inventoryAdjustmentGainAccountId: z.string().optional(),
  inventoryAdjustmentLossAccountId: z.string().optional(),
});

type FormData = z.infer<typeof operationSettingsSchema>;

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export default function OperationAccountMappingForm() {
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(operationSettingsSchema),
  });

  // Load accounts and settings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingAccounts(true);
        
        // Fetch all active accounts
        const accountsResult = await getChartOfAccounts(1, 1000, "", "active");
        if (accountsResult.success) {
          setAccounts(
            accountsResult.accounts.map((a) => ({
              id: a.id,
              code: a.code,
              name: a.name,
              type: a.type as AccountType,
            }))
          );
        }

        // Fetch existing settings
        const settingsResult = await getAccountingOperationSettingsAction();
        if (settingsResult.success && settingsResult.settings) {
          const s = settingsResult.settings;
          reset({
            purchaseInventoryAccountId: s.purchase.inventoryAccountId,
            purchasePayableAccountId: s.purchase.payableAccountId,
            salesRevenueAccountId: s.sales.revenueAccountId,
            salesReceivableAccountId: s.sales.receivableAccountId,
            salesCogsAccountId: s.sales.cogsAccountId,
            productionRawMaterialInventoryId: s.production.rawMaterialInventoryId,
            productionWipAccountId: s.production.wipAccountId,
            productionFinishedGoodsInventoryId: s.production.finishedGoodsInventoryId,
            paymentCashAccountId: s.payment.cashAccountId,
            paymentPayableAccountId: s.payment.payableAccountId,
            receiptCashAccountId: s.receipt.cashAccountId,
            receiptReceivableAccountId: s.receipt.receivableAccountId,
            contraFromAccountId: s.contra.fromAccountId,
            contraToAccountId: s.contra.toAccountId,
            inventoryAdjustmentGainAccountId: s.inventoryAdjustment.gainAccountId,
            inventoryAdjustmentLossAccountId: s.inventoryAdjustment.lossAccountId,
          });
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load accounts and settings");
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadData();
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const settings: AccountingOperationSettings = {
        purchase: {
          inventoryAccountId: data.purchaseInventoryAccountId,
          payableAccountId: data.purchasePayableAccountId,
        },
        sales: {
          revenueAccountId: data.salesRevenueAccountId,
          receivableAccountId: data.salesReceivableAccountId,
          cogsAccountId: data.salesCogsAccountId,
        },
        production: {
          rawMaterialInventoryId: data.productionRawMaterialInventoryId,
          wipAccountId: data.productionWipAccountId,
          finishedGoodsInventoryId: data.productionFinishedGoodsInventoryId,
        },
        payment: {
          cashAccountId: data.paymentCashAccountId,
          payableAccountId: data.paymentPayableAccountId,
        },
        receipt: {
          cashAccountId: data.receiptCashAccountId,
          receivableAccountId: data.receiptReceivableAccountId,
        },
        contra: {
          fromAccountId: data.contraFromAccountId || "",
          toAccountId: data.contraToAccountId || "",
        },
        inventoryAdjustment: {
          gainAccountId: data.inventoryAdjustmentGainAccountId || "",
          lossAccountId: data.inventoryAdjustmentLossAccountId || "",
        },
      };

      const result = await updateAccountingOperationSettings(settings);

      if (!result.success) {
        throw new Error(result.error || "Failed to save settings");
      }

      setSuccess("Operation account mappings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filterAccountsByType = (types: AccountType[]) => {
    return accounts.filter((acc) => types.includes(acc.type));
  };

  const AccountSelector = ({
    name,
    label,
    types,
    required = true,
    description,
  }: {
    name: keyof FormData;
    label: string;
    types: AccountType[];
    required?: boolean;
    description?: string;
  }) => {
    const filteredAccounts = filterAccountsByType(types);
    const fieldError = errors[name];

    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value as string}
              onValueChange={field.onChange}
              disabled={loading || loadingAccounts}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${types.join(" or ")} account`} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {fieldError && (
          <p className="text-sm text-destructive">{fieldError.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info Notice */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
        <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <p className="font-medium">Important</p>
          <p className="mt-1">
            These mappings affect <strong>future transactions only</strong>. Historical vouchers and posted transactions remain unchanged.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          <FiSave className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Purchase Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Operations</CardTitle>
            <CardDescription>
              Account mappings for purchase receipts and inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="purchaseInventoryAccountId"
              label="Inventory Account"
              types={[AccountType.ASSET]}
              description="Debited when goods are received"
            />
            <AccountSelector
              name="purchasePayableAccountId"
              label="Accounts Payable"
              types={[AccountType.LIABILITY]}
              description="Credited when goods are received"
            />
          </CardContent>
        </Card>

        {/* Sales Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Operations</CardTitle>
            <CardDescription>
              Account mappings for sales and revenue recognition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="salesRevenueAccountId"
              label="Sales Revenue"
              types={[AccountType.REVENUE]}
              description="Credited when sale is confirmed"
            />
            <AccountSelector
              name="salesReceivableAccountId"
              label="Accounts Receivable"
              types={[AccountType.ASSET]}
              description="Debited when sale is confirmed"
            />
            <AccountSelector
              name="salesCogsAccountId"
              label="Cost of Goods Sold"
              types={[AccountType.EXPENSE]}
              description="Debited for inventory cost"
            />
          </CardContent>
        </Card>

        {/* Production Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Production Operations</CardTitle>
            <CardDescription>
              Account mappings for manufacturing and production
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="productionRawMaterialInventoryId"
              label="Raw Material Inventory"
              types={[AccountType.ASSET]}
              description="Credited when production starts"
            />
            <AccountSelector
              name="productionWipAccountId"
              label="Work in Progress (WIP)"
              types={[AccountType.ASSET]}
              description="Debited when production starts, credited when completed"
            />
            <AccountSelector
              name="productionFinishedGoodsInventoryId"
              label="Finished Goods Inventory"
              types={[AccountType.ASSET]}
              description="Debited when production completes"
            />
          </CardContent>
        </Card>

        {/* Payment Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Operations</CardTitle>
            <CardDescription>
              Account mappings for supplier payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="paymentCashAccountId"
              label="Cash/Bank Account"
              types={[AccountType.ASSET]}
              description="Credited when payment is made"
            />
            <AccountSelector
              name="paymentPayableAccountId"
              label="Accounts Payable"
              types={[AccountType.LIABILITY]}
              description="Debited when payment is made"
            />
          </CardContent>
        </Card>

        {/* Receipt Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt Operations</CardTitle>
            <CardDescription>
              Account mappings for customer receipts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="receiptCashAccountId"
              label="Cash/Bank Account"
              types={[AccountType.ASSET]}
              description="Debited when receipt is received"
            />
            <AccountSelector
              name="receiptReceivableAccountId"
              label="Accounts Receivable"
              types={[AccountType.ASSET]}
              description="Credited when receipt is received"
            />
          </CardContent>
        </Card>

        {/* Contra Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Contra Operations (Optional)</CardTitle>
            <CardDescription>
              Account mappings for transfers between cash/bank accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="contraFromAccountId"
              label="From Account"
              types={[AccountType.ASSET]}
              required={false}
              description="Credited when transfer occurs"
            />
            <AccountSelector
              name="contraToAccountId"
              label="To Account"
              types={[AccountType.ASSET]}
              required={false}
              description="Debited when transfer occurs"
            />
          </CardContent>
        </Card>

        {/* Inventory Adjustment */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Adjustments (Optional)</CardTitle>
            <CardDescription>
              Account mappings for inventory gains and losses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              name="inventoryAdjustmentGainAccountId"
              label="Inventory Gain Account"
              types={[AccountType.REVENUE]}
              required={false}
              description="Credited for positive adjustments"
            />
            <AccountSelector
              name="inventoryAdjustmentLossAccountId"
              label="Inventory Loss Account"
              types={[AccountType.EXPENSE]}
              required={false}
              description="Debited for negative adjustments"
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 pt-4">
          <Button type="submit" disabled={loading || loadingAccounts}>
            <FiSave className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Account Mappings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
