"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Zap, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  MoreHorizontal,
  Wallet,
  CreditCard,
  Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasPermission } from "@/lib/permissions";
import { getRealtimeDashboardStats } from "@/app/actions/dashboard-realtime.action";

interface BeautifulDashboardProps {
  userId: string;
  userName: string;
  userRole: string;
  defaultWarehouse: { id: string; name: string } | null;
  warehouses: { id: string; name: string }[];
}

export default function BeautifulDashboard({ 
  userId, 
  userName, 
  userRole, 
  defaultWarehouse, 
  warehouses 
}: BeautifulDashboardProps) {
  const isAdmin = userRole === "admin" || userRole === "super-admin";

  const [permissions, setPermissions] = useState({
    canViewWholesale: false,
    canViewExpenses: false,
    canViewDeposits: false,
    canViewPayments: false,
  });

  // State for Warehouse selection (Admins default to "all", normal users default to assigned warehouse)
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ id: string; name: string } | "all">(
    !isAdmin && defaultWarehouse 
      ? defaultWarehouse 
      : (!isAdmin && warehouses.length > 0)
        ? warehouses[0]
        : "all"
  );
  const [warehouseMenuOpen, setWarehouseMenuOpen] = useState(false);

  // State for Date range filter
  const [selectedDateFilter, setSelectedDateFilter] = useState<"today" | "this-week" | "this-month" | "this-year" | "custom">("today");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  // State for Stock & Value Card tab (Retail vs Wholesale)
  const [stockTab, setStockTab] = useState<"retail" | "wholesale">("retail");

  // State for Chart specific range
  const [chartRange, setChartRange] = useState<"7-days" | "last-month" | "3-months" | "last-year">("7-days");
  const [chartMenuOpen, setChartMenuOpen] = useState(false);

  // State to toggle series visibility on the chart
  const [visibleMetrics, setVisibleMetrics] = useState({
    sales: true,
    purchase: true,
    expense: true,
    due: true,
  });

  // Stats Data State
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hover state for the interactive SVG chart
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!stats?.chartData || stats.chartData.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    
    const N = stats.chartData.length;
    let closestIdx = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < N; i++) {
      const pointX = N > 1 ? 80 + i * (660 / (N - 1)) : 80;
      const diff = Math.abs(x - pointX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  // Fetch dynamic stats from database
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const warehouseId = selectedWarehouse === "all" ? "all" : selectedWarehouse.id;
      const res = await getRealtimeDashboardStats(warehouseId, selectedDateFilter, customDateRange, chartRange);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedDateFilter, customDateRange, chartRange]);

  useEffect(() => {
    async function checkPerms() {
      try {
        const [canViewWholesale, canViewExpenses, canViewDeposits, canViewPayments] = await Promise.all([
          hasPermission(userId, "sales.pos", "wholesale"),
          hasPermission(userId, "accounts.vouchers", "create-expense"),
          hasPermission(userId, "accounts.vouchers", "create-deposit"),
          hasPermission(userId, "accounts.vouchers", "create-payment"),
        ]);
        setPermissions({ canViewWholesale, canViewExpenses, canViewDeposits, canViewPayments });
      } catch (err) {
        console.error("Failed to check permissions:", err);
      }
    }
    checkPerms();
    fetchStats();
  }, [userId, fetchStats]);

  const getDateFilterLabel = () => {
    if (selectedDateFilter === "today") return "Today";
    if (selectedDateFilter === "this-week") return "This Week";
    if (selectedDateFilter === "this-month") return "This Month";
    if (selectedDateFilter === "this-year") return "This Year";
    if (selectedDateFilter === "custom") {
      return `${customDateRange.from} to ${customDateRange.to}`;
    }
    return "Today";
  };

  const getChartRangeLabel = () => {
    if (chartRange === "7-days") return "Last 7 Days";
    if (chartRange === "last-month") return "Last Month";
    if (chartRange === "3-months") return "Last 3 Month";
    if (chartRange === "last-year") return "Last Year";
    return "Last 7 Days";
  };

  // Helper function to build dynamic SVG line charts
  const getPathD = (dataPoints: number[]) => {
    if (!dataPoints || dataPoints.length === 0) return "";
    const N = dataPoints.length;
    const maxVal = Math.max(...dataPoints, 100);
    const points = dataPoints.map((val, i) => {
      const x = N > 1 ? 80 + i * (660 / (N - 1)) : 80;
      const y = 190 - (maxVal > 0 ? (val / maxVal) * 160 : 0);
      return { x, y };
    });
    
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const stepX = N > 1 ? (660 / (N - 1)) / 2 : 55;
      const cpX1 = p0.x + stepX;
      const cpY1 = p0.y;
      const cpX2 = p1.x - stepX;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  // Build chart coordinates
  const salesPoints = stats?.chartData?.map((d: any) => d.sales) || [0, 0, 0, 0, 0, 0, 0];
  const purchasePoints = stats?.chartData?.map((d: any) => d.purchase) || [0, 0, 0, 0, 0, 0, 0];
  const expensePoints = stats?.chartData?.map((d: any) => d.expense) || [0, 0, 0, 0, 0, 0, 0];
  const duePoints = stats?.chartData?.map((d: any) => d.due) || [0, 0, 0, 0, 0, 0, 0];

  const activePoints = [
    ...(visibleMetrics.sales ? salesPoints : []),
    ...(visibleMetrics.purchase ? purchasePoints : []),
    ...(visibleMetrics.expense ? expensePoints : []),
    ...(visibleMetrics.due ? duePoints : []),
  ];
  const maxChartVal = activePoints.length > 0 ? Math.max(...activePoints, 1000) : 1000;

  const chartN = salesPoints.length;
  const activeIdx = hoveredIdx !== null ? hoveredIdx : 0;
  const activeCx = chartN > 1 ? 80 + activeIdx * (660 / (chartN - 1)) : 80;
  const activeCy = 190 - (maxChartVal > 0 ? (salesPoints[activeIdx] / maxChartVal) * 160 : 0);
  const tooltipLeftPercent = ((activeCx) / 800) * 100;

  const formatValue = (val: number) => {
    if (val % 1 === 0) {
      return `৳ ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `৳ ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex-1 space-y-6 p-0 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-900 dark:text-zinc-100 min-h-screen">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome Back, {userName}!</h1>
        </div>
 
        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* POS Link */}
          <Link 
            href="/dashboard/sales/pos"
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-emerald-600 dark:text-emerald-400 font-semibold text-sm transition-colors"
          >
            <Zap className="h-4 w-4 fill-emerald-100 dark:fill-emerald-950/50" />
            <span>POS</span>
          </Link>
          
          {/* Wholesale Link */}
          {permissions.canViewWholesale && (
            <Link 
              href="/dashboard/sales/pos?mode=WHOLESALE"
              className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-purple-600 dark:text-purple-400 font-semibold text-sm transition-colors"
            >
              <ShoppingBag className="h-4 w-4 fill-purple-100 dark:fill-purple-950/50" />
              <span>Wholesale</span>
            </Link>
          )}

          {/* Expenses Link */}
          {permissions.canViewExpenses && (
            <Link 
              href="/dashboard/accounts/vouchers/expenses/add"
              className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-amber-600 dark:text-amber-400 font-semibold text-sm transition-colors"
            >
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span>Expenses</span>
            </Link>
          )}

          {/* Deposit Link */}
          {permissions.canViewDeposits && (
            <Link 
              href="/dashboard/accounts/vouchers/deposits/add"
              className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-blue-600 dark:text-blue-400 font-semibold text-sm transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span>Deposit</span>
            </Link>
          )}

          {/* Payment Link */}
          {permissions.canViewPayments && (
            <Link 
              href="/dashboard/accounts/vouchers/payment/add"
              className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-rose-600 dark:text-rose-400 font-semibold text-sm transition-colors"
            >
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span>Payment</span>
            </Link>
          )}

          {/* Warehouse Dropdown */}
          <div className="relative">
            <button 
              onClick={() => isAdmin && setWarehouseMenuOpen(!warehouseMenuOpen)}
              disabled={!isAdmin}
              className={`flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-200 font-semibold text-sm transition-colors ${
                !isAdmin ? "opacity-60 cursor-not-allowed bg-slate-100/50 dark:bg-zinc-950/50" : "hover:bg-slate-50 dark:hover:bg-zinc-800/80"
              }`}
            >
              <span>{selectedWarehouse === "all" ? "All Warehouse" : selectedWarehouse.name}</span>
              {isAdmin && <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            
            {isAdmin && warehouseMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedWarehouse("all");
                    setWarehouseMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                >
                  All Warehouse
                </button>
                {warehouses.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setSelectedWarehouse(w);
                      setWarehouseMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setDateMenuOpen(!dateMenuOpen);
                setShowCustomInputs(false);
              }}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 px-4 h-10 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-200 font-semibold text-sm transition-colors"
            >
              <span>{getDateFilterLabel()}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {dateMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-lg p-2 z-50 space-y-1">
                {!showCustomInputs ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedDateFilter("today");
                        setDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        selectedDateFilter === "today" ? "bg-slate-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDateFilter("this-week");
                        setDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        selectedDateFilter === "this-week" ? "bg-slate-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDateFilter("this-month");
                        setDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        selectedDateFilter === "this-month" ? "bg-slate-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDateFilter("this-year");
                        setDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        selectedDateFilter === "this-year" ? "bg-slate-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      This Year
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />
                    <button
                      onClick={() => {
                        setShowCustomInputs(true);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                        selectedDateFilter === "custom" ? "bg-slate-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      Custom Date Range...
                    </button>
                  </>
                ) : (
                  <div className="p-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Date Range</span>
                      <button 
                        onClick={() => setShowCustomInputs(false)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Back
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">From</label>
                      <input 
                        type="date"
                        value={customDateRange.from}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })}
                        className="w-full text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                      <input 
                        type="date"
                        value={customDateRange.to}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })}
                        className="w-full text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <Button 
                      size="sm"
                      className="w-full font-bold text-xs"
                      onClick={() => {
                        setSelectedDateFilter("custom");
                        setDateMenuOpen(false);
                      }}
                    >
                      Apply Range
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Section - 2 Row Layout (3/5 and 2/5 Split) */}
      <div className="space-y-4">
        {/* ROW 1: 3/5 (Sales Revenue, Paid Sale, Due Sale) | 2/5 (Sale Discounts) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left 3/5 Block */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Sales Revenue */}
            <div className={`p-4 rounded-2xl bg-[#FCF5EC] dark:bg-amber-950/15 border border-amber-100/50 dark:border-amber-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Sale Revenue</p>
                <p className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-50">
                  {loading ? "..." : formatValue(stats?.revenue || 0)}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2">
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
                    stats?.revenueGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {stats?.revenueGrowth >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(stats?.revenueGrowth || 0).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>

            {/* Card 3: Paid Sale */}
            <div className={`p-4 rounded-2xl bg-[#F2F8F2] dark:bg-emerald-950/15 border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Paid Sale</p>
                <p className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-50">
                  {loading ? "..." : formatValue(stats?.paidSaleTotal || 0)}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center text-[10px] mt-2">
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
                    stats?.paidSaleGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {stats?.paidSaleGrowth >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(stats?.paidSaleGrowth || 0).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>

            {/* Card 4: Due Sale */}
            <div className={`p-4 rounded-2xl bg-[#EBF7F5] dark:bg-teal-950/15 border border-teal-100/50 dark:border-teal-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Due Sale</p>
                <p className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-50">
                  {loading ? "..." : formatValue(stats?.dueTotal || 0)}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2">
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
                    stats?.dueGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {stats?.dueGrowth >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(stats?.dueGrowth || 0).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right 2/5 Block: Card 2 - Sale Discounts */}
          <div className="lg:col-span-2">
            <div className={`p-4 rounded-2xl bg-[#FDF2F8] dark:bg-pink-950/15 border border-pink-100/50 dark:border-pink-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Sale Discounts</p>
                  {!loading && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400">
                      Total: {formatValue(stats?.totalSaleDiscount || 0)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/40 border border-pink-100/60 dark:border-pink-900/20">
                    <p className="text-[10px] font-medium text-slate-400">General</p>
                    <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                      {loading ? "..." : formatValue(stats?.generalDiscount || 0)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/40 border border-pink-100/60 dark:border-pink-900/20">
                    <p className="text-[10px] font-medium text-slate-400">Coupon</p>
                    <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                      {loading ? "..." : formatValue(stats?.couponDiscount || 0)}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-pink-50/80 dark:bg-pink-950/30 border border-pink-200/60 dark:border-pink-900/40">
                    <p className="text-[10px] font-bold text-pink-600 dark:text-pink-400">Total Disc</p>
                    <p className="font-bold text-pink-700 dark:text-pink-300 mt-0.5">
                      {loading ? "..." : formatValue(stats?.totalSaleDiscount || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: 3/5 (Collections Received, Purchase, Expenses) | 2/5 (Retail Stock & Value) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left 3/5 Block */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 5: Collections Received */}
            <div className={`p-4 rounded-2xl bg-[#F5F2F9] dark:bg-purple-950/15 border border-purple-100/50 dark:border-purple-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Collections Received</p>
                <p className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-50">
                  {loading ? "..." : formatValue(stats?.collectionsReceived || 0)}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center text-[10px] mt-2">
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
                    stats?.collectionsReceivedGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {stats?.collectionsReceivedGrowth >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(stats?.collectionsReceivedGrowth || 0).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>

            {/* Card 6: Purchase */}
            <div className={`p-4 rounded-2xl bg-[#F0F4FA] dark:bg-blue-950/15 border border-blue-100/50 dark:border-blue-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Purchase</p>
                <p className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-50">
                  {loading ? "..." : formatValue(stats?.purchaseTotal || 0)}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center gap-1.5 text-[10px] mt-2">
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
                    stats?.purchaseGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {stats?.purchaseGrowth >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(stats?.purchaseGrowth || 0).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>

            {/* Card 7: Expenses */}
            <div className={`p-4 rounded-2xl bg-[#FAF0F2] dark:bg-rose-950/15 border border-rose-100/50 dark:border-rose-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Expenses</p>
                <p className="text-xl font-bold mt-2 text-slate-900 dark:text-zinc-50">
                  {loading ? "..." : formatValue(stats?.expenseTotal || 0)}
                </p>
              </div>
              {!loading && (
                <div className="flex items-center text-[10px] mt-2">
                  <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
                    stats?.expenseGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                  }`}>
                    {stats?.expenseGrowth >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(stats?.expenseGrowth || 0).toFixed(1)} %
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right 2/5 Block: Card 8 - Stock & Value (Retail / Wholesale Tabs) */}
          <div className="lg:col-span-2">
            <div className={`p-4 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/15 border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm flex flex-col justify-between h-full min-h-[135px] ${loading ? "animate-pulse" : ""}`}>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    {stockTab === "retail" ? "Retail Stock & Value" : "Wholesale Stock & Value"}
                  </p>
                  
                  {/* Retail / Wholesale Tab Switcher */}
                  <div className="flex items-center p-0.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] font-bold">
                    <button
                      onClick={() => setStockTab("retail")}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        stockTab === "retail"
                          ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs"
                          : "text-slate-500 dark:text-zinc-400 hover:text-emerald-600"
                      }`}
                    >
                      Retail
                    </button>
                    <button
                      onClick={() => setStockTab("wholesale")}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        stockTab === "wholesale"
                          ? "bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 shadow-xs"
                          : "text-slate-500 dark:text-zinc-400 hover:text-emerald-600"
                      }`}
                    >
                      Wholesale
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/40 border border-emerald-100/60 dark:border-emerald-900/20">
                    <p className="text-[10px] font-medium text-slate-400">Total Quantity</p>
                    <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                      {loading
                        ? "..."
                        : `${(stockTab === "retail" ? stats?.retailStock?.totalQuantity || 0 : stats?.wholesaleStock?.totalQuantity || 0).toLocaleString()} pcs`}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/40 border border-emerald-100/60 dark:border-emerald-900/20">
                    <p className="text-[10px] font-medium text-slate-400">
                      {stockTab === "retail" ? "Sale Value" : "Wholesale Value"}
                    </p>
                    <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                      {loading
                        ? "..."
                        : formatValue(
                            stockTab === "retail"
                              ? stats?.retailStock?.saleValue || 0
                              : stats?.wholesaleStock?.saleValue || 0
                          )}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-zinc-900/40 border border-emerald-100/60 dark:border-emerald-900/20">
                    <p className="text-[10px] font-medium text-slate-400">Stock Value</p>
                    <p className="font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                      {loading
                        ? "..."
                        : formatValue(
                            stockTab === "retail"
                              ? stats?.retailStock?.stockValue || 0
                              : stats?.wholesaleStock?.stockValue || 0
                          )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Balances Section */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Account Balances (By Account)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {loading ? (
            // Skeleton load state
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 shadow-sm h-[74px] animate-pulse flex flex-col justify-between">
                <div className="flex items-center justify-between w-full">
                  <div className="h-3 w-16 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-6 w-6 bg-slate-100 dark:bg-zinc-800 rounded-lg" />
                </div>
                <div className="flex items-center justify-between w-full mt-2">
                  <div className="h-3 w-20 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3.5 w-12 bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))
          ) : !stats?.receivedAccounts || stats.receivedAccounts.length === 0 ? (
            <div className="col-span-full p-4 text-center text-xs text-slate-400 bg-white dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 rounded-xl">
              No active cash, bank, or MFS accounts found for the selected warehouse.
            </div>
          ) : (
            stats.receivedAccounts.map((account: any) => {
              // Icon mapping
              let Icon = Coins;
              let bgClass = "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20";
              let textClass = "text-emerald-600 dark:text-emerald-400";
              
              if (account.type === "BANK") {
                Icon = CreditCard;
                bgClass = "bg-blue-50/50 dark:bg-blue-950/10 border-blue-100/50 dark:border-blue-900/20";
                textClass = "text-blue-600 dark:text-blue-400";
              } else if (account.type === "MFS") {
                Icon = Wallet;
                bgClass = "bg-purple-50/50 dark:bg-purple-950/10 border-purple-100/50 dark:border-purple-900/20";
                textClass = "text-purple-600 dark:text-purple-400";
              }

              // Compute ledger link with date filter
              let dateParams = "";
              if (selectedDateFilter === "custom" && customDateRange.from && customDateRange.to) {
                dateParams = `&dateFrom=${customDateRange.from}&dateTo=${customDateRange.to}`;
              } else {
                const now = new Date();
                let from = "";
                let to = now.toISOString().split("T")[0];
                if (selectedDateFilter === "today") {
                  from = now.toISOString().split("T")[0];
                } else if (selectedDateFilter === "this-week") {
                  const startOfWeek = new Date(now);
                  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // start on Monday
                  from = startOfWeek.toISOString().split("T")[0];
                } else if (selectedDateFilter === "this-month") {
                  from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
                } else if (selectedDateFilter === "this-year") {
                  from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
                }
                if (from) {
                  dateParams = `&dateFrom=${from}&dateTo=${to}`;
                }
              }

              const debitVal = account.debit ?? 0;
              const creditVal = account.credit ?? 0;
              const balVal = account.balance ?? account.ledgerBalance ?? account.receivedAmount ?? 0;

              const formatAmt = (val: number) =>
                `৳ ${val % 1 === 0 ? val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <div key={account.id} className="relative group">
                  {/* Hover Popover Overlay with Full Details */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xl z-50 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${bgClass} ${textClass}`}>
                          {account.type}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
                          {account.coaCode}
                        </span>
                      </div>
                      <div className={`p-1 rounded-md ${bgClass}`}>
                        <Icon className={`h-3.5 w-3.5 ${textClass}`} />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                      {account.coaName}
                    </p>

                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Debit (Dr)</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatAmt(debitVal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                        <span className="text-[10px] font-medium text-rose-500 dark:text-rose-400 uppercase">Credit (Cr)</span>
                        <span className="font-semibold text-rose-500 dark:text-rose-400">{formatAmt(creditVal)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-zinc-800 pt-1.5 font-bold">
                        <span className="text-[10px] uppercase text-slate-500 dark:text-zinc-400">Net Balance</span>
                        <span className={balVal >= 0 ? "text-slate-950 dark:text-zinc-50" : "text-rose-600 dark:text-rose-400"}>
                          {formatAmt(balVal)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 dark:text-zinc-500 pt-1">
                      Click card to open full ledger →
                    </div>
                  </div>

                  {/* Dashboard Card Surface (Shows ONLY Balance) */}
                  <Link
                    href={`/dashboard/accounts/ledgers?accountId=${account.coaId}${dateParams}`}
                    className="p-3 rounded-xl bg-white hover:bg-slate-50/80 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01] cursor-pointer h-[74px] w-full"
                  >
                    {/* Row 1: Code/Type and Icon */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider ${bgClass} ${textClass}`}>
                          {account.type}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-zinc-500">
                          {account.coaCode}
                        </span>
                      </div>
                      <div className={`p-1.5 rounded-lg shrink-0 ${bgClass}`}>
                        <Icon className={`h-4 w-4 ${textClass}`} />
                      </div>
                    </div>

                    {/* Row 2: Name and Balance ONLY */}
                    <div className="flex items-end justify-between w-full mt-2 gap-2 overflow-hidden">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 truncate flex-1" title={account.coaName}>
                        {account.coaName}
                      </p>
                      <p className={`text-xs font-extrabold shrink-0 ${balVal >= 0 ? "text-slate-950 dark:text-zinc-50" : "text-rose-600 dark:text-rose-400"}`}>
                        {formatAmt(balVal)}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Container */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Summary Chart Card */}
          <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Summary</h3>
                </div>
                
                {/* Legend */}
                 <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                   <button 
                     onClick={() => setVisibleMetrics({ ...visibleMetrics, sales: !visibleMetrics.sales })}
                     className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 ${visibleMetrics.sales ? "opacity-100" : "opacity-35"}`}
                     title="Toggle Sales"
                   >
                     <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 dark:bg-emerald-600"></span>
                     <span className="text-slate-500 dark:text-zinc-400">Sales</span>
                   </button>
                   <button 
                     onClick={() => setVisibleMetrics({ ...visibleMetrics, purchase: !visibleMetrics.purchase })}
                     className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 ${visibleMetrics.purchase ? "opacity-100" : "opacity-35"}`}
                     title="Toggle Purchase"
                   >
                     <span className="h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-500"></span>
                     <span className="text-slate-500 dark:text-zinc-400">Purchase</span>
                   </button>
                   <button 
                     onClick={() => setVisibleMetrics({ ...visibleMetrics, expense: !visibleMetrics.expense })}
                     className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 ${visibleMetrics.expense ? "opacity-100" : "opacity-35"}`}
                     title="Toggle Expenses"
                   >
                     <span className="h-2.5 w-2.5 rounded-full bg-amber-600 dark:bg-amber-500"></span>
                     <span className="text-slate-500 dark:text-zinc-400">Expenses</span>
                   </button>
                   <button 
                     onClick={() => setVisibleMetrics({ ...visibleMetrics, due: !visibleMetrics.due })}
                     className={`flex items-center gap-1.5 transition-opacity hover:opacity-80 active:scale-95 ${visibleMetrics.due ? "opacity-100" : "opacity-35"}`}
                     title="Toggle Due"
                   >
                     <span className="h-2.5 w-2.5 rounded-full bg-rose-600 dark:bg-rose-500"></span>
                     <span className="text-slate-500 dark:text-zinc-400">Due</span>
                   </button>
                  <div className="relative">
                    <button 
                      onClick={() => setChartMenuOpen(!chartMenuOpen)}
                      className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-zinc-300 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-700"
                    >
                      <span>{getChartRangeLabel()}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {chartMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-700 shadow-lg py-1 z-50">
                        <button
                          onClick={() => {
                            setChartRange("7-days");
                            setChartMenuOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={() => {
                            setChartRange("last-month");
                            setChartMenuOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                        >
                          Last Month
                        </button>
                        <button
                          onClick={() => {
                            setChartRange("3-months");
                            setChartMenuOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                        >
                          Last 3 Month
                        </button>
                        <button
                          onClick={() => {
                            setChartRange("last-year");
                            setChartMenuOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium"
                        >
                          Last Year
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart SVG Container */}
              <div className={`relative w-full h-[220px] select-none ${loading ? "animate-pulse" : ""}`}>
                <svg 
                  viewBox="0 0 800 220" 
                  className="w-full h-full overflow-visible cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Grid Lines */}
                  <line x1="50" y1="30" x2="750" y2="30" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-800" />
                  <line x1="50" y1="70" x2="750" y2="70" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-800" />
                  <line x1="50" y1="110" x2="750" y2="110" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-800" />
                  <line x1="50" y1="150" x2="750" y2="150" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-800" />
                  <line x1="50" y1="190" x2="750" y2="190" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-zinc-800" />

                  {/* Y Axis Labels */}
                  <text x="35" y="34" className="text-[10px] font-bold fill-slate-400 text-right">
                    {(maxChartVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                  <text x="35" y="74" className="text-[10px] font-bold fill-slate-400 text-right">
                    {(maxChartVal * 0.7).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                  <text x="35" y="114" className="text-[10px] font-bold fill-slate-400 text-right">
                    {(maxChartVal * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                  <text x="35" y="154" className="text-[10px] font-bold fill-slate-400 text-right">
                    {(maxChartVal * 0.3).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                  <text x="35" y="194" className="text-[10px] font-bold fill-slate-400 text-right">0</text>

                  {/* Highlight box */}
                  {hoveredIdx !== null && !loading && stats?.chartData && (
                    <rect x={activeCx - 25} y="20" width="50" height="180" fill="#f1f5f9" opacity="0.4" className="dark:fill-zinc-800" rx="8" />
                  )}

                  {/* Line paths (bezier mapped to live query) */}
                  {!loading && stats?.chartData && (
                    <>
                      {/* Sales Line */}
                      {visibleMetrics.sales && (
                        <path 
                          d={getPathD(salesPoints)} 
                          fill="none" 
                          stroke="#047857" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                        />
                      )}
                      {/* Purchase Line */}
                      {visibleMetrics.purchase && (
                        <path 
                          d={getPathD(purchasePoints)} 
                          fill="none" 
                          stroke="#2563eb" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                        />
                      )}
                      {/* Expenses Line */}
                      {visibleMetrics.expense && (
                        <path 
                          d={getPathD(expensePoints)} 
                          fill="none" 
                          stroke="#d97706" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                        />
                      )}
                      {/* Due Line */}
                      {visibleMetrics.due && (
                        <path 
                          d={getPathD(duePoints)} 
                          fill="none" 
                          stroke="#e11d48" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                        />
                      )}
                      {/* Active highlight dots */}
                      {hoveredIdx !== null && (
                        <>
                          {visibleMetrics.sales && (
                            <circle 
                              cx={activeCx} 
                              cy={190 - (maxChartVal > 0 ? (salesPoints[activeIdx] / maxChartVal) * 160 : 0)} 
                              r="4" 
                              fill="#047857" 
                              stroke="#ffffff" 
                              strokeWidth="1.5" 
                            />
                          )}
                          {/* Purchase Dot */}
                          {visibleMetrics.purchase && (
                            <circle 
                              cx={activeCx} 
                              cy={190 - (maxChartVal > 0 ? (purchasePoints[activeIdx] / maxChartVal) * 160 : 0)} 
                              r="4" 
                              fill="#2563eb" 
                              stroke="#ffffff" 
                              strokeWidth="1.5" 
                            />
                          )}
                          {/* Expense Dot */}
                          {visibleMetrics.expense && (
                            <circle 
                              cx={activeCx} 
                              cy={190 - (maxChartVal > 0 ? (expensePoints[activeIdx] / maxChartVal) * 160 : 0)} 
                              r="4" 
                              fill="#d97706" 
                              stroke="#ffffff" 
                              strokeWidth="1.5" 
                            />
                          )}
                          {/* Due Dot */}
                          {visibleMetrics.due && (
                            <circle 
                              cx={activeCx} 
                              cy={190 - (maxChartVal > 0 ? (duePoints[activeIdx] / maxChartVal) * 160 : 0)} 
                              r="4" 
                              fill="#e11d48" 
                              stroke="#ffffff" 
                              strokeWidth="1.5" 
                            />
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* X Axis Labels */}
                  {stats?.chartData?.map((item: any, idx: number) => (
                    <text 
                      key={idx}
                      x={chartN > 1 ? 80 + idx * (660 / (chartN - 1)) : 80} 
                      y="215" 
                      textAnchor="middle" 
                      className={`text-[10px] font-semibold ${idx === hoveredIdx ? "fill-slate-800 dark:fill-zinc-200 font-bold" : "fill-slate-400"}`}
                    >
                      {item.label}
                    </text>
                  ))}
                </svg>

                {/* Floating Tooltip displaying dynamic active point value */}
                {!loading && stats?.chartData && hoveredIdx !== null && (visibleMetrics.sales || visibleMetrics.purchase || visibleMetrics.expense || visibleMetrics.due) && (
                  <div 
                    className="absolute top-[25px] transform -translate-x-1/2 bg-white dark:bg-zinc-800 text-[10px] font-bold text-slate-800 dark:text-zinc-100 shadow-lg p-2 rounded-lg border border-slate-100 dark:border-zinc-700 flex flex-col gap-1 z-10"
                    style={{ left: `${tooltipLeftPercent}%` }}
                  >
                    {visibleMetrics.sales && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                        <span>Sales: ৳ {salesPoints[activeIdx]?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    {visibleMetrics.purchase && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span>Purchase: ৳ {purchasePoints[activeIdx]?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    {visibleMetrics.expense && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                        <span>Expenses: ৳ {expensePoints[activeIdx]?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    {visibleMetrics.due && (
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                        <span>Due: ৳ {duePoints[activeIdx]?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                    <div className="w-1.5 h-1.5 bg-white dark:bg-zinc-800 rotate-45 border-r border-b border-slate-100 dark:border-zinc-700 mx-auto -mb-2.5 mt-0.5"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales Card */}
          <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50">Recent Sales</h3>
                <Link href="/dashboard/sales">
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg">
                    View All
                  </Button>
                </Link>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-zinc-400">
                  <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                    <tr>
                      <th scope="col" className="pb-3 font-semibold">Product</th>
                      <th scope="col" className="pb-3 font-semibold">Customer</th>
                      <th scope="col" className="pb-3 font-semibold">Sale ID</th>
                      <th scope="col" className="pb-3 font-semibold">Date</th>
                      <th scope="col" className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-slate-400">Loading sales...</td>
                      </tr>
                    ) : stats?.recentOrders?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-slate-400">No sales found for this period.</td>
                      </tr>
                    ) : (
                      stats?.recentOrders?.map((order: any) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
                          <td className="py-3.5 flex items-center gap-3">
                            {order.productImage ? (
                              <img 
                                src={order.productImage} 
                                alt={order.product} 
                                className="h-8 w-8 rounded-lg object-cover border border-slate-100 dark:border-zinc-800"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center font-bold text-xs text-orange-600">
                                📦
                              </div>
                            )}
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{order.product}</span>
                          </td>
                          <td className="py-3.5 font-bold text-blue-600 dark:text-blue-400">{order.customer}</td>
                          <td className="py-3.5 text-slate-400">{order.orderId}</td>
                          <td className="py-3.5 text-slate-500">{order.date}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === "Pending" 
                                ? "bg-[#FEF9C3] text-[#A16207]" 
                                : order.status === "Shipped" 
                                  ? "bg-[#DCFCE7] text-[#15803D]" 
                                  : "bg-[#FEE2E2] text-[#B91C1C]"
                            }`}>
                              ● {order.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column Container */}
        <div className="space-y-6">
          
          {/* Most Selling Products Card */}
          <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50">Most Selling Products</h3>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              {/* Product List */}
              <div className="space-y-4">
                {loading ? (
                  <p className="text-xs text-slate-400">Loading products...</p>
                ) : stats?.mostSellingProducts?.length === 0 ? (
                  <p className="text-xs text-slate-400">No items sold.</p>
                ) : (
                  stats?.mostSellingProducts?.map((product: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/30">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="h-12 w-12 rounded-xl object-cover border border-slate-100 dark:border-zinc-800"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-blue-100/50 dark:bg-blue-950/20 flex items-center justify-center text-lg">
                            {idx === 0 ? "👟" : idx === 1 ? "🎒" : "🍶"}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-slate-950 dark:text-zinc-100">{product.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Code: {product.id}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-lg text-slate-600 dark:text-zinc-300">
                        {product.sales} Sales
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Top Customers Card */}
          <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-zinc-900/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50">Weekly Top Customers</h3>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              {/* Customer List */}
              <div className="space-y-4">
                {loading ? (
                  <p className="text-xs text-slate-400">Loading customers...</p>
                ) : stats?.topCustomers?.length === 0 ? (
                  <p className="text-xs text-slate-400">No customer sales.</p>
                ) : (
                  stats?.topCustomers?.map((cust: any, idx: number) => (
                    <Link 
                      key={idx} 
                      href={`/dashboard/clients/details?id=${cust.id}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {cust.image ? (
                          <img 
                            src={cust.image} 
                            alt={cust.name} 
                            className="h-10 w-10 rounded-full object-cover border border-slate-100 dark:border-zinc-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-600 dark:text-zinc-300">
                            {cust.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-slate-950 dark:text-zinc-100">{cust.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{cust.orders} Sales</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center text-[10px] font-bold h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg border border-slate-100 dark:border-zinc-800 transition-colors">
                        View
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
