"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FiAlertCircle, FiSave, FiInfo } from "react-icons/fi";
import { getAccountingOperationSettingsAction, updateAccountingOperationSettings } from "../../_actions/accounting-settings.action";
import { getChartOfAccounts } from "../../../accounts/chart-of-accounts/_actions/chart-of-accounts.action";
import type { AccountingOperationSettings } from "@/types/accounting-settings";
import { AccountType } from "@prisma/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

const operationSettingsSchema = z.object({
  // Purchase
  purchaseInventoryAccountId: z.string().min(1, "Required"),
  
  // Sales
  salesRevenueAccountId: z.string().min(1, "Required"),
  salesCogsAccountId: z.string().min(1, "Required"),
  salesFinishedGoodsInventoryAccountId: z.string().min(1, "Required"),
  salesCouponDiscountAccountId: z.string().optional(),
  salesSalesDiscountAccountId: z.string().optional(),
  
  // Production
  productionConsumptionWipAccountId: z.string().min(1, "Required"),
  productionConsumptionRawMaterialInventoryId: z.string().min(1, "Required"),
  productionCompletionFinishedGoodsInventoryId: z.string().min(1, "Required"),
  productionCompletionWipAccountId: z.string().min(1, "Required"),
  
  // Inventory Adjustment Positive
  inventoryAdjustmentPositiveFgId: z.string().min(1, "Required"),
  inventoryAdjustmentPositiveRmId: z.string().min(1, "Required"),
  inventoryAdjustmentPositiveGainId: z.string().min(1, "Required"),
  
  // Inventory Adjustment Negative
  inventoryAdjustmentNegativeFgId: z.string().min(1, "Required"),
  inventoryAdjustmentNegativeRmId: z.string().min(1, "Required"),
  inventoryAdjustmentNegativeExpenseId: z.string().min(1, "Required"),

  // Payment/Receipt (kept for compatibility)
  paymentCashAccountId: z.string().min(1, "Required"),
  receiptCashAccountId: z.string().min(1, "Required"),
  contraFromAccountId: z.string().optional(),
  contraToAccountId: z.string().optional(),

  // Payroll
  payrollSalaryExpenseAccountId: z.string().optional(),
  payrollDefaultSalaryPayableAccountId: z.string().optional(),
  payrollTaxPayableAccountId: z.string().optional(),
  payrollPfPayableAccountId: z.string().optional(),
  payrollDefaultAdvanceAccountId: z.string().optional(),
  payrollEmployerPfExpenseAccountId: z.string().optional(),
  payrollEmployerPfPayableAccountId: z.string().optional(),
  payrollFestivalBonusExpenseAccountId: z.string().optional(),
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
  const [isGlobal, setIsGlobal] = useState(false);

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
            setIsGlobal(settingsResult.isGlobal || false);
            reset({
            purchaseInventoryAccountId: s.purchase.inventoryAccountId,
            salesRevenueAccountId: s.sales.revenueAccountId,
            salesCogsAccountId: s.sales.cogsAccountId,
            salesFinishedGoodsInventoryAccountId: s.sales.finishedGoodsInventoryAccountId,
            salesCouponDiscountAccountId: s.sales.couponDiscountAccountId || "",
            salesSalesDiscountAccountId: s.sales.salesDiscountAccountId || "",
            productionConsumptionWipAccountId: s.production.consumptionWipAccountId,
            productionConsumptionRawMaterialInventoryId: s.production.consumptionRawMaterialInventoryId,
            productionCompletionFinishedGoodsInventoryId: s.production.completionFinishedGoodsInventoryId,
            productionCompletionWipAccountId: s.production.completionWipAccountId,
            inventoryAdjustmentPositiveFgId: s.inventoryAdjustment.positiveFgInventoryId,
            inventoryAdjustmentPositiveRmId: s.inventoryAdjustment.positiveRmInventoryId,
            inventoryAdjustmentPositiveGainId: s.inventoryAdjustment.positiveAdjustmentGainId,
            inventoryAdjustmentNegativeFgId: s.inventoryAdjustment.negativeFgInventoryId,
            inventoryAdjustmentNegativeRmId: s.inventoryAdjustment.negativeRmInventoryId,
            inventoryAdjustmentNegativeExpenseId: s.inventoryAdjustment.negativeAdjustmentExpenseId,
            paymentCashAccountId: s.payment.cashAccountId,
            receiptCashAccountId: s.receipt.cashAccountId,
            contraFromAccountId: s.contra.fromAccountId,
            contraToAccountId: s.contra.toAccountId,
            payrollSalaryExpenseAccountId: s.payroll?.salaryExpenseAccountId || "",
            payrollDefaultSalaryPayableAccountId: s.payroll?.defaultSalaryPayableAccountId || "",
            payrollTaxPayableAccountId: s.payroll?.taxPayableAccountId || "",
            payrollPfPayableAccountId: s.payroll?.pfPayableAccountId || "",
            payrollDefaultAdvanceAccountId: s.payroll?.defaultAdvanceAccountId || "",
            payrollEmployerPfExpenseAccountId: s.payroll?.employerPfExpenseAccountId || "",
            payrollEmployerPfPayableAccountId: s.payroll?.employerPfPayableAccountId || "",
            payrollFestivalBonusExpenseAccountId: s.payroll?.festivalBonusExpenseAccountId || "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const settings: AccountingOperationSettings = {
        purchase: {
          inventoryAccountId: data.purchaseInventoryAccountId,
          payableAccountId: "", // Dynamic from Vendor
        },
        sales: {
          revenueAccountId: data.salesRevenueAccountId,
          receivableAccountId: "", // Dynamic from Customer
          cogsAccountId: data.salesCogsAccountId,
          finishedGoodsInventoryAccountId: data.salesFinishedGoodsInventoryAccountId,
          couponDiscountAccountId: data.salesCouponDiscountAccountId || "",
          salesDiscountAccountId: data.salesSalesDiscountAccountId || "",
        },
        production: {
          consumptionWipAccountId: data.productionConsumptionWipAccountId,
          consumptionRawMaterialInventoryId: data.productionConsumptionRawMaterialInventoryId,
          completionFinishedGoodsInventoryId: data.productionCompletionFinishedGoodsInventoryId,
          completionWipAccountId: data.productionCompletionWipAccountId,
        },
        inventoryAdjustment: {
          positiveFgInventoryId: data.inventoryAdjustmentPositiveFgId,
          positiveRmInventoryId: data.inventoryAdjustmentPositiveRmId,
          positiveAdjustmentGainId: data.inventoryAdjustmentPositiveGainId,
          negativeFgInventoryId: data.inventoryAdjustmentNegativeFgId,
          negativeRmInventoryId: data.inventoryAdjustmentNegativeRmId,
          negativeAdjustmentExpenseId: data.inventoryAdjustmentNegativeExpenseId,
        },
        payment: {
          cashAccountId: data.paymentCashAccountId,
          payableAccountId: "", // Dynamic
        },
        receipt: {
          cashAccountId: data.receiptCashAccountId,
          receivableAccountId: "", // Dynamic
        },
        contra: {
          fromAccountId: data.contraFromAccountId || "",
          toAccountId: data.contraToAccountId || "",
        },
        payroll: {
          salaryExpenseAccountId: data.payrollSalaryExpenseAccountId || "",
          defaultSalaryPayableAccountId: data.payrollDefaultSalaryPayableAccountId || "",
          taxPayableAccountId: data.payrollTaxPayableAccountId || "",
          pfPayableAccountId: data.payrollPfPayableAccountId || "",
          defaultAdvanceAccountId: data.payrollDefaultAdvanceAccountId || "",
          employerPfExpenseAccountId: data.payrollEmployerPfExpenseAccountId || "",
          employerPfPayableAccountId: data.payrollEmployerPfPayableAccountId || "",
          festivalBonusExpenseAccountId: data.payrollFestivalBonusExpenseAccountId || "",
        },
      };
      
      const result = await updateAccountingOperationSettings(settings, isGlobal);

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

  const onAutofill = () => {
    const findAccount = (keywords: string[], type: AccountType, excludeKeywords?: string[]) => {
      return accounts.find(
        (acc) =>
          acc.type === type &&
          keywords.some((kw) => acc.name.toLowerCase().includes(kw.toLowerCase())) &&
          (!excludeKeywords || !excludeKeywords.some((ekw) => acc.name.toLowerCase().includes(ekw.toLowerCase())))
      )?.id || "";
    };

    reset({
      purchaseInventoryAccountId: findAccount(["Inventory", "Stock"], AccountType.ASSET),
      salesRevenueAccountId: findAccount(["Revenue", "Sales Income", "Income"], AccountType.REVENUE),
      salesCogsAccountId: findAccount(["COGS", "Cost of Goods Sold", "Cost of Sales"], AccountType.EXPENSE),
      salesFinishedGoodsInventoryAccountId: findAccount(["Finished Goods", "Ready Product", "Inventory"], AccountType.ASSET),
      salesCouponDiscountAccountId: findAccount(["Coupon Discount", "Promo Discount", "Coupon"], AccountType.REVENUE) || findAccount(["Coupon Discount", "Promo Discount", "Coupon"], AccountType.EXPENSE),
      salesSalesDiscountAccountId: findAccount(["Sales Discount", "Discount"], AccountType.REVENUE, ["coupon", "promo"]) || findAccount(["Sales Discount", "Discount"], AccountType.EXPENSE, ["coupon", "promo"]),
      productionConsumptionWipAccountId: findAccount(["WIP", "Work in Progress"], AccountType.ASSET),
      productionConsumptionRawMaterialInventoryId: findAccount(["Raw Material", "Inventory"], AccountType.ASSET),
      productionCompletionFinishedGoodsInventoryId: findAccount(["Finished Goods", "Ready Product", "Inventory"], AccountType.ASSET),
      productionCompletionWipAccountId: findAccount(["WIP", "Work in Progress"], AccountType.ASSET),
      inventoryAdjustmentPositiveFgId: findAccount(["Finished Goods", "Ready Product", "Inventory"], AccountType.ASSET),
      inventoryAdjustmentPositiveRmId: findAccount(["Raw Material", "Inventory"], AccountType.ASSET),
      inventoryAdjustmentPositiveGainId: findAccount(["Adjustment Gain", "Other Income"], AccountType.REVENUE),
      inventoryAdjustmentNegativeFgId: findAccount(["Finished Goods", "Ready Product", "Inventory"], AccountType.ASSET),
      inventoryAdjustmentNegativeRmId: findAccount(["Raw Material", "Inventory"], AccountType.ASSET),
      inventoryAdjustmentNegativeExpenseId: findAccount(["Adjustment Expense", "Other Expense"], AccountType.EXPENSE),
      paymentCashAccountId: findAccount(["Cash", "Bank", "Primary"], AccountType.ASSET),
      receiptCashAccountId: findAccount(["Cash", "Bank", "Primary"], AccountType.ASSET),
      payrollSalaryExpenseAccountId: findAccount(["Salary Expense", "Salaries Expense", "Employee Cost"], AccountType.EXPENSE),
      payrollDefaultSalaryPayableAccountId: findAccount(["Salaries Payable", "Salary Payable"], AccountType.LIABILITY),
      payrollTaxPayableAccountId: findAccount(["Tax Payable", "Withholding Tax"], AccountType.LIABILITY),
      payrollPfPayableAccountId: findAccount(["Employee PF Payable", "PF Payable", "Provident Fund", "Salaries Payable"], AccountType.LIABILITY),
      payrollDefaultAdvanceAccountId: findAccount(["Salary Advance", "Employee Advance", "Advance"], AccountType.ASSET) || findAccount(["Accounts Payable", "Account Payable"], AccountType.LIABILITY),
      payrollEmployerPfExpenseAccountId: findAccount(["Employer PF Expense", "PF Matching Expense", "PF Expense"], AccountType.EXPENSE),
      payrollEmployerPfPayableAccountId: findAccount(["Employer PF Payable", "PF Matching Payable", "PF Payable"], AccountType.LIABILITY),
      payrollFestivalBonusExpenseAccountId: findAccount(["Festival Bonus Expense", "Bonus Expense"], AccountType.EXPENSE),
    });
    setSuccess("Suggested accounts populated based on name matching!");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
        <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Information</p>
          <p className="mt-1">Define the default chart of accounts for automated bookkeeping. Star marked (*) fields are configurable.</p>
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={onAutofill}
          className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          Auto-suggest Accounts
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
        {/* Purchase */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
            <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">1</span>
            Purchase Operations
          </h3>
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <AccountSelector
              name="purchaseInventoryAccountId"
              label="DR - Inventory Account"
              types={[AccountType.ASSET]}
              accounts={accounts}
              loadingAccounts={loadingAccounts}
              control={control}
              errors={errors}
            />
            <DynamicLabel label="CR - Account Payable" value="Dynamic selected from Supplier Account" />
          </div>
        </section>

        {/* Sales */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
            <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">2</span>
            Sales Operations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Revenue Entry</p>
              <AccountSelector
                name="salesRevenueAccountId"
                label="CR - Sales Revenue"
                types={[AccountType.REVENUE]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
              <AccountSelector
                name="salesCouponDiscountAccountId"
                label="DR - Coupon Discount (Optional)"
                types={[AccountType.REVENUE, AccountType.EXPENSE]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
              <AccountSelector
                name="salesSalesDiscountAccountId"
                label="DR - Sales Discount (Optional)"
                types={[AccountType.REVENUE, AccountType.EXPENSE]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
              <DynamicLabel label="DR - Account Receivable" value="Dynamic selected from Client Account" />
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">COGS Entry</p>
              <AccountSelector
                name="salesCogsAccountId"
                label="DR - Cost of Goods Sold"
                types={[AccountType.EXPENSE]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
              <AccountSelector
                name="salesFinishedGoodsInventoryAccountId"
                label="CR - Ready Products Inventory"
                types={[AccountType.ASSET]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
            </div>
          </div>
        </section>

        {/* Production */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
            <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">3</span>
            Production Operations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Raw Material Consumption</p>
              <AccountSelector
                name="productionConsumptionWipAccountId"
                label="DR - Work In Progress (WIP)"
                types={[AccountType.ASSET]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
              <AccountSelector
                name="productionConsumptionRawMaterialInventoryId"
                label="CR - Raw Material Inventory"
                types={[AccountType.ASSET]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Production Completion</p>
              <AccountSelector
                name="productionCompletionFinishedGoodsInventoryId"
                label="DR - Ready Products Inventory"
                types={[AccountType.ASSET]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
              <AccountSelector
                name="productionCompletionWipAccountId"
                label="CR - Work In Progress (WIP)"
                types={[AccountType.ASSET]}
                accounts={accounts}
                loadingAccounts={loadingAccounts}
                control={control}
                errors={errors}
              />
            </div>
          </div>
        </section>

        {/* Inventory Adjustment */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
            <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">4</span>
            Inventory Adjustments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">Positive Adjustment</p>
              <div className="space-y-4">
                <AccountSelector
                  name="inventoryAdjustmentPositiveFgId"
                  label="DR - Ready Products"
                  types={[AccountType.ASSET]}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="inventoryAdjustmentPositiveRmId"
                  label="DR - Raw material"
                  types={[AccountType.ASSET]}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="inventoryAdjustmentPositiveGainId"
                  label="CR - Adjustment Gain"
                  types={[AccountType.REVENUE, AccountType.EQUITY]}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
              </div>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-destructive uppercase tracking-wider mb-2">Negative Adjustment</p>
              <div className="space-y-4">
                <AccountSelector
                  name="inventoryAdjustmentNegativeFgId"
                  label="CR - Ready Products"
                  types={[AccountType.ASSET]}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="inventoryAdjustmentNegativeRmId"
                  label="CR - Raw material"
                  types={[AccountType.ASSET]}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="inventoryAdjustmentNegativeExpenseId"
                  label="DR - Adjustment Expense"
                  types={[AccountType.EXPENSE]}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Payroll Operations */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
            <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs">5</span>
            Payroll Operations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Employee Payroll</p>
              <div className="space-y-4">
                <AccountSelector
                  name="payrollSalaryExpenseAccountId"
                  label="DR - Salary Expense"
                  types={[AccountType.EXPENSE]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="payrollDefaultSalaryPayableAccountId"
                  label="CR - Default Salary Payable"
                  types={[AccountType.LIABILITY]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="payrollTaxPayableAccountId"
                  label="CR - Employee Tax Payable"
                  types={[AccountType.LIABILITY]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="payrollPfPayableAccountId"
                  label="CR - Employee PF Payable"
                  types={[AccountType.LIABILITY]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="payrollDefaultAdvanceAccountId"
                  label="CR - Default Advance / Loan Account"
                  types={[AccountType.ASSET, AccountType.LIABILITY]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
              </div>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg h-full">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Employer Contributions</p>
              <div className="space-y-4">
                <AccountSelector
                  name="payrollEmployerPfExpenseAccountId"
                  label="DR - Employer PF Expense"
                  types={[AccountType.EXPENSE]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="payrollEmployerPfPayableAccountId"
                  label="CR - Employer PF Payable"
                  types={[AccountType.LIABILITY]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
                <AccountSelector
                  name="payrollFestivalBonusExpenseAccountId"
                  label="DR - Festival Bonus Expense"
                  types={[AccountType.EXPENSE]}
                  required={false}
                  accounts={accounts}
                  loadingAccounts={loadingAccounts}
                  control={control}
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGlobal"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="isGlobal" className="text-sm cursor-pointer font-normal">
              Apply these settings globally (for all users)
            </Label>
          </div>
          <Button type="submit" size="lg" className="w-full md:w-auto" disabled={loading}>
            <FiSave className="mr-2" /> Save Accounting Mappings
          </Button>
        </div>
      </form>

      {success && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
            <FiSave /> {success}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-destructive text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
            <FiAlertCircle /> {error}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components moved outside to prevent unmounting during re-renders
const DynamicLabel = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 py-2 border-b border-dashed border-muted-foreground/20">
    <span className="text-sm font-medium">{label}</span>
    <span className="md:col-span-2 text-sm text-muted-foreground italic flex items-center gap-2">
      <FiInfo className="h-3 w-3" /> {value}
    </span>
  </div>
);

interface AccountSelectorProps {
  name: keyof FormData;
  label: string;
  types: AccountType[];
  required?: boolean;
  accounts: Account[];
  loadingAccounts: boolean;
  control: any;
  errors: any;
}

const AccountSelector = ({
  name,
  label,
  types,
  required = true,
  accounts,
  loadingAccounts,
  control,
  errors,
}: AccountSelectorProps) => {
  const filteredOptions = accounts
    .filter((acc) => types.includes(acc.type))
    .map((acc) => ({
      label: `${acc.code} - ${acc.name}`,
      value: acc.id,
      description: acc.type,
    }));
  const fieldError = errors[name];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
      <Label htmlFor={name} className="font-medium text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="md:col-span-2 space-y-1">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <SearchableSelect
              options={filteredOptions}
              value={field.value as string}
              onValueChange={field.onChange}
              disabled={loadingAccounts}
              placeholder="Select account..."
              searchPlaceholder="Search accounts..."
            />
          )}
        />
        {fieldError && (
          <p className="text-xs text-destructive">{fieldError.message}</p>
        )}
      </div>
    </div>
  );
};
