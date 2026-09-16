"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FaSearch,
  FaPlus,
  FaMinus,
  FaTrashAlt,
  FaShoppingCart,
  FaTimes,
  FaShoppingBag,
  FaIndustry,
} from "react-icons/fa";
import POSBottomToolbar from "./POSBottomToolbar";

const isDiscreteUnit = (unit?: string | null): boolean => {
  if (!unit) return false;
  const norm = unit.trim().toLowerCase();
  const discreteUnits = [
    "pcs", "pc", "pcs.", "pc.", "piece", "pieces",
    "box", "boxes", "ctn", "carton", "cartons",
    "pack", "packs", "packet", "packets", "pkt",
    "bag", "bags", "set", "sets", "doz", "dozen",
    "pair", "pairs", "roll", "rolls", "can", "cans", "bottle", "bottles"
  ];
  return discreteUnits.includes(norm);
};

export interface POSScreenStandardProps {
  // Config & Catalog Props
  items: any[];
  filteredItems: any[];
  categories: string[];
  filterType: string;
  setFilterType: (cat: string) => void;
  warehouses: any[];
  selectedWarehouseId: string;
  setSelectedWarehouseId: (id: string) => void;
  currentUser: any;
  orderType: "RETAIL" | "WHOLESALE";
  isWholesaleAllowed: boolean;
  updateOrderMode: (mode: "RETAIL" | "WHOLESALE") => void;

  // Search Props
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onExitPOS: () => void;

  // Customer Props
  clients: any[];
  clientOptions: any[];
  selectedClientId: string;
  changeCustomerAndSyncMode: (id: string) => void;
  onOpenAddCustomer: () => void;

  // Cart & Pricing Props
  cart: any[];
  getItemDiscount: (item: any, variantId?: string) => any;
  handleAddToCart: (item: any) => void;
  handleUpdateQuantity: (cartKey: string, delta: number) => void;
  handleCustomQuantitySet: (cartKey: string, quantity: number) => void;
  handleRemoveItem: (cartKey: string) => void;

  // Totals
  itemCount: number;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  taxPercent: number;
  grandTotal: number;
  appliedPromo: string | null;
  promoDiscountMsg: string;

  // Transaction Handler
  onProcessTransaction: () => void;

  // Toolbar Props
  isExchangeMode: boolean;
  heldCartsCount: number;
  hasLastSale: boolean;
  completedSaleNumber: string;
  onReturnClick: () => void;
  onExchangeClick: () => void;
  onCollectDueClick: () => void;
  onHoldClick: () => void;
  onRefreshClick: () => void;
  onLastBillClick: () => void;
  posSettings?: any;
}

export default function POSScreenStandard({
  filteredItems,
  categories,
  filterType,
  setFilterType,
  warehouses,
  selectedWarehouseId,
  setSelectedWarehouseId,
  currentUser,
  orderType,
  isWholesaleAllowed,
  updateOrderMode,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  onExitPOS,
  clients,
  clientOptions,
  selectedClientId,
  changeCustomerAndSyncMode,
  onOpenAddCustomer,
  cart,
  getItemDiscount,
  handleAddToCart,
  handleUpdateQuantity,
  handleCustomQuantitySet,
  handleRemoveItem,
  subTotal,
  grandTotal,
  onProcessTransaction,
  isExchangeMode,
  heldCartsCount,
  hasLastSale,
  completedSaleNumber,
  onReturnClick,
  onExchangeClick,
  onCollectDueClick,
  onHoldClick,
  onRefreshClick,
  onLastBillClick,
  posSettings,
}: POSScreenStandardProps) {
  const allowItemDiscount = posSettings?.allowItemDiscount ?? true;
  const allowDueSale = posSettings?.allowDueSale ?? true;

  // Keep last added item at top of cart list
  const sortedCart = React.useMemo(() => {
    return cart;
  }, [cart]);

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      <div className="flex-1 flex flex-col p-6 overflow-hidden bg-background relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Product Catalog
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  orderType === "RETAIL"
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-orange-500/10 text-orange-600"
                }`}
              >
                {orderType === "RETAIL" ? (
                  <span className="flex items-center gap-1">
                    <FaShoppingBag /> Retail
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <FaIndustry /> Wholesale
                  </span>
                )}
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <Select
                value={selectedWarehouseId}
                onValueChange={setSelectedWarehouseId}
                disabled={currentUser?.role?.toLowerCase() !== "admin"}
              >
                <SelectTrigger className="w-[180px] bg-muted border-none text-foreground font-medium h-10 shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search products... (Esc)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-none text-foreground h-10"
              />
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors h-10"
              onClick={onExitPOS}
            >
              <FaTimes className="w-4 h-4 mr-2" /> Exit POS
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-border pb-4 overflow-x-auto whitespace-nowrap no-scrollbar">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filterType === "ALL"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setFilterType("ALL")}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filterType === cat
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setFilterType(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const displayPrice =
                orderType === "WHOLESALE"
                  ? item.wholesalePrice || item.unitPrice
                  : item.unitPrice;
              const discount = allowItemDiscount ? getItemDiscount(item) : null;
              let finalPrice = displayPrice;
              if (discount) {
                if (discount.discountType === "PERCENTAGE") {
                  finalPrice =
                    displayPrice * Math.max(0, 1 - discount.discountValue / 100);
                } else if (discount.discountType === "FLAT") {
                  finalPrice = Math.max(0, displayPrice - discount.discountValue);
                }
              }
              const hasDiscount = finalPrice !== displayPrice;
              const itemStock =
                item.variants && item.variants.length > 0
                  ? item.variants.reduce(
                      (acc: number, v: any) =>
                        acc +
                        (v.stocks?.find(
                          (s: any) => s.warehouseId === selectedWarehouseId
                        )?.quantity || 0),
                      0
                    )
                  : item.stocks?.find(
                      (s: any) => s.warehouseId === selectedWarehouseId
                    )?.quantity || 0;

              return (
                <div
                  key={item.id}
                  className="bg-card text-card-foreground rounded-xl border border-border p-4 hover:shadow-md transition-shadow flex flex-col justify-between h-full"
                >
                  <div>
                    <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground overflow-hidden relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.description}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-xs">{item.code}</span>
                      )}
                    </div>
                    <div className="mb-2">
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {item.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      <span className="text-sm font-bold text-primary">
                        ৳{finalPrice.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <>
                          <span className="text-xs text-muted-foreground line-through font-normal">
                            ৳{displayPrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-semibold text-green-600 bg-green-500/10 px-1 py-0.2 rounded font-normal">
                            {discount.discountType === "PERCENTAGE"
                              ? `${discount.discountValue}% Off`
                              : `৳${discount.discountValue} Off`}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Stock: {itemStock}
                      </span>
                    </div>
                  </div>
                  {item.variants && item.variants.length > 0 ? (
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs"
                      onClick={() => handleAddToCart(item)}
                    >
                      <FaPlus className="w-3.5 h-3.5 mr-1" /> Add SKU
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                      onClick={() => handleAddToCart(item)}
                    >
                      <FaPlus className="w-4 h-4 mr-2" /> Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Action Buttons - Bottom Left */}
        <POSBottomToolbar
          className="absolute bottom-0 left-0 p-4 z-20"
          onReturnClick={onReturnClick}
          isExchangeMode={isExchangeMode}
          onExchangeClick={onExchangeClick}
          onCollectDueClick={onCollectDueClick}
          cartLength={cart.length}
          heldCartsCount={heldCartsCount}
          onHoldClick={onHoldClick}
          onRefreshClick={onRefreshClick}
          isLastBillDisabled={!hasLastSale && !completedSaleNumber}
          onLastBillClick={onLastBillClick}
          allowDueSale={allowDueSale}
        />
      </div>

      <div className="w-[450px] flex flex-col bg-card text-card-foreground border-l border-border shadow-md z-10 relative">
        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-xl font-bold text-foreground shrink-0">Order Details</h2>
            {isWholesaleAllowed && (
              <div className="flex bg-muted p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    if (orderType !== "RETAIL") updateOrderMode("RETAIL");
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    orderType === "RETAIL"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Retail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (orderType !== "WHOLESALE") updateOrderMode("WHOLESALE");
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    orderType === "WHOLESALE"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Wholesale
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Customer <span className="text-destructive">*</span>
                {selectedClientId &&
                  clients.find((c) => c.id === selectedClientId)?.clientType ===
                    "wholesale" && (
                    <span className="ml-1 px-1 py-0.5 text-[9px] bg-amber-500/15 text-amber-600 rounded font-bold font-sans">
                      WS
                    </span>
                  )}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    options={clientOptions}
                    value={selectedClientId || null}
                    onValueChange={(val) => changeCustomerAndSyncMode(val || "")}
                    placeholder="Select Customer..."
                    searchPlaceholder="Search customer..."
                    className="w-full h-9 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenAddCustomer}
                  className="h-9 px-2 text-xs flex gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                >
                  <FaPlus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto -mx-4 px-4 border-y border-border">
            <div className="py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                  <FaShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                sortedCart.map((item) => {
                  const itemUnit = (typeof item.unit === "object" ? item.unit?.symbol : item.unit) || item.unitSymbol;
                  const isIntegerOnlyUnit = isDiscreteUnit(itemUnit);

                  return (
                  <div key={item.cartKey} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted rounded-md shrink-0 flex items-center justify-center relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.description}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground px-1 text-center truncate">
                          {item.code}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {item.isReturnItem && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/10 text-rose-600 border border-rose-500/30 rounded uppercase shrink-0">
                            Return
                          </span>
                        )}
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      {item.variantSku && (
                        <div className="flex gap-1 mt-0.5">
                          <span className="text-[9px] px-1.5 py-0.2 bg-muted border border-border text-foreground rounded font-medium">
                            {item.color}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-muted border border-border text-foreground rounded font-medium">
                            {item.size}
                          </span>
                        </div>
                      )}
                      <p
                        className={`text-sm font-bold ${
                          item.isReturnItem
                            ? "text-rose-600"
                            : "text-foreground"
                        }`}
                      >
                        {item.isReturnItem ? "-" : ""}৳
                        {item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-muted rounded-full border border-border px-1 py-1 w-[124px] shrink-0">
                      <button
                        type="button"
                        className="w-6 h-6 flex items-center justify-center bg-background rounded-full border border-border shadow-sm text-muted-foreground hover:text-foreground"
                        onClick={() => handleUpdateQuantity(item.cartKey, -1)}
                      >
                        <FaMinus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step={isIntegerOnlyUnit ? "1" : "any"}
                        min="0"
                        value={item.cartQuantity === 0 ? "" : item.cartQuantity}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          if (rawVal === "") {
                            handleCustomQuantitySet(item.cartKey, 0);
                            return;
                          }
                          let val = parseFloat(rawVal);
                          if (isNaN(val)) val = 0;
                          if (isIntegerOnlyUnit && val % 1 !== 0) {
                            val = Math.round(val);
                          }
                          handleCustomQuantitySet(item.cartKey, val);
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val < 0) {
                            handleCustomQuantitySet(item.cartKey, 0);
                          }
                        }}
                        className="text-sm font-semibold w-14 text-center text-foreground bg-background border border-border/80 rounded-md outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5 px-0.5 m-0"
                      />
                      <button
                        type="button"
                        className="w-6 h-6 flex items-center justify-center bg-background rounded-full border border-border shadow-sm text-muted-foreground hover:text-foreground"
                        onClick={() => handleUpdateQuantity(item.cartKey, 1)}
                      >
                        <FaPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                      onClick={() => handleRemoveItem(item.cartKey)}
                    >
                      <FaTrashAlt className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
              )}
            </div>
          </div>

          <div className="pt-3">
            <h3 className="text-sm font-bold text-foreground mb-2">
              Order Summary
            </h3>
            {isExchangeMode ? (
              (() => {
                const retSub = cart
                  .filter((i) => i.isReturnItem)
                  .reduce(
                    (acc, item) => acc + item.unitPrice * item.cartQuantity,
                    0
                  );
                const newSub = cart
                  .filter((i) => !i.isReturnItem)
                  .reduce(
                    (acc, item) => acc + item.unitPrice * item.cartQuantity,
                    0
                  );
                const netBal = newSub - retSub;
                return (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-rose-600">
                      <span>Returned Subtotal:</span>
                      <span>-৳{retSub.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-emerald-600">
                      <span>New Purchase Subtotal:</span>
                      <span>+৳{newSub.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed border-amber-500/40 pt-2 flex justify-between items-center">
                      <span className="font-bold text-xs text-amber-700 uppercase">
                        {netBal > 0
                          ? "Net Payable:"
                          : netBal < 0
                          ? "Net Refund:"
                          : "Even Exchange:"}
                      </span>
                      <span className="text-base font-black text-amber-700">
                        ৳{Math.abs(netBal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-muted rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Item ({cart.length})
                  </span>
                  <span className="font-medium text-foreground">
                    ৳{subTotal.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-border border-dashed pt-2 flex justify-between items-center">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-lg font-black text-foreground">
                    ৳{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <Button
              className={`w-full mt-3 h-12 text-base font-bold rounded-xl text-primary-foreground ${
                isExchangeMode
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-primary hover:bg-primary/90"
              }`}
              size="lg"
              onClick={onProcessTransaction}
              disabled={cart.length === 0}
            >
              {isExchangeMode ? "Process Exchange" : "Process Transaction"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
