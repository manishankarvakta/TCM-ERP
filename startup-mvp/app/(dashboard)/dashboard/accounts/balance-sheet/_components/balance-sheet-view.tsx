"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Building2,
  Scale,
  Wallet,
  CheckCircle2,
  XCircle,
  ChevronsDownUp,
  ChevronsUpDown,
  Printer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  balance: number;
  total?: number;
  children: AccountNode[];
}

interface BalanceSheetViewProps {
  assets: { accounts: AccountNode[]; total: number };
  liabilities: { accounts: AccountNode[]; total: number };
  equity: { accounts: AccountNode[]; netIncome: number; total: number };
  validation: {
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
    isBalanced: boolean;
    difference: number;
  };
  date: Date;
  dateParam?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNodeTotal(node: AccountNode): number {
  if (!node.children || node.children.length === 0) return node.balance;
  return node.balance + node.children.reduce((s, c) => s + getNodeTotal(c), 0);
}

/** Remove only leaf accounts (no children) whose balance is 0. Parents always show. */
function filterZeros(nodes: AccountNode[]): AccountNode[] {
  return nodes
    .map((n) => ({ ...n, children: filterZeros(n.children) }))
    .filter((n) => n.children.length > 0 || getNodeTotal(n) !== 0);
}

/**
 * Unwrap top-level section roots (like 1000 Assets, 2000 Liabilities, 3000 Equity)
 * so section cards show direct sub-categories (e.g. Current Assets, Fixed Assets)
 * while preserving all intermediate parent categories and hierarchy intact.
 */
function prepareTree(accounts: AccountNode[]): AccountNode[] {
  const filtered = filterZeros(accounts);
  if (
    filtered.length === 1 &&
    ["1000", "2000", "3000"].includes(filtered[0].code) &&
    filtered[0].children.length > 0
  ) {
    return filtered[0].children;
  }
  return filtered;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}


// ─── Recursive Account Row ────────────────────────────────────────────────────

interface TreeRowProps {
  node: AccountNode;
  depth: number;
  defaultExpanded: boolean;
  collapseKey: number;
  expandKey: number;
}

function TreeRow({
  node,
  depth,
  defaultExpanded,
  collapseKey,
  expandKey,
}: TreeRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [prevCK, setPrevCK] = useState(collapseKey);
  const [prevEK, setPrevEK] = useState(expandKey);

  if (collapseKey !== prevCK) {
    setPrevCK(collapseKey);
    setExpanded(false);
  }
  if (expandKey !== prevEK) {
    setPrevEK(expandKey);
    setExpanded(true);
  }

  const hasChildren = node.children && node.children.length > 0;
  const total = getNodeTotal(node);
  const indent = 12 + depth * 22;

  return (
    <>
      <div
        className={[
          "group flex items-center justify-between py-2 pr-4 rounded-lg transition-all duration-150 select-none",
          hasChildren
            ? "cursor-pointer hover:bg-muted/40 font-medium"
            : "text-foreground/80",
          depth === 0 ? "text-[13.5px]" : "text-[12.5px]",
        ].join(" ")}
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => hasChildren && setExpanded((v) => !v)}
        role={hasChildren ? "button" : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {hasChildren ? (
            <ChevronRight
              className={[
                "h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200",
                expanded ? "rotate-90" : "",
              ].join(" ")}
            />
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0 min-w-[3.5rem] tabular-nums">
            {node.code}
          </span>
          <span className="truncate leading-tight">{node.name}</span>
          {hasChildren && (
            <span className="ml-1 text-[10px] text-muted-foreground/40 shrink-0">
              ({node.children.length})
            </span>
          )}
        </div>
        <span
          className={[
            "tabular-nums flex-shrink-0 font-medium",
            total < 0 ? "text-red-400" : "",
          ].join(" ")}
        >
          {fmt(total)}
        </span>
      </div>

      {hasChildren && (
        <div className={expanded ? "block" : "hidden print:block"}>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              defaultExpanded={false}
              collapseKey={collapseKey}
              expandKey={expandKey}
            />
          ))}
          {depth >= 1 && (
            <div
              className="flex items-center justify-between py-1 pr-4 border-t border-border/30 mt-0.5 text-[11px] text-muted-foreground/60"
              style={{ paddingLeft: `${indent + 20}px` }}
            >
              <span>Subtotal: {node.name}</span>
              <span className="tabular-nums font-medium">{fmt(total)}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  accounts: AccountNode[];
  total: number;
  accentClass: string;
  totalLabel: string;
  extraRows?: React.ReactNode;
}

function SectionCard({
  title,
  icon,
  accounts,
  total,
  accentClass,
  totalLabel,
  extraRows,
}: SectionCardProps) {
  const [ck, setCk] = useState(0);
  const [ek, setEk] = useState(0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b border-border/40 ${accentClass}`}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-background/50 border border-border/20 shadow-2xs shrink-0">{icon}</div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-foreground">
              {title}
            </h2>
            <p className="text-[10.5px] text-muted-foreground font-medium leading-none mt-0.5">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setEk((v) => v + 1)}
            title="Expand all"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setCk((v) => v + 1)}
            title="Collapse all"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tree */}
      {(() => {
        const nodes = prepareTree(accounts);
        return (
          <div className="px-2 py-2 min-h-[60px]">
            {nodes.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground/40">
                No accounts with activity
              </div>
            ) : (
              nodes.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  defaultExpanded={false}
                  collapseKey={ck}
                  expandKey={ek}
                />
              ))
            )}
            {extraRows}
          </div>
        );
      })()}

      {/* Footer total */}
      <div className="px-5 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          {totalLabel}
        </span>
        <span className="text-base font-bold tabular-nums">{fmt(total)}</span>
      </div>
    </div>
  );
}

// ─── Main Page View ───────────────────────────────────────────────────────────

export default function BalanceSheetView({
  assets,
  liabilities,
  equity,
  validation,
  date,
  dateParam,
}: BalanceSheetViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("date", value);
      else params.delete("date");
      router.push(`/dashboard/accounts/balance-sheet?${params.toString()}`);
    },
    [router, searchParams]
  );

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date instanceof Date ? date : new Date(date));

  return (
    <div id="printable-content" className="space-y-5">
      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            As of Date
          </label>
          <Input
            type="date"
            value={dateParam || new Date().toISOString().split("T")[0]}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-[180px] h-9 text-sm"
          />
          <span className="text-xs text-muted-foreground/60 hidden sm:block">
            {formattedDate}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={validation.isBalanced ? "default" : "destructive"}
            className="gap-1.5 py-1 px-3 text-xs"
          >
            {validation.isBalanced ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Balanced
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Off by {fmt(validation.difference)}
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Three-column grid: Assets | Liabilities | Equity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ASSETS */}
        <SectionCard
          title="Assets"
          icon={<Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
          accounts={assets.accounts}
          total={assets.total}
          accentClass="bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40"
          totalLabel="Total Assets"
        />

        {/* LIABILITIES */}
        <SectionCard
          title="Liabilities"
          icon={<Scale className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
          accounts={liabilities.accounts}
          total={liabilities.total}
          accentClass="bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40"
          totalLabel="Total Liabilities"
        />

        {/* EQUITY */}
        <SectionCard
          title="Equity"
          icon={<Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
          accounts={equity.accounts}
          total={equity.total}
          accentClass="bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40"
          totalLabel="Total Equity (incl. Net Income)"
          extraRows={
            <div
              className="flex items-center justify-between py-2 pr-4 rounded-lg text-[12.5px] select-none hover:bg-muted/40 transition-colors"
              style={{ paddingLeft: "12px" }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0 min-w-[3.5rem] tabular-nums">
                  3130
                </span>
                <span className="truncate leading-tight italic font-medium text-foreground/90">
                  Net Income (Current Year)
                </span>
              </div>
              <span
                className={[
                  "tabular-nums font-medium shrink-0",
                  equity.netIncome < 0 ? "text-red-400" : "text-emerald-500",
                ].join(" ")}
              >
                {fmt(equity.netIncome)}
              </span>
            </div>
          }
        />
      </div>

      {/* ── Accounting Equation Bar (footer) ── */}
      <div className="rounded-xl border border-border/50 bg-card px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 md:gap-10">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
              Total Assets
            </p>
            <p className="text-xl font-bold tabular-nums">
              {fmt(validation.assetsTotal)}
            </p>
          </div>
          <span className="text-3xl font-thin text-muted-foreground/30">=</span>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
              Liabilities + Equity
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className={[
                  "text-xl font-bold tabular-nums",
                  !validation.isBalanced ? "text-red-500" : "",
                ].join(" ")}
              >
                {fmt(validation.liabilitiesTotal + validation.equityTotal)}
              </p>
              <span className="text-xs text-muted-foreground/70 font-mono font-medium">
                ({fmt(validation.liabilitiesTotal)} + {fmt(validation.equityTotal)})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-start">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
              Difference
            </p>
            <p
              className={[
                "text-xl font-bold tabular-nums",
                validation.isBalanced ? "text-emerald-500" : "text-red-500",
              ].join(" ")}
            >
              {fmt(validation.difference)}
            </p>
          </div>
          <Badge
            variant={validation.isBalanced ? "outline" : "destructive"}
            className={
              validation.isBalanced
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs"
                : "gap-1 text-xs"
            }
          >
            {validation.isBalanced ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" /> Out of Balance
              </>
            )}
          </Badge>
        </div>
      </div>
    </div>
  );
}
