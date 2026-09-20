"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
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
  FaTimes,
  FaPrint,
  FaChevronDown,
  FaSignOutAlt,
  FaTag,
  FaExclamationTriangle,
} from "react-icons/fa";
import { FiAward } from "react-icons/fi";
import POSBottomToolbar from "./POSBottomToolbar";
import POSSecurityModal from "./POSSecurityModal";

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

export interface POSScreenModernProps {
  // Config & Catalog Props
  items: any[];
  filteredItems: any[];
  tryWeighingScaleScan?: (rawCode: string) => boolean;
  warehouses: any[];
  selectedWarehouseId: string;
  setSelectedWarehouseId: (id: string) => void;
  currentUser: any;
  orderType: "RETAIL" | "WHOLESALE";
  isWholesaleAllowed: boolean;
  updateOrderMode: (mode: "RETAIL" | "WHOLESALE") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onExitPOS: () => void;
  clients: any[];
  clientOptions: any[];
  selectedClientId: string;
  changeCustomerAndSyncMode: (clientId: string) => void;
  onOpenAddCustomer: () => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  appliedPromo: any;
  handleApplyPromo: () => void;
  handleRemovePromo: () => void;
  cart: any[];
  getItemDiscount: (item: any) => number;
  getItemLineUnitPrice: (item: any) => number;
  handleAddToCart: (item: any) => void;
  handleUpdateQuantity: (item: any, qty: number) => void;
  handleCustomQuantitySet: (item: any, qty: number) => void;
  handleRemoveItem: (item: any) => void;
  isNegativeSaleAllowed: boolean;
  paymentAccounts: any[];
  itemCount: number;
  subTotal: number;
  discountAmount: number;
  setDiscountAmount: (amt: number) => void;
  taxAmount: number;
  taxPercent: number;
  grandTotal: number;
  previousCustomerDue?: number;
  onConfirmDirectPayment: (overrides?: {
    cashAmount?: number;
    cardAmount?: number;
    mfsAmount?: number;
    cashAccountId?: string;
    cardAccountId?: string;
    mfsAccountId?: string;
    isDueBill?: boolean;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
    permittedById?: string;
  }) => void;

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
  membershipSettings?: any;
}

export default function POSScreenModern({
  items,
  filteredItems,
  tryWeighingScaleScan,
  warehouses,
  selectedWarehouseId,
  setSelectedWarehouseId,
  currentUser,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  onExitPOS,
  clients,
  clientOptions,
  selectedClientId,
  changeCustomerAndSyncMode,
  onOpenAddCustomer,
  promoCode,
  setPromoCode,
  appliedPromo,
  handleApplyPromo,
  handleRemovePromo,
  cart,
  getItemDiscount,
  getItemLineUnitPrice,
  handleAddToCart,
  handleUpdateQuantity,
  handleCustomQuantitySet,
  handleRemoveItem,
  paymentAccounts,
  itemCount,
  subTotal,
  discountAmount,
  setDiscountAmount,
  grandTotal,
  previousCustomerDue = 0,
  onConfirmDirectPayment,
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
  membershipSettings,
}: POSScreenModernProps) {
  const allowDiscount = posSettings?.allowDiscount ?? true;
  const allowCoupon = posSettings?.allowCoupon ?? true;
  const allowDueSale = posSettings?.allowDueSale ?? true;
  const allowItemDiscount = posSettings?.allowItemDiscount ?? true;
  const allowCustomerPoints = posSettings?.allowCustomerPoints ?? true;

  const pointsSpentRatio = Number(membershipSettings?.pointsSpentRatio) || 100;
  const pointValue = Number(membershipSettings?.pointValue) || 1.0;

  // Inline Payment States for SS2 Direct Billing Sidebar
  const [isDueBill, setIsDueBill] = useState<boolean>(false);
  const [securityAction, setSecurityAction] = useState<"DUE_SALE" | "DISCOUNT" | "COUPON" | "POINTS" | "EXCHANGE" | "RETURN" | "COLLECT_DUE" | "REFRESH" | "LAST_BILL" | "REMOVE_ITEM" | null>(null);
  const [pendingRemoveCartKey, setPendingRemoveCartKey] = useState<string | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [permittedById, setPermittedById] = useState<string | null>(null);
  const [permittedUserName, setPermittedUserName] = useState<string>("");
  const [cashAmount, setCashAmount] = useState<number | "">(0);
  const [cardAmount, setCardAmount] = useState<number | "">(0);
  const [mfsAmount, setMfsAmount] = useState<number | "">(0);
  const [enableDiscountInput, setEnableDiscountInput] = useState(false);
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [customDiscount, setCustomDiscount] = useState<number | "">(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number | "">(0);
  const [enablePointsRedeem, setEnablePointsRedeem] = useState(false);

  const updateDiscountAmount = React.useCallback(
    (
      val: number | "",
      type: "FLAT" | "PERCENT",
      enabled: boolean,
      currentSubTotal: number
    ) => {
      if (!enabled || val === "" || Number(val) <= 0) {
        setDiscountAmount(0);
        return;
      }
      const num = Number(val);
      if (type === "PERCENT") {
        const calculated = Math.min(currentSubTotal, (currentSubTotal * num) / 100);
        setDiscountAmount(calculated);
      } else {
        const calculated = Math.min(currentSubTotal, num);
        setDiscountAmount(calculated);
      }
    },
    [setDiscountAmount]
  );

  const sortedCart = React.useMemo(() => {
    return cart;
  }, [cart]);

  // Selected Cash, Bank & MFS accounts
  const cashAccounts = paymentAccounts.filter(
    (a) => a.type === "CASH"
  );
  const bankAccounts = paymentAccounts.filter(
    (a) => a.type === "BANK" || a.type === "CARD"
  );
  const mfsAccounts = paymentAccounts.filter((a) => a.type === "WALLET");

  const [selectedCashAccount, setSelectedCashAccount] = useState<string>(
    cashAccounts[0]?.id || ""
  );
  const [selectedCardAccount, setSelectedCardAccount] = useState<string>(
    bankAccounts[0]?.id || ""
  );
  const [selectedMfsAccount, setSelectedMfsAccount] = useState<string>(
    mfsAccounts[0]?.id || ""
  );

  // Auto-update cash amount when cart/totals or split payment methods change
  React.useEffect(() => {
    if (cart.length === 0) {
      setCashAmount(0);
      setCardAmount(0);
      setMfsAmount(0);
      setEnableDiscountInput(false);
      setDiscountType("FLAT");
      setCustomDiscount(0);
      setDiscountAmount(0);
    } else if (!isDueBill) {
      const otherPayments = (Number(cardAmount) || 0) + (Number(mfsAmount) || 0);
      const remainingNeeded = Math.max(0, Math.round(grandTotal) - otherPayments);
      setCashAmount(remainingNeeded);
    }
  }, [cart.length, grandTotal, cardAmount, mfsAmount, isDueBill, setDiscountAmount]);

  const roundedGrandTotal = Math.round(grandTotal);

  const selectedClientObj = clients.find((c) => c.id === selectedClientId);
  const clientPoints = Number((selectedClientObj as any)?.membershipPoints) || 0;

  const effectivePointsToRedeem = enablePointsRedeem ? (Number(pointsToRedeem) || 0) : 0;

  // Maximum points client can redeem against rounded grand total
  const maxRedeemablePoints = Math.min(
    clientPoints,
    Math.floor((roundedGrandTotal + effectivePointsToRedeem * pointValue) / (pointValue || 1))
  );

  const pointsDiscountAmount = effectivePointsToRedeem * pointValue;
  const netGrandTotal = Math.max(0, roundedGrandTotal - pointsDiscountAmount);
  const pointsEarnedThisSale = (selectedClientObj as any)?.membershipStatus === "ACTIVE" 
    ? Math.floor(netGrandTotal / pointsSpentRatio) 
    : 0;

  // Reset points input if cart is emptied or customer changed
  React.useEffect(() => {
    if (cart.length === 0 || !selectedClientId) {
      setPointsToRedeem(0);
      setEnablePointsRedeem(false);
    }
  }, [cart.length, selectedClientId]);

  const totalPaid =
    (Number(cashAmount) || 0) +
    (Number(cardAmount) || 0) +
    (Number(mfsAmount) || 0);

  const changeAmount = Math.max(0, totalPaid - roundedGrandTotal);

  const isWalkwayCustomer =
    !selectedClientId ||
    !selectedClientObj ||
    selectedClientObj.name?.toLowerCase().includes("walkway") ||
    selectedClientObj.name?.toLowerCase().includes("walk-in") ||
    selectedClientObj.clientType === "walkway";

  React.useEffect(() => {
    if (isWalkwayCustomer && isDueBill) {
      setIsDueBill(false);
    }
  }, [isWalkwayCustomer, isDueBill]);

  // Check Discount Limit Rules
  const discountLimitError = React.useMemo(() => {
    if (!posSettings?.enableDiscountLimits || !enableDiscountInput || !discountAmount || discountAmount <= 0) {
      return null;
    }

    const isBelowCostRule = posSettings?.discountRuleMode === "below_cost" || posSettings?.preventBelowCostPrice;
    const isMaxPercentRule = posSettings?.discountRuleMode === "max_percent" || posSettings?.enableMaxDiscountPercent;

    if (isBelowCostRule) {
      const totalCost = cart.reduce((acc: number, item: any) => {
        const itemCost = Number(item.costPrice || item.purchasePrice || item.variant?.costPrice || item.variant?.purchasePrice || 0);
        return acc + (itemCost * (item.cartQuantity || 1));
      }, 0);

      const netSalePrice = subTotal - discountAmount;
      if (totalCost > 0 && netSalePrice < totalCost) {
        return `Discount drops total sale price (৳${netSalePrice.toFixed(2)}) below stock cost value (৳${totalCost.toFixed(2)})`;
      }
    }

    if (isMaxPercentRule) {
      const maxAllowedPercent = Number(posSettings?.maxDiscountPercentage || 0);
      let calculatedPercent = 0;

      if (discountType === "PERCENT") {
        calculatedPercent = Number(customDiscount || 0);
      } else {
        calculatedPercent = subTotal > 0 ? (discountAmount / subTotal) * 100 : 0;
      }

      if (maxAllowedPercent > 0 && calculatedPercent > maxAllowedPercent) {
        return `Discount (${calculatedPercent.toFixed(1)}%) exceeds maximum allowed limit of ${maxAllowedPercent}%`;
      }
    }

    return null;
  }, [posSettings, enableDiscountInput, discountAmount, customDiscount, discountType, subTotal, cart]);

  const onAttemptApplyCoupon = () => {
    if (!promoCode.trim()) return;
    const isSecurePosCouponRequired = posSettings?.securePos && (posSettings?.securePosCoupon ?? true);
    if (isSecurePosCouponRequired && !permittedById) {
      setSecurityAction("COUPON");
      setIsSecurityModalOpen(true);
      return;
    }
    handleApplyPromo();
  };

  const onAttemptExchange = () => {
    const isSecurePosExchangeRequired = posSettings?.securePos && (posSettings?.securePosExchange ?? true);
    if (isSecurePosExchangeRequired && !permittedById) {
      setSecurityAction("EXCHANGE");
      setIsSecurityModalOpen(true);
      return;
    }
    onExchangeClick();
  };

  const onAttemptReturn = () => {
    const isSecurePosReturnRequired = posSettings?.securePos && (posSettings?.securePosReturn ?? true);
    if (isSecurePosReturnRequired && !permittedById) {
      setSecurityAction("RETURN");
      setIsSecurityModalOpen(true);
      return;
    }
    onReturnClick();
  };

  const onAttemptCollectDue = () => {
    const isSecurePosCollectDueRequired = posSettings?.securePos && (posSettings?.securePosCollectDue ?? true);
    if (isSecurePosCollectDueRequired && !permittedById) {
      setSecurityAction("COLLECT_DUE");
      setIsSecurityModalOpen(true);
      return;
    }
    onCollectDueClick();
  };

  const onAttemptRefresh = () => {
    const isSecurePosRefreshRequired = posSettings?.securePos && (posSettings?.securePosRefresh ?? true);
    if (isSecurePosRefreshRequired && !permittedById) {
      setSecurityAction("REFRESH");
      setIsSecurityModalOpen(true);
      return;
    }
    onRefreshClick();
  };

  const onAttemptLastBill = () => {
    if (!hasLastSale && !completedSaleNumber) return;
    const isSecurePosLastBillRequired = posSettings?.securePos && (posSettings?.securePosLastBill ?? true);
    if (isSecurePosLastBillRequired && !permittedById) {
      setSecurityAction("LAST_BILL");
      setIsSecurityModalOpen(true);
      return;
    }
    onLastBillClick();
  };

  const onAttemptRemoveItem = (cartKey: string) => {
    const isSecurePosRemoveItemRequired = posSettings?.securePos && (posSettings?.securePosRemoveItem ?? true);
    if (isSecurePosRemoveItemRequired && !permittedById) {
      setPendingRemoveCartKey(cartKey);
      setSecurityAction("REMOVE_ITEM");
      setIsSecurityModalOpen(true);
      return;
    }
    handleRemoveItem(cartKey);
  };

  const handlePrintBillClick = () => {
    if (discountLimitError) {
      toast.error(discountLimitError);
      return;
    }
    const payableTotal = Math.max(0, roundedGrandTotal - pointsDiscountAmount);
    if (!allowDueSale && totalPaid < payableTotal) {
      toast.error("Due Sale Disabled: Due / credit sales are disabled in POS settings. Total paid must equal or exceed total amount.");
      return;
    }
    onConfirmDirectPayment({
      cashAmount: Number(cashAmount) || 0,
      cardAmount: Number(cardAmount) || 0,
      mfsAmount: Number(mfsAmount) || 0,
      cashAccountId: selectedCashAccount,
      cardAccountId: selectedCardAccount,
      mfsAccountId: selectedMfsAccount,
      isDueBill: isDueBill,
      pointsRedeemed: effectivePointsToRedeem,
      pointsDiscountAmount: pointsDiscountAmount,
      permittedById: permittedById || undefined,
    });
  };

  // Keyboard Navigation & Search Selection State
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState<number>(0);
  const searchDropdownRef = React.useRef<HTMLDivElement>(null);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filteredItems.slice(0, 10);
  }, [filteredItems, searchQuery]);

  React.useEffect(() => {
    setHighlightedSearchIndex(0);
  }, [searchQuery]);

  React.useEffect(() => {
    if (searchDropdownRef.current && searchQuery.trim().length > 0) {
      const activeEl = searchDropdownRef.current.children[highlightedSearchIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedSearchIndex, searchQuery]);

  const qtyInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Global F1 key shortcut to focus search input in Modern POS
  React.useEffect(() => {
    const handleF1KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        e.stopPropagation();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener("keydown", handleF1KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF1KeyDown);
    };
  }, [searchInputRef]);

  // Global F2 key shortcut to cycle quantity input focus in Modern POS
  React.useEffect(() => {
    const handleF2KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();

        if (sortedCart.length === 0) return;

        const activeEl = document.activeElement;
        const activeIndex = qtyInputRefs.current.findIndex(
          (el) => el && el === activeEl
        );

        let nextIndex = 0;
        if (activeIndex !== -1) {
          nextIndex = (activeIndex + 1) % sortedCart.length;
        } else {
          nextIndex = 0;
        }

        const targetEl = qtyInputRefs.current[nextIndex];
        if (targetEl) {
          targetEl.focus();
          targetEl.select();
        }
      }
    };

    window.addEventListener("keydown", handleF2KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF2KeyDown);
    };
  }, [sortedCart.length]);

  // Global F3 key shortcut for Exchange Mode in Modern POS
  React.useEffect(() => {
    const handleF3KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        e.stopPropagation();
        onAttemptExchange();
      }
    };

    window.addEventListener("keydown", handleF3KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF3KeyDown);
    };
  }, [onAttemptExchange]);

  // Global F4 key shortcut for Return Modal in Modern POS
  React.useEffect(() => {
    const handleF4KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F4") {
        e.preventDefault();
        e.stopPropagation();
        onAttemptReturn();
      }
    };

    window.addEventListener("keydown", handleF4KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF4KeyDown);
    };
  }, [onAttemptReturn]);

  // Global F5 key shortcut for Collect Due Modal in Modern POS
  React.useEffect(() => {
    const handleF5KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        e.stopPropagation();
        if (allowDueSale) {
          onAttemptCollectDue();
        }
      }
    };

    window.addEventListener("keydown", handleF5KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF5KeyDown);
    };
  }, [onAttemptCollectDue, allowDueSale]);

  // Global F6 key shortcut for Hold / Recall Hold in Modern POS
  React.useEffect(() => {
    const handleF6KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F6") {
        e.preventDefault();
        e.stopPropagation();
        onHoldClick();
      }
    };

    window.addEventListener("keydown", handleF6KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF6KeyDown);
    };
  }, [onHoldClick]);

  // Global F7 key shortcut for Refresh in Modern POS
  React.useEffect(() => {
    const handleF7KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        onAttemptRefresh();
      }
    };

    window.addEventListener("keydown", handleF7KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF7KeyDown);
    };
  }, [onAttemptRefresh]);

  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);

  // Global F8 key shortcut for Last Bill in Modern POS
  React.useEffect(() => {
    const handleF8KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        onAttemptLastBill();
      }
    };

    window.addEventListener("keydown", handleF8KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF8KeyDown);
    };
  }, [onAttemptLastBill]);

  // Global F9 key shortcut to toggle Customer Select dropdown in Modern POS
  React.useEffect(() => {
    const handleF9KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        e.stopPropagation();
        setIsCustomerSelectOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleF9KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF9KeyDown);
    };
  }, []);

  // Global F10 key shortcut for Add Customer modal in Modern POS
  React.useEffect(() => {
    const handleF10KeyDown = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        e.stopPropagation();
        onOpenAddCustomer();
      }
    };

    window.addEventListener("keydown", handleF10KeyDown);
    return () => {
      window.removeEventListener("keydown", handleF10KeyDown);
    };
  }, [onOpenAddCustomer]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const q = searchQuery.trim();
      if (q.length >= 12 && tryWeighingScaleScan?.(q)) {
        setSearchQuery("");
        setHighlightedSearchIndex(0);
        return;
      }

      if (q.length > 0 && searchResults.length > 0) {
        const selectedItem = searchResults[highlightedSearchIndex];
        if (selectedItem) {
          if (selectedItem.isWeighingScale && q.length >= 12 && tryWeighingScaleScan?.(q)) {
            setSearchQuery("");
            setHighlightedSearchIndex(0);
            return;
          }
          handleAddToCart(selectedItem);
          setSearchQuery("");
          setHighlightedSearchIndex(0);
        }
      }
      return;
    }

    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedSearchIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedSearchIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === "Escape") {
      setSearchQuery("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden text-foreground">
      {/* Top Header Bar matching SS2 column alignment */}
      <div className="h-14 border-b border-border bg-card flex items-center shrink-0">
        {/* Left Header Column (aligned 100% with Left Table area flex-1) */}
        <div className="flex-1 px-4 flex items-center gap-3 border-r border-border h-full min-w-0">
          {/* Salesman / Biller Name Box */}
          <div className="w-1/4 min-w-0">
            <Input
              value={currentUser?.name || "Manishankar Vakta"}
              readOnly
              className="h-9 text-xs font-semibold bg-background border-border text-foreground cursor-default shadow-sm rounded-md"
            />
          </div>

          {/* Branch / Warehouse Selector */}
          <div className="w-1/4 min-w-0">
            <Select
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
              disabled={currentUser?.role?.toLowerCase() !== "admin"}
            >
              <SelectTrigger className="h-9 text-xs font-semibold bg-background border-border shadow-sm rounded-md">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-xs">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Selector & Add Customer */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <SearchableSelect
                options={clientOptions}
                value={selectedClientId || null}
                onValueChange={(val) => changeCustomerAndSyncMode(val || "")}
                placeholder="Walkway Customer (F9)"
                searchPlaceholder="Search customer... (F9)"
                open={isCustomerSelectOpen}
                onOpenChange={setIsCustomerSelectOpen}
                className="w-full h-9 text-xs bg-background shadow-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenAddCustomer}
              className="h-9 px-3 text-xs font-semibold border-border bg-background text-foreground hover:bg-accent shrink-0 shadow-sm rounded-md"
            >
              Add + (F10)
            </Button>
          </div>
        </div>

        {/* Right Header Column (aligned 100% with w-[380px] Right Sidebar) */}
        <div className="w-[380px] px-4 flex items-center justify-between shrink-0 h-full">
          {/* Brand Logo */}
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="Amar Dokan Brand Logo"
              className="h-9 object-contain max-w-[160px]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          {/* Exit POS Button */}
          <Button
            size="sm"
            className="h-9 px-3.5 bg-[#1f2937] text-white hover:bg-[#111827] font-semibold text-xs flex items-center gap-2 rounded-md shadow-sm"
            onClick={onExitPOS}
          >
            Exit <FaSignOutAlt className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Workspace (Left Table + Right Direct Billing Panel) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Section: Product Search & Interactive Cart Table */}
        <div className="flex-1 flex flex-col p-4 bg-muted/10 overflow-hidden relative">
          {/* Product Search Bar */}
          <div className="relative mb-4">
            <div className="relative flex items-center">
              <Input
                ref={searchInputRef}
                placeholder="Product Search (F1 to focus, ↑ ↓ navigate, Enter to select)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full h-10 pl-3 pr-10 text-sm bg-background border-border text-foreground placeholder:text-muted-foreground shadow-sm"
              />
              <FaChevronDown className="absolute right-3 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
            </div>

            {/* Dropdown Results list if typing */}
            {searchQuery.trim().length > 0 && (
              <div
                ref={searchDropdownRef}
                className="absolute top-full left-0 right-0 z-30 mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-xl max-h-60 overflow-y-auto"
              >
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No matching products found
                  </div>
                ) : (
                  searchResults.map((item, index) => {
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

                    const isHighlighted = index === highlightedSearchIndex;

                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHighlightedSearchIndex(index)}
                        onClick={() => {
                          const q = searchQuery.trim();
                          if (q.length >= 12 && tryWeighingScaleScan?.(q)) {
                            setSearchQuery("");
                            setHighlightedSearchIndex(0);
                            return;
                          }
                          handleAddToCart(item);
                          setSearchQuery("");
                          setHighlightedSearchIndex(0);
                        }}
                        className={`p-2.5 cursor-pointer flex items-center justify-between border-b border-border/50 text-xs transition-colors ${
                          isHighlighted
                            ? "bg-accent text-accent-foreground font-semibold border-l-4 border-l-primary pl-2"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-foreground truncate">
                            {item.name}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px] shrink-0">
                            ({item.code})
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              itemStock > 0
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-rose-500/15 text-rose-600"
                            }`}
                          >
                            Stock: {itemStock}
                          </span>
                        </div>
                        <span className="font-bold text-primary shrink-0 ml-2">
                          ৳{getItemLineUnitPrice(item).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Cart Data Table */}
          <div className="flex-1 border border-border rounded-md bg-background overflow-y-auto shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/60 text-muted-foreground uppercase font-bold sticky top-0 border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center w-36">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Sub-Total</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center text-sm font-semibold text-muted-foreground bg-muted/20"
                    >
                      No Item in Cart
                    </td>
                  </tr>
                ) : (
                  sortedCart.map((item, index) => {
                    const itemQty = item.cartQuantity || item.quantity || 1;
                    const itemUnit = item.unit || item.unitName || item.unitType || item.unit_name || item.uom;
                    const isIntegerOnlyUnit = isDiscreteUnit(itemUnit);
                    const isFractionalQtyError = isIntegerOnlyUnit && itemQty != null && itemQty % 1 !== 0;

                    const lineUnitPrice = item.unitPrice || getItemLineUnitPrice(item) || 0;
                    const lineTotal = lineUnitPrice * itemQty;
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
                      <tr
                        key={item.cartKey || item.id}
                        className={`border-b border-border/60 hover:bg-muted/40 transition-colors ${
                          item.isReturnItem ? "bg-rose-500/10" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-medium text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground">
                            {item.description || item.name}
                            {item.isReturnItem && (
                              <span className="ml-1.5 text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                                Return
                              </span>
                            )}
                          </div>
                          {(item.selectedVariantName || item.variantSku) && (
                            <div className="text-[11px] text-primary font-medium">
                              Variant: {item.selectedVariantName || `${item.color || ""} ${item.size || ""}`}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {item.code}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">
                          {itemStock}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          ৳{lineUnitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className={`inline-flex items-center border rounded bg-background overflow-hidden p-0.5 transition-colors ${
                            isFractionalQtyError ? "border-destructive ring-1 ring-destructive" : "border-border"
                          }`}>
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded shrink-0"
                              onClick={() => {
                                if (isIntegerOnlyUnit && itemQty % 1 !== 0) {
                                  const rounded = Math.max(1, Math.round(itemQty));
                                  handleCustomQuantitySet(item.cartKey, rounded);
                                } else {
                                  handleUpdateQuantity(item.cartKey, -1);
                                }
                              }}
                            >
                              <FaMinus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              ref={(el) => {
                                qtyInputRefs.current[index] = el;
                              }}
                              type="number"
                              step={isIntegerOnlyUnit ? "1" : "any"}
                              min={isIntegerOnlyUnit ? "1" : "0.0001"}
                              title={isIntegerOnlyUnit ? `Quantity for ${itemUnit || "Pcs"} must be an integer (decimals blocked)` : "Quantity"}
                              value={itemQty === 0 ? "" : itemQty}
                              onChange={(e) => {
                                if (isIntegerOnlyUnit) {
                                  const sanitized = e.target.value.replace(/[^0-9]/g, "");
                                  const val = parseInt(sanitized, 10);
                                  handleCustomQuantitySet(item.cartKey, isNaN(val) ? 0 : val);
                                } else {
                                  const val = parseFloat(e.target.value);
                                  handleCustomQuantitySet(item.cartKey, isNaN(val) ? 0 : val);
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val < 0) {
                                  handleCustomQuantitySet(item.cartKey, 0);
                                } else if (isIntegerOnlyUnit) {
                                  handleCustomQuantitySet(item.cartKey, Math.max(0, Math.floor(val)));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (isIntegerOnlyUnit && (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "-" || e.key === "+")) {
                                  e.preventDefault();
                                  return;
                                }
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (searchInputRef.current) {
                                    searchInputRef.current.focus();
                                    searchInputRef.current.select();
                                  }
                                }
                              }}
                              className={`w-16 text-center text-xs font-bold bg-transparent outline-none py-0.5 focus:bg-accent/60 focus:ring-1 focus:ring-primary rounded ${
                                isFractionalQtyError ? "text-destructive font-semibold" : ""
                              }`}
                            />
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded shrink-0"
                              onClick={() => {
                                if (isIntegerOnlyUnit && itemQty % 1 !== 0) {
                                  const rounded = Math.max(1, Math.round(itemQty));
                                  handleCustomQuantitySet(item.cartKey, rounded);
                                } else {
                                  handleUpdateQuantity(item.cartKey, 1);
                                }
                              }}
                            >
                              <FaPlus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            item.isReturnItem ? "text-rose-600" : "text-foreground"
                          }`}
                        >
                          {item.isReturnItem ? "-" : ""}৳{lineTotal.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                            onClick={() => onAttemptRemoveItem(item.cartKey)}
                          >
                            <FaTimes className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Shared Bottom Toolbar */}
          <POSBottomToolbar
            className="absolute bottom-4 left-4 z-20"
            onReturnClick={onAttemptReturn}
            isExchangeMode={isExchangeMode}
            onExchangeClick={onAttemptExchange}
            onCollectDueClick={onAttemptCollectDue}
            cartLength={cart.length}
            heldCartsCount={heldCartsCount}
            onHoldClick={onHoldClick}
            onRefreshClick={onAttemptRefresh}
            isLastBillDisabled={!hasLastSale && !completedSaleNumber}
            onLastBillClick={onAttemptLastBill}
            allowDueSale={allowDueSale}
          />
        </div>

        {/* Right Sidebar Panel: Finalize Sale */}
        <div className="w-[380px] border-l border-border bg-card p-4 flex flex-col shrink-0 overflow-y-auto justify-between shadow-md">
          <div className="space-y-4">
            {/* Finalize Sale Header & Due Bill Checkbox */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Finalize Sale</h2>
              {allowDueSale && (
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="dueBill"
                    disabled={isWalkwayCustomer}
                    checked={isDueBill && !isWalkwayCustomer}
                    onCheckedChange={(c) => {
                      const isChecked = !!c;
                      if (isChecked) {
                        if (isWalkwayCustomer) {
                          toast.error("Due sale is not allowed for Walkway Customer. Please select a registered customer.");
                          return;
                        }
                        const isSecurePosDueRequired = posSettings?.securePos && (posSettings?.securePosDueSale ?? true);
                        if (isSecurePosDueRequired && !permittedById) {
                          setSecurityAction("DUE_SALE");
                          setIsSecurityModalOpen(true);
                          return;
                        }
                        setIsDueBill(true);
                        setCashAmount(0);
                        setCardAmount(0);
                        setMfsAmount(0);
                      } else {
                        setIsDueBill(false);
                        setPermittedById(null);
                        setPermittedUserName("");
                        const otherPayments = (Number(cardAmount) || 0) + (Number(mfsAmount) || 0);
                        setCashAmount(Math.max(0, Math.round(grandTotal) - otherPayments));
                      }
                    }}
                  />
                  <div className="flex flex-col leading-none">
                    <label
                      htmlFor="dueBill"
                      className={`text-xs font-semibold select-none ${
                        isWalkwayCustomer
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-muted-foreground cursor-pointer"
                      }`}
                      title={
                        isWalkwayCustomer
                          ? "Select registered customer to enable due sale"
                          : "Toggle due sale mode"
                      }
                    >
                      Due Bill
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary Table */}
            <div className="space-y-2 text-xs border-b border-border pb-3">
              <div className="flex justify-between items-center text-foreground font-semibold">
                <span>Total Item:</span>
                <span className="font-bold">{itemCount}</span>
              </div>
              <div className="flex justify-between items-center text-foreground">
                <span>Total:</span>
                <span className="font-bold">{subTotal.toFixed(2)}BDT</span>
              </div>
              <div className="flex justify-between items-center text-foreground">
                <span>Discount:</span>
                <span className="font-bold">{discountAmount.toFixed(2)}BDT</span>
              </div>
              <div className="flex justify-between items-center text-foreground">
                <span>Gross Total:</span>
                <span className="font-bold">{grandTotal.toFixed(2)}BDT</span>
              </div>
              <div className="flex justify-between items-center text-foreground font-bold text-sm pt-1 border-t border-border/50">
                <span>Gross Total(Round):</span>
                <span>{roundedGrandTotal.toFixed(2)}BDT</span>
              </div>
              {previousCustomerDue > 0 && (
                <>
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-semibold text-xs pt-1">
                    <span>Previous Due:</span>
                    <span>{previousCustomerDue.toFixed(2)}BDT</span>
                  </div>
                  <div className="flex justify-between items-center text-destructive font-bold text-xs">
                    <span>Total Combined Due:</span>
                    <span>{(previousCustomerDue + Math.max(0, roundedGrandTotal - totalPaid)).toFixed(2)}BDT</span>
                  </div>
                </>
              )}
            </div>

            {/* Payment Inputs */}
            <div className="space-y-3 pt-1">
              {/* Cash Dropdown & Input */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-foreground shrink-0">Cash:</span>
                  <Select
                    value={selectedCashAccount}
                    onValueChange={setSelectedCashAccount}
                  >
                    <SelectTrigger className="h-7 text-[11px] px-2 bg-background border-border">
                      <SelectValue placeholder="Cash" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.length === 0 ? (
                        <SelectItem value="none">Cash</SelectItem>
                      ) : (
                        cashAccounts.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  value={cashAmount}
                  onChange={(e) =>
                    setCashAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-8 text-xs text-right font-bold bg-background border-border flex-1 min-w-0 shadow-sm"
                />
              </div>

              {/* Card Dropdown & Input */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-foreground shrink-0">Card:</span>
                  <Select
                    value={selectedCardAccount}
                    onValueChange={setSelectedCardAccount}
                  >
                    <SelectTrigger className="h-7 text-[11px] px-2 bg-background border-border">
                      <SelectValue placeholder="Card" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.length === 0 ? (
                        <SelectItem value="none">Visa</SelectItem>
                      ) : (
                        bankAccounts.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  value={cardAmount}
                  onChange={(e) =>
                    setCardAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-8 text-xs text-right font-bold bg-background border-border flex-1 min-w-0 shadow-sm"
                />
              </div>

              {/* MFS Dropdown & Input */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-foreground shrink-0">MFS:</span>
                  <Select
                    value={selectedMfsAccount}
                    onValueChange={setSelectedMfsAccount}
                  >
                    <SelectTrigger className="h-7 text-[11px] px-2 bg-background border-border">
                      <SelectValue placeholder="MFS" />
                    </SelectTrigger>
                    <SelectContent>
                      {mfsAccounts.length === 0 ? (
                        <SelectItem value="none">bKash</SelectItem>
                      ) : (
                        mfsAccounts.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  value={mfsAmount}
                  onChange={(e) =>
                    setMfsAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="h-8 text-xs text-right font-bold bg-background border-border flex-1 min-w-0 shadow-sm"
                />
              </div>

              {/* Additional Discount Checkbox, Type Selector (% or ৳) & Input */}
              {allowDiscount && (
                <div className="pt-1 border-t border-border/50 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Checkbox
                        id="enableDiscount"
                        checked={enableDiscountInput}
                        onCheckedChange={(c) => {
                          const isChecked = !!c;
                          if (isChecked) {
                            const isSecurePosDiscountRequired = posSettings?.securePos && (posSettings?.securePosDiscount ?? true);
                            if (isSecurePosDiscountRequired && !permittedById) {
                              setSecurityAction("DISCOUNT");
                              setIsSecurityModalOpen(true);
                              return;
                            }
                            setEnableDiscountInput(true);
                            updateDiscountAmount(customDiscount, discountType, true, subTotal);
                          } else {
                            setEnableDiscountInput(false);
                            setCustomDiscount(0);
                            setDiscountAmount(0);
                          }
                        }}
                      />
                      <label
                        htmlFor="enableDiscount"
                        className="text-xs font-semibold text-foreground cursor-pointer select-none"
                      >
                        Discount:
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Select
                        disabled={!enableDiscountInput}
                        value={discountType}
                        onValueChange={(val: "FLAT" | "PERCENT") => {
                          setDiscountType(val);
                          updateDiscountAmount(customDiscount, val, enableDiscountInput, subTotal);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold px-2 bg-background border-border w-14 shrink-0 disabled:opacity-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLAT" className="text-xs font-bold">
                            ৳
                          </SelectItem>
                          <SelectItem value="PERCENT" className="text-xs font-bold">
                            %
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        disabled={!enableDiscountInput}
                        placeholder={discountType === "PERCENT" ? "0%" : "0.00"}
                        value={customDiscount}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : Number(e.target.value);
                          setCustomDiscount(val);
                          updateDiscountAmount(val, discountType, enableDiscountInput, subTotal);
                        }}
                        className={`h-8 text-xs text-right font-bold flex-1 min-w-0 shadow-sm disabled:opacity-50 ${
                          discountLimitError
                            ? "border-rose-500 text-rose-600 focus-visible:ring-rose-500 bg-rose-500/10 dark:bg-rose-950/20"
                            : "bg-background border-border"
                        }`}
                      />
                    </div>
                  </div>

                  {discountLimitError && (
                    <div className="text-[11px] leading-tight font-semibold text-rose-600 dark:text-rose-400 pt-0.5 flex items-start gap-1">
                      <FaExclamationTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="break-words">{discountLimitError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Points Redemption Section (directly under Discount) */}
              {allowCustomerPoints && (
                <div className="pt-2 border-t border-border/50 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Checkbox
                        id="enablePointsRedeem"
                        checked={enablePointsRedeem}
                        disabled={!selectedClientObj || clientPoints <= 0}
                        onCheckedChange={(c) => {
                          const isChecked = !!c;
                          if (isChecked) {
                            const isSecurePosPointsRequired = posSettings?.securePos && (posSettings?.securePosPoints ?? true);
                            if (isSecurePosPointsRequired && !permittedById) {
                              setSecurityAction("POINTS");
                              setIsSecurityModalOpen(true);
                              return;
                            }
                            setEnablePointsRedeem(true);
                            setPointsToRedeem(maxRedeemablePoints > 0 ? maxRedeemablePoints : 0);
                          } else {
                            setEnablePointsRedeem(false);
                            setPointsToRedeem(0);
                          }
                        }}
                      />
                      <label
                        htmlFor="enablePointsRedeem"
                        className={`text-xs font-semibold select-none flex items-center gap-1 ${
                          !selectedClientObj || clientPoints <= 0
                            ? "text-muted-foreground cursor-not-allowed opacity-60"
                            : "text-foreground cursor-pointer"
                        }`}
                      >
                        <FiAward className="w-3.5 h-3.5 text-amber-500" />
                        Use Points:
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Input
                        type="number"
                        disabled={!enablePointsRedeem || !selectedClientObj || clientPoints <= 0}
                        placeholder={clientPoints > 0 ? `0` : "0"}
                        value={enablePointsRedeem ? pointsToRedeem : 0}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setPointsToRedeem("");
                            return;
                          }
                          const num = Math.max(0, Math.min(maxRedeemablePoints, Number(val)));
                          setPointsToRedeem(num);
                        }}
                        className="h-8 text-xs text-right font-bold flex-1 min-w-0 shadow-sm disabled:opacity-50 bg-background border-border"
                      />
                    </div>
                  </div>

                  {/* Points status & monetary value subtext */}
                  {selectedClientObj && clientPoints > 0 ? (
                    <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground px-0.5 pt-0.5">
                      <span>Available: {clientPoints} Pts (৳{(clientPoints * pointValue).toFixed(2)})</span>
                      {enablePointsRedeem && effectivePointsToRedeem > 0 && (
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          Discount: -৳{pointsDiscountAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ) : selectedClientObj ? (
                    <div className="text-[10px] text-muted-foreground px-0.5 pt-0.5">
                      Customer has 0 available points
                    </div>
                  ) : null}
                </div>
              )}

              {/* Coupon / Promo Code Input Section */}
              {allowCoupon && (
                <div className="pt-2 border-t border-border/50 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <FaTag className="w-3 h-3 text-primary" /> Coupon Code
                    </span>
                    {appliedPromo && (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 font-bold px-1.5 py-0.5 rounded uppercase">
                        Applied
                      </span>
                    )}
                  </div>

                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-md px-2.5 py-1 text-xs">
                      <span className="font-bold text-emerald-700 font-mono">{appliedPromo}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 font-semibold"
                        onClick={handleRemovePromo}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Enter Coupon Code..."
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onAttemptApplyCoupon();
                          }
                        }}
                        className="h-8 text-xs font-mono uppercase bg-background border-border flex-1 shadow-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-sm"
                        onClick={onAttemptApplyCoupon}
                        disabled={!promoCode.trim()}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Cash Payment Shortcuts */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">
                  Quick Cash Shortcuts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 500, 1000].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-medium px-2 border-border bg-muted/20 hover:bg-muted"
                      onClick={() => setCashAmount((prev) => (Number(prev) || 0) + amt)}
                    >
                      +৳{amt}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2 border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => {
                      setCardAmount(0);
                      setMfsAmount(0);
                      setCashAmount(Math.round(grandTotal));
                    }}
                  >
                    Exact
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold px-2 border-destructive/20 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setCashAmount(0);
                      setCardAmount(0);
                      setMfsAmount(0);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Real-time Change / Remaining Due Status Card */}
            <div className="pt-2">
              {cart.length === 0 ? (
                <div className="bg-muted/30 border border-border/60 text-muted-foreground rounded-lg p-2.5 flex justify-between items-center text-xs font-medium">
                  <span>Payment Status:</span>
                  <span className="font-semibold text-foreground">No Items</span>
                </div>
              ) : isDueBill || totalPaid < roundedGrandTotal ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-2.5 space-y-1 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {totalPaid > 0 ? "Remaining Due:" : "Amount to Due:"}
                    </span>
                    <span className="text-base font-black">
                      ৳{Math.max(0, roundedGrandTotal - totalPaid).toFixed(2)}
                    </span>
                  </div>
                  {previousCustomerDue > 0 && (
                    <>
                      <div className="pt-1 border-t border-amber-500/20 flex justify-between items-center text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <span>Previous Customer Due:</span>
                        <span>৳{previousCustomerDue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-black text-destructive dark:text-rose-400">
                        <span>Total Combined Due:</span>
                        <span>৳{(previousCustomerDue + Math.max(0, roundedGrandTotal - totalPaid)).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wide">Change to Return:</span>
                  <span className="text-base font-black">৳{(totalPaid - roundedGrandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Loyalty Points Earning & Net Balance Summary Bar */}
            {allowCustomerPoints && selectedClientObj && clientPoints > 0 && (
              <div className="flex justify-between items-center text-muted-foreground text-[11px] font-medium pt-1 border-t border-border/40">
                <span>Earn Points: +{pointsEarnedThisSale} Pts</span>
                <span className="font-semibold text-foreground">
                  Net Balance: {clientPoints - effectivePointsToRedeem + pointsEarnedThisSale} Pts
                </span>
              </div>
            )}
          </div>

          {/* Print Bill Checkout Button & Powered By Footer */}
          <div className="pt-4 border-t border-border space-y-3 shrink-0">
            <Button
              className={`w-full h-11 text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 rounded-md ${
                cart.length === 0 || !!discountLimitError
                  ? "bg-slate-700 text-muted-foreground opacity-60 cursor-not-allowed"
                  : totalPaid >= roundedGrandTotal
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/15"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/15"
              }`}
              disabled={cart.length === 0 || !!discountLimitError}
              onClick={handlePrintBillClick}
            >
              <FaPrint className="w-4 h-4" />
              {cart.length === 0
                ? "Print Bill"
                : totalPaid >= roundedGrandTotal
                ? "Print Bill & Complete"
                : "Print Bill (Due Sale)"}
            </Button>

            <div className="text-center text-[11px] text-muted-foreground font-medium pt-1">
              Powered by: <span className="font-bold text-foreground">▼ techsoul</span>
            </div>
          </div>
        </div>
      </div>

      {/* POS Security Verification Modal */}
      <POSSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          setSecurityAction(null);
        }}
        onSuccess={(userId, userName) => {
          setPermittedById(userId);
          setPermittedUserName(userName);
          if (securityAction === "DISCOUNT") {
            setEnableDiscountInput(true);
            updateDiscountAmount(customDiscount, discountType, true, subTotal);
            toast.success(`Discount authorized by ${userName}`);
          } else if (securityAction === "COUPON") {
            handleApplyPromo();
            toast.success(`Coupon authorized by ${userName}`);
          } else if (securityAction === "POINTS") {
            setEnablePointsRedeem(true);
            setPointsToRedeem(maxRedeemablePoints > 0 ? maxRedeemablePoints : 0);
            toast.success(`Customer Points authorized by ${userName}`);
          } else if (securityAction === "EXCHANGE") {
            onExchangeClick();
            toast.success(`Exchange authorized by ${userName}`);
          } else if (securityAction === "RETURN") {
            onReturnClick();
            toast.success(`Sales Return authorized by ${userName}`);
          } else if (securityAction === "COLLECT_DUE") {
            onCollectDueClick();
            toast.success(`Due Collection authorized by ${userName}`);
          } else if (securityAction === "REFRESH") {
            onRefreshClick();
            toast.success(`POS Refresh authorized by ${userName}`);
          } else if (securityAction === "LAST_BILL") {
            onLastBillClick();
            toast.success(`Last Bill Print authorized by ${userName}`);
          } else if (securityAction === "REMOVE_ITEM") {
            if (pendingRemoveCartKey) {
              handleRemoveItem(pendingRemoveCartKey);
              setPendingRemoveCartKey(null);
            }
            toast.success(`Product removal authorized by ${userName}`);
          } else {
            setIsDueBill(true);
            setCashAmount(0);
            setCardAmount(0);
            setMfsAmount(0);
            toast.success(`Due Sale authorized by ${userName}`);
          }
          setSecurityAction(null);
        }}
        actionTitle={
          securityAction === "DISCOUNT"
            ? "Authorize Discount"
            : securityAction === "COUPON"
            ? "Authorize Coupon"
            : securityAction === "POINTS"
            ? "Authorize Customer Points"
            : securityAction === "EXCHANGE"
            ? "Authorize Item Exchange"
            : securityAction === "RETURN"
            ? "Authorize Sales Return"
            : securityAction === "COLLECT_DUE"
            ? "Authorize Due Collection"
            : securityAction === "REFRESH"
            ? "Authorize POS Refresh"
            : securityAction === "LAST_BILL"
            ? "Authorize Last Bill Print"
            : securityAction === "REMOVE_ITEM"
            ? "Authorize Product Removal"
            : "Authorize Due Sale"
        }
        actionDescription={
          securityAction === "DISCOUNT"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to enable discount."
            : securityAction === "COUPON"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to apply coupon."
            : securityAction === "POINTS"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to redeem customer points."
            : securityAction === "EXCHANGE"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to perform item exchange."
            : securityAction === "RETURN"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to perform sales return."
            : securityAction === "COLLECT_DUE"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to collect customer due."
            : securityAction === "REFRESH"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to refresh POS screen."
            : securityAction === "LAST_BILL"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to print last bill."
            : securityAction === "REMOVE_ITEM"
            ? "Secure POS is enabled. Select an authorized user with POS permissions and enter password to remove product from cart."
            : "Secure POS is enabled. Select an authorized user with POS permissions and enter password to enable due sale."
        }
      />
    </div>
  );
}
