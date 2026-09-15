"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FaSearch, FaHandPaper, FaSync, FaPrint, FaPlus, FaMinus, FaTrashAlt, FaShoppingCart, FaCheckCircle, FaTimes, FaUndoAlt, FaShoppingBag, FaIndustry, FaTicketAlt, FaCreditCard, FaMoneyBillWave, FaMobileAlt, FaUsers, FaGlassCheers, FaExclamationTriangle, FaBoxOpen, FaExchangeAlt, FaArrowLeft } from "react-icons/fa";
import { createSale, getClientItemDiscounts, validateCoupon, voidSale, processSaleReturn, processSaleExchange, getLastSaleForUser, getSaleByNumber, getSalesByCustomer } from "../../_actions/sale.action";
import { getOutstandingSales, collectCustomerDue, getClientNetARBalance } from "../../_actions/due-payment.action";
import { getHeldCartsAction, saveHeldCartAction, deleteHeldCartAction } from "../_actions/pos-hold.action";
import { useRouter, useSearchParams } from "next/navigation";
import { useToastContext } from "@/components/ui/providers/toast-provider";
import { toast as sonnerToast } from "sonner";
import { createClient } from "@/app/(dashboard)/dashboard/clients/_actions/client.action";
import { getMembershipSettingsAction } from "@/app/(dashboard)/dashboard/settings/_actions/membership-settings.action";
import { getMembershipTiers } from "@/app/(dashboard)/dashboard/settings/_actions/membership-tier.action";
import POSBottomToolbar from "./POSBottomToolbar";
import POSScreenStandard from "./POSScreenStandard";
import POSScreenModern from "./POSScreenModern";
import POSSecurityModal from "./POSSecurityModal";
import { ItemType } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ItemVariant {
  id: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  costPrice?: number | null;
  salesPrice?: number | null;
  wholesalePrice?: number | null;
  wholesaleDiscountAmount?: number | null;
  imageUrl?: string | null;
  stocks?: { warehouseId: string; quantity: number }[];
}

interface Item {
  id: string;
  code: string;
  barcode?: string | null;
  description: string;
  name?: string;
  itemDescription?: string;
  unit: string;
  unitPrice: number;
  wholesalePrice?: number;
  wholesaleDiscountAmount?: number;
  itemType: ItemType;
  category?: string | null;
  imageUrl: string | null;
  stocks: { warehouseId: string; quantity: number }[];
  variants?: ItemVariant[];
  isVatEnabled?: boolean;
  vatPercentage?: number;
  trackInventory: boolean;
  discount?: number;
  isPromo?: boolean;
  promoEndsAt?: string | null;
  isWeighingScale?: boolean;
}

interface Client {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  company: string | null;
  clientCode?: string | null;
  clientType?: string | null;
  membershipNumber?: string | null;
  membershipTier?: string | null;
  membershipTierId?: string | null;
  membershipStatus?: string | null;
  membershipPoints?: number | null;
  membershipExpiry?: any;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface CartItem extends Item {
  cartQuantity: number;
  variantId?: string;
  variantSku?: string;
  size?: string;
  color?: string;
  cartKey: string;
  isReturnItem?: boolean;
  originalSaleId?: string;
}

interface ActiveSalesman {
  id: string;
  name: string;
  email: string | null;
  warehouseId: string | null;
  userId: string | null;
}

interface POSComponentProps {
  items: Item[];
  clients: Client[];
  warehouses: Warehouse[];
  paymentAccounts?: Array<{
    id: string;
    code: string;
    name: string;
    type: "CASH" | "BANK" | "WALLET" | null;
    warehouseIds?: string[];
  }>;
  currentUser?: {
    id: string;
    role: string;
    defaultWarehouseId?: string | null;
  } | null;
  isWholesaleAllowed?: boolean;
  posSettings?: any;
  activeSalesmen?: ActiveSalesman[];
}

export default function POSComponent({ items, clients: initialClients, warehouses, paymentAccounts = [], currentUser, isWholesaleAllowed = false, posSettings, activeSalesmen = [] }: POSComponentProps) {


  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToastContext();
  
  const [clients, setClients] = useState<Client[]>(initialClients);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  
  // URL mode sync
  const initialMode = (searchParams.get("mode") as "RETAIL" | "WHOLESALE") || "RETAIL";
  const [orderType, setOrderType] = useState<"RETAIL" | "WHOLESALE">(
    initialMode === "WHOLESALE" && !isWholesaleAllowed ? "RETAIL" : initialMode
  );
  
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">("FLAT");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(posSettings?.defaultTaxRate || 0);
  const [isReturnMode, setIsReturnMode] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<{ id: string, cart: CartItem[], clientId: string, amount: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    const walkway = initialClients.find(c => c.name?.toLowerCase() === "walkway customer");
    const activeMode = initialMode === "WHOLESALE" && !isWholesaleAllowed ? "RETAIL" : initialMode;
    if (activeMode === "WHOLESALE") {
      const firstWholesale = initialClients.find(c => {
        return !!(
          c.company?.toLowerCase().includes("wholesale") ||
          c.name?.toLowerCase().includes("wholesale") ||
          c.email?.toLowerCase().includes("wholesale") ||
          c.clientCode?.toLowerCase().includes("wholesale") ||
          c.clientType === 'wholesale'
        );
      });
      return firstWholesale?.id || "";
    }
    return walkway?.id || initialClients[0]?.id || "";
  });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(currentUser?.defaultWarehouseId || warehouses[0]?.id || "");

  const clientOptions = useMemo(() => {
    return clients
      .filter(c => {
        const isWholesale = !!(
          c.company?.toLowerCase().includes("wholesale") ||
          c.name?.toLowerCase().includes("wholesale") ||
          c.email?.toLowerCase().includes("wholesale") ||
          c.clientCode?.toLowerCase().includes("wholesale") ||
          c.clientType === 'wholesale'
        );
        return orderType === "WHOLESALE" ? isWholesale : !isWholesale;
      })
      .map(c => {
        const descParts = [];
        if (c.clientType === 'wholesale') descParts.push("WS");
        if (c.clientCode) descParts.push(c.clientCode);
        if (c.phone) descParts.push(c.phone);
        const dueAmount = Number((c as any).netDue || 0);
        if (dueAmount > 0) {
          descParts.push(`Due: ৳${dueAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`);
        }
        return {
          value: c.id,
          label: c.name || c.email || "Unnamed Customer",
          description: descParts.length > 0 ? descParts.join(" | ") : undefined
        };
      });
  }, [clients, orderType]);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashAccountId, setCashAccountId] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [cardAccountId, setCardAccountId] = useState<string>("");
  const [mfsAmount, setMfsAmount] = useState<number>(0);
  const [mfsAccountId, setMfsAccountId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [salesAssistantId, setSalesAssistantId] = useState<string | null>(null);
  const [isDueSale, setIsDueSale] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [clientDiscounts, setClientDiscounts] = useState<any[]>([]);

  // Pay Due Modal states
  const [isPayDueModalOpen, setIsPayDueModalOpen] = useState(false);
  const [payDueClientId, setPayDueClientId] = useState("");
  const [outstandingSales, setOutstandingSales] = useState<any[]>([]);
  const [clientNetARBalance, setClientNetARBalance] = useState<number>(0);
  const [clientOpeningDue, setClientOpeningDue] = useState<number>(0);
  const [dueCashAmount, setDueCashAmount] = useState<number>(0);
  const [dueCashAccountId, setDueCashAccountId] = useState<string>("");
  const [dueCardAmount, setDueCardAmount] = useState<number>(0);
  const [dueCardAccountId, setDueCardAccountId] = useState<string>("");
  const [dueMfsAmount, setDueMfsAmount] = useState<number>(0);
  const [dueMfsAccountId, setDueMfsAccountId] = useState<string>("");
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(0);
  const [invoiceAllocations, setInvoiceAllocations] = useState<Record<string, number>>({});
  const [isSubmittingDuePayment, setIsSubmittingDuePayment] = useState(false);
  const [previousCustomerDue, setPreviousCustomerDue] = useState<number>(0);
  const [isExchangeMode, setIsExchangeMode] = useState(false);

  // Filter payment methods based on selected warehouse
  const filteredPaymentAccounts = useMemo(() => {
    return paymentAccounts.filter(acc => {
      // If the account has no linked warehouses, it is available globally
      if (!acc.warehouseIds || acc.warehouseIds.length === 0) {
        return true;
      }
      // Otherwise it must match the selected warehouse
      return acc.warehouseIds.includes(selectedWarehouseId);
    });
  }, [paymentAccounts, selectedWarehouseId]);

  const assistantOptions = useMemo(() => {
    const filteredAssistants = activeSalesmen.filter(emp => 
      emp.warehouseId === selectedWarehouseId && 
      (!emp.userId || emp.userId !== currentUser?.id)
    );
    return filteredAssistants.map(emp => ({
      value: emp.id,
      label: emp.name || emp.email || "Unnamed Assistant",
      description: emp.email || undefined,
    }));
  }, [activeSalesmen, selectedWarehouseId, currentUser]);

  const [membershipSettings, setMembershipSettings] = useState<any>(null);
  const [membershipTiers, setMembershipTiers] = useState<any[]>([]);

  useEffect(() => {
    getMembershipSettingsAction().then(res => {
      if (res.success && res.settings) {
        setMembershipSettings(res.settings);
      }
    });
    getMembershipTiers(1, 100, "", "active").then(res => {
      if (res.success && res.membershipTiers) {
        setMembershipTiers(res.membershipTiers);
      }
    });
  }, []);

  // Sync default payment option when filtered list changes


  useEffect(() => {
    getLastSaleForUser().then(res => setHasLastSale(!!res)).catch(() => setHasLastSale(false));
  }, []);

  useEffect(() => {
    getHeldCartsAction()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setHeldCarts(res.data);
        } else {
          const saved = localStorage.getItem("pos_held_carts");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setHeldCarts(parsed);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach((hc) => saveHeldCartAction(hc));
              }
            } catch (e) {}
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("pos_held_carts");
        if (saved) {
          try {
            setHeldCarts(JSON.parse(saved));
          } catch (e) {}
        }
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("pos_held_carts", JSON.stringify(heldCarts));
  }, [heldCarts]);

  // Promo Code / Coupon states
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscountMsg, setPromoDiscountMsg] = useState("");

  // Active POS Session Draft Auto-Hydration on Mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("pos_active_draft");
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft && Array.isArray(draft.cart) && draft.cart.length > 0) {
          setCart(draft.cart);
          if (draft.selectedClientId) setSelectedClientId(draft.selectedClientId);
          if (draft.selectedWarehouseId) setSelectedWarehouseId(draft.selectedWarehouseId);
          if (draft.orderType) setOrderType(draft.orderType);
          if (draft.promoCode) setPromoCode(draft.promoCode);
          if (draft.appliedPromo) setAppliedPromo(draft.appliedPromo);
          if (typeof draft.discountAmount === "number") setDiscountAmount(draft.discountAmount);
          if (draft.discountType) setDiscountType(draft.discountType);
          if (typeof draft.discountValue === "number") setDiscountValue(draft.discountValue);
          if (typeof draft.isExchangeMode === "boolean") setIsExchangeMode(draft.isExchangeMode);
          toast({
            title: "Draft Restored",
            description: `Restored ${draft.cart.length} item(s) from your previous session.`,
          });
        }
      }
    } catch (e) {
      console.error("Failed to restore active draft", e);
    }
  }, []);

  // Active POS Session Draft Auto-Save on Change
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem(
          "pos_active_draft",
          JSON.stringify({
            cart,
            selectedClientId,
            selectedWarehouseId,
            orderType,
            promoCode,
            appliedPromo,
            discountAmount,
            discountType,
            discountValue,
            isExchangeMode,
            timestamp: new Date().getTime(),
          })
        );
      } else {
        localStorage.removeItem("pos_active_draft");
      }
    } catch (e) {
      console.error("Failed to auto-save active draft", e);
    }
  }, [
    cart,
    selectedClientId,
    selectedWarehouseId,
    orderType,
    promoCode,
    appliedPromo,
    discountAmount,
    discountType,
    discountValue,
    isExchangeMode,
  ]);

  useEffect(() => {
    if (isConfirmModalOpen && filteredPaymentAccounts.length > 0) {
      const defaultCash = filteredPaymentAccounts.find(acc => acc.type === "CASH")?.id || "";
      const defaultCard = filteredPaymentAccounts.find(acc => acc.type === "BANK")?.id || "";
      const defaultMfs = filteredPaymentAccounts.find(acc => acc.type === "WALLET")?.id || "";
      
      if (!cashAccountId && defaultCash) setCashAccountId(defaultCash);
      if (!cardAccountId && defaultCard) setCardAccountId(defaultCard);
      if (!mfsAccountId && defaultMfs) setMfsAccountId(defaultMfs);

      const activeOption = filteredPaymentAccounts.find(acc => acc.id === paymentMethod);
      if (!activeOption) {
        setPaymentMethod(defaultCash || filteredPaymentAccounts[0].id);
      }
    }
  }, [filteredPaymentAccounts, isConfirmModalOpen, cashAccountId, cardAccountId, mfsAccountId]);

  useEffect(() => {
    setPaidAmount(cashAmount + cardAmount + mfsAmount);
  }, [cashAmount, cardAmount, mfsAmount]);

  useEffect(() => {
    if (selectedClientId) {
      getClientNetARBalance(selectedClientId).then(res => {
        if (res.success) {
          setPreviousCustomerDue(res.netDue);
        } else {
          setPreviousCustomerDue(0);
        }
      }).catch(() => setPreviousCustomerDue(0));
    } else {
      setPreviousCustomerDue(0);
    }
  }, [selectedClientId, isConfirmModalOpen]);

  useEffect(() => {
    if (payDueClientId) {
      getOutstandingSales(payDueClientId).then(res => {
        if (res.success) {
          setOutstandingSales(res.sales || []);
          setClientNetARBalance((res as any).netARBalance || 0);
          setClientOpeningDue((res as any).openingDue || 0);
          const initial: Record<string, number> = {};
          (res.sales || []).forEach((sale: any) => {
            initial[sale.id] = 0;
          });
          setInvoiceAllocations(initial);
        } else {
          setOutstandingSales([]);
          setClientNetARBalance(0);
          setClientOpeningDue(0);
          setInvoiceAllocations({});
        }
      }).catch(() => {
        setOutstandingSales([]);
        setClientNetARBalance(0);
        setClientOpeningDue(0);
        setInvoiceAllocations({});
      });
    } else {
      setOutstandingSales([]);
      setClientNetARBalance(0);
      setClientOpeningDue(0);
      setInvoiceAllocations({});
    }
  }, [payDueClientId]);

  useEffect(() => {
    if (isPayDueModalOpen && filteredPaymentAccounts.length > 0) {
      const defaultCash = filteredPaymentAccounts.find(acc => acc.type === "CASH")?.id || "";
      const defaultCard = filteredPaymentAccounts.find(acc => acc.type === "BANK")?.id || "";
      const defaultMfs = filteredPaymentAccounts.find(acc => acc.type === "WALLET")?.id || "";
      
      if (!dueCashAccountId && defaultCash) setDueCashAccountId(defaultCash);
      if (!dueCardAccountId && defaultCard) setDueCardAccountId(defaultCard);
      if (!dueMfsAccountId && defaultMfs) setDueMfsAccountId(defaultMfs);
    }
  }, [filteredPaymentAccounts, isPayDueModalOpen, dueCashAccountId, dueCardAccountId, dueMfsAccountId]);

  // Sale completion flow
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isHoldBillDeleteSecurityModalOpen, setIsHoldBillDeleteSecurityModalOpen] = useState(false);
  const [pendingDeleteHeldCartId, setPendingDeleteHeldCartId] = useState<string | null>(null);
  const [holdBillDeletePermittedById, setHoldBillDeletePermittedById] = useState<string | null>(null);
  const [hasLastSale, setHasLastSale] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const returnProductOptions = useMemo(() => {
    if (!isReturnModalOpen) return [];
    const isWholesale = orderType === "WHOLESALE";
    return items
      .filter((item) => {
        return isWholesale
          ? item.itemType === "WHOLESALE"
          : item.itemType === "READY_PRODUCT" || item.itemType === "RETAIL";
      })
      .flatMap((item) => {
        const codeStr = item.code ? ` [Code: ${item.code}]` : "";
        if (item.variants && item.variants.length > 0) {
          return item.variants.map((v) => {
            const stockQty =
              v.stocks?.find((s) => s.warehouseId === selectedWarehouseId)
                ?.quantity || 0;
            return {
              value: `${item.id}:${v.id}`,
              label: `${item.name || item.description}${codeStr} - ${v.color} / ${v.size} (${v.sku}) | Stock: ${stockQty}`,
            };
          });
        } else {
          const stockQty =
            item.stocks?.find((s) => s.warehouseId === selectedWarehouseId)
              ?.quantity || 0;
          return [
            {
              value: item.id,
              label: `${item.name || item.description}${codeStr} | Stock: ${stockQty}`,
            },
          ];
        }
      });
  }, [items, orderType, selectedWarehouseId, isReturnModalOpen]);

  const [returnMode, setReturnMode] = useState<"invoice" | "customer">("invoice");
  const [returnCustomerId, setReturnCustomerId] = useState("");
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [isFetchingCustomerSales, setIsFetchingCustomerSales] = useState(false);

  useEffect(() => {
    if (returnMode === "customer" && returnCustomerId) {
      setIsFetchingCustomerSales(true);
      setReturnSearchError(null);
      setReturnSaleDetails(null);
      getSalesByCustomer(returnCustomerId, orderType).then(res => {
        if(res.success) {
          const sales = res.sales || [];
          setCustomerSales(sales);
          if (sales.length === 0) {
            setReturnSearchError(`No completed invoices found for this customer in ${orderType} mode.`);
          }
        } else {
          toast({ title: "Error", description: "Could not fetch sales", variant: "destructive" });
          setReturnSearchError(res.error || "Failed to fetch customer sales");
        }
        setIsFetchingCustomerSales(false);
      });
    } else {
      setCustomerSales([]);
    }
  }, [returnMode, returnCustomerId, orderType]);

  const [actionSaleNumber, setActionSaleNumber] = useState('');
  const [returnSaleDetails, setReturnSaleDetails] = useState<any>(null);
  const [returnSearchError, setReturnSearchError] = useState<string | null>(null);
  const [returnItemsState, setReturnItemsState] = useState<{itemId: string, variantId?: string, maxQty: number, returnQty: number}[]>([]);
  const [isFullReturnChecked, setIsFullReturnChecked] = useState(false);
  const [refundMode, setRefundMode] = useState<"AR_OFFSET_FIRST" | "CASH_PAID_ONLY">("AR_OFFSET_FIRST");
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isFetchingSale, setIsFetchingSale] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [completedSaleNumber, setCompletedSaleNumber] = useState('');
  const [completedSaleId, setCompletedSaleId] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);

  // Walkway customer
  const [walkwayCustomerId, setWalkwayCustomerId] = useState<string>('');

  // Add Customer modal states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerLoading, setNewCustomerLoading] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    membershipTier: "NONE"
  });

  // Sync state mode to URL search parameter
  const updateOrderMode = (mode: "RETAIL" | "WHOLESALE") => {
    setOrderType(mode);
    setCart([]);
    setDiscountAmount(0);
    setDiscountValue(0);
    setDiscountType("FLAT");
    setIsReturnMode(false);
    
    // Auto select first customer matching the mode
    const walkwayCustomer = clients.find(c => c.name?.toLowerCase() === "walkway customer");
    const walkwayId = walkwayCustomer?.id || walkwayCustomerId;
    
    if (mode === "WHOLESALE") {
      const firstWholesale = clients.find(c => {
        return !!(
          c.company?.toLowerCase().includes("wholesale") ||
          c.name?.toLowerCase().includes("wholesale") ||
          c.email?.toLowerCase().includes("wholesale") ||
          c.clientCode?.toLowerCase().includes("wholesale") ||
          c.clientType === 'wholesale'
        );
      });
      if (firstWholesale) {
        setSelectedClientId(firstWholesale.id);
      } else {
        setSelectedClientId("");
      }
    } else {
      setSelectedClientId(walkwayId);
    }

    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    router.replace(`?${params.toString()}`);
  };

  const getItemDiscount = (item: CartItem | Item, variantId?: string) => {
    if (posSettings?.allowItemDiscount === false) return undefined;
    const vId = variantId || (item as CartItem).variantId;
    if (vId) {
      const variantDiscount = clientDiscounts.find(
        (d) => d.variantId === vId
      );
      if (variantDiscount) return variantDiscount;
    }
    return clientDiscounts.find(
      (d) => d.itemId === item.id && !d.variantId
    );
  };

  const isPromoActive = (item: any) => {
    if (!item.isPromo) return true;
    const now = new Date();
    if (item.promoStartsAt && now < new Date(item.promoStartsAt)) return false;
    if (item.promoEndsAt && now > new Date(item.promoEndsAt)) return false;
    return true;
  };

  const getBasePrice = (item: CartItem | Item, currentOrderType: "RETAIL" | "WHOLESALE") => {
    const promoActive = isPromoActive(item);

    if ("variantId" in item && item.variantId && item.variants) {
      const variant = item.variants.find(v => v.id === item.variantId);
      if (variant) {
        if (currentOrderType === "WHOLESALE") {
          if (variant.wholesalePrice !== null && variant.wholesalePrice !== undefined) {
            return Number(variant.wholesalePrice);
          }
          if (variant.wholesaleDiscountAmount !== null && variant.wholesaleDiscountAmount !== undefined) {
            const wsDiscount = promoActive ? Number(variant.wholesaleDiscountAmount) : 0;
            return Number(variant.salesPrice || item.unitPrice) - wsDiscount;
          }
        }
        if (variant.salesPrice !== null && variant.salesPrice !== undefined) {
          const retDiscount = promoActive ? Number(item.discount || 0) : 0;
          return Number(variant.salesPrice) - retDiscount;
        }
      }
    }
    
    if (currentOrderType === "WHOLESALE") {
      if (item.wholesalePrice !== null && item.wholesalePrice !== undefined) {
        return Number(item.wholesalePrice);
      }
      if (item.wholesaleDiscountAmount !== null && item.wholesaleDiscountAmount !== undefined) {
        const wsDiscount = promoActive ? Number(item.wholesaleDiscountAmount) : 0;
        return item.unitPrice - wsDiscount;
      }
    }
    
    const retDiscount = promoActive ? Number(item.discount || 0) : 0;
    return item.unitPrice - retDiscount;
  };

  const getDiscountedPrice = (item: CartItem, basePrice: number, discounts: any[]) => {
    if ((item as any).isDiscountable === false) return basePrice;
    const discount = getItemDiscount(item);
    if (!discount) return basePrice;

    if (discount.discountType === "PERCENTAGE") {
      const factor = Math.max(0, 1 - (discount.discountValue / 100));
      return basePrice * factor;
    } else if (discount.discountType === "FLAT") {
      return Math.max(0, basePrice - discount.discountValue);
    }
    return basePrice;
  };

  // Set walkway customer as default on mount and sync URL mode
  useEffect(() => {
    const walkway = clients.find(c =>
      c.name?.toLowerCase().includes('walkway') ||
      c.email?.toLowerCase().includes('walkway')
    );
    if (walkway) {
      setWalkwayCustomerId(walkway.id);
      if (!selectedClientId) {
        setSelectedClientId(walkway.id);
      }
    }
  }, [clients, selectedClientId]);

  const changeCustomerAndSyncMode = (val: string, customClients?: Client[]) => {
    setSelectedClientId(val);
    if (!val) return;
    const clientsList = customClients || clients;
    const client = clientsList.find((c) => c.id === val);
    const walkwayCustomer = clientsList.find(c => c.name?.toLowerCase() === "walkway customer");
    if (val === walkwayCustomer?.id || val === walkwayCustomerId) {
      setIsDueSale(false);
      setCashAmount(grandTotal);
      setCardAmount(0);
      setMfsAmount(0);
    }
    const isWholesale = client
      ? !!(
          client.company?.toLowerCase().includes("wholesale") ||
          client.name?.toLowerCase().includes("wholesale") ||
          client.email?.toLowerCase().includes("wholesale") ||
          client.clientCode?.toLowerCase().includes("wholesale") ||
          client.clientType === 'wholesale'
        )
      : false;

    const newMode = isWholesale ? "WHOLESALE" : "RETAIL";
    if (newMode !== orderType) {
      updateOrderMode(newMode);
    }
  };

  useEffect(() => {
    const mode = searchParams.get("mode") as "RETAIL" | "WHOLESALE";
    if (mode && (mode === "RETAIL" || mode === "WHOLESALE") && mode !== orderType) {
      if (mode === "WHOLESALE" && !isWholesaleAllowed) {
        setOrderType("RETAIL");
      } else {
        setOrderType(mode);
      }
    }
  }, [searchParams, isWholesaleAllowed, orderType]);

  useEffect(() => {
    if (!selectedClientId) {
      setClientDiscounts([]);
      return;
    }
    const client = clients.find((c) => c.id === selectedClientId);
    const isWholesale = client
      ? !!(
          client.company?.toLowerCase().includes("wholesale") ||
          client.name?.toLowerCase().includes("wholesale") ||
          client.email?.toLowerCase().includes("wholesale") ||
          client.clientCode?.toLowerCase().includes("wholesale") ||
          client.clientType === 'wholesale'
        )
      : false;

    if (isWholesale) {
      getClientItemDiscounts(selectedClientId).then((res) => {
        if (res.success && res.discounts) {
          setClientDiscounts(res.discounts);
          toast({
            title: "Wholesale Customer Selected",
            description: `Loaded ${res.discounts.length} custom discounts for ${client?.name || client?.email}.`,
          });
        } else {
          setClientDiscounts([]);
        }
      });
    } else {
      setClientDiscounts([]);
    }
  }, [selectedClientId]);

  useEffect(() => {
    setCart((prevCart) => {
      let changed = false;
      const newCart = prevCart.map((item) => {
        const basePrice = getBasePrice(item, orderType);
        const finalPrice = getDiscountedPrice(item, basePrice, clientDiscounts);
        if (item.unitPrice !== finalPrice) {
          changed = true;
          return { ...item, unitPrice: finalPrice };
        }
        return item;
      });
      return changed ? newCart : prevCart;
    });
  }, [clientDiscounts, orderType]);

  // Variant Add Dialog States
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<Item | null>(null);

  const categories = useMemo(() => {
    // Show only raw material or product type categories in POS
    // Here we filter items based on the active mode (RETAIL / READY_PRODUCT items vs WHOLESALE items)
    const relevantItems = items.filter(item =>
      orderType === 'RETAIL'
        ? (item.itemType === 'RETAIL' || item.itemType === 'READY_PRODUCT')
        : item.itemType === 'WHOLESALE'
    );
    const cats = Array.from(new Set(relevantItems.map((i) => i.category).filter(Boolean))) as string[];
    return cats.sort();
  }, [items, orderType]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        const matchesCode = item.code?.toLowerCase().includes(q);
        const matchesBarcode = item.barcode?.toLowerCase().includes(q);
        const matchesDescription = item.description?.toLowerCase().includes(q);
        const matchesDbDescription = item.itemDescription?.toLowerCase().includes(q);
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesVariant = item.variants?.some(v => 
          (v.sku && v.sku.toLowerCase().includes(q)) || 
          (v.barcode && v.barcode.toLowerCase().includes(q))
        ) || false;

        const prefix7 = q.length >= 7 ? q.slice(0, 7) : q;
        const matchesScaleBarcode = Boolean(
          item.isWeighingScale && (
            (item.code && (item.code.toLowerCase() === prefix7 || q.startsWith(item.code.toLowerCase()))) ||
            (item.barcode && (item.barcode.toLowerCase() === prefix7 || q.startsWith(item.barcode.toLowerCase()))) ||
            (item.description && (item.description.toLowerCase() === prefix7 || q.startsWith(item.description.toLowerCase()))) ||
            (item.name && (item.name.toLowerCase() === prefix7 || q.startsWith(item.name.toLowerCase()))) ||
            item.variants?.some(v => 
              (v.sku && (v.sku.toLowerCase() === prefix7 || q.startsWith(v.sku.toLowerCase()))) ||
              (v.barcode && (v.barcode.toLowerCase() === prefix7 || q.startsWith(v.barcode.toLowerCase())))
            )
          )
        );

        matchesSearch = Boolean(matchesCode || matchesBarcode || matchesDescription || matchesDbDescription || matchesName || matchesVariant || matchesScaleBarcode);
      }

      const matchesCategory = filterType === "ALL" || item.category === filterType;
      const matchesOrderType = orderType === "RETAIL"
        ? (item.itemType === "RETAIL" || item.itemType === "READY_PRODUCT")
        : item.itemType === "WHOLESALE";

      const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
      let hasStock = true;
      if (!isNegativeSaleAllowed && item.trackInventory) {
        const itemStock = item.variants && item.variants.length > 0
          ? item.variants.reduce((acc, v) => acc + (v.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0), 0)
          : (item.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0);
        hasStock = itemStock > 0;
      }

      return matchesSearch && matchesCategory && matchesOrderType && hasStock;
    });
  }, [items, searchQuery, filterType, orderType, posSettings, selectedWarehouseId]);

  const itemsHiddenDueToStock = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      
      const matchesCode = item.code?.toLowerCase().includes(q);
      const matchesBarcode = item.barcode?.toLowerCase().includes(q);
      const matchesDescription = item.description?.toLowerCase().includes(q);
      const matchesDbDescription = item.itemDescription?.toLowerCase().includes(q);
      const matchesName = item.name?.toLowerCase().includes(q);
      const matchesVariant = item.variants?.some(v => 
        (v.sku && v.sku.toLowerCase().includes(q)) || 
        (v.barcode && v.barcode.toLowerCase().includes(q))
      ) || false;

      const matchesSearch = matchesCode || matchesBarcode || matchesDescription || matchesDbDescription || matchesName || matchesVariant;
      if (!matchesSearch) return false;

      const matchesCategory = filterType === "ALL" || item.category === filterType;
      const matchesOrderType = orderType === "RETAIL"
        ? (item.itemType === "RETAIL" || item.itemType === "READY_PRODUCT")
        : item.itemType === "WHOLESALE";
      if (!matchesCategory || !matchesOrderType) return false;

      const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
      let hasStock = true;
      if (!isNegativeSaleAllowed && item.trackInventory) {
        const itemStock = item.variants && item.variants.length > 0
          ? item.variants.reduce((acc, v) => acc + (v.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0), 0)
          : (item.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0);
        hasStock = itemStock > 0;
      }
      return !hasStock;
    });
  }, [items, searchQuery, filterType, orderType, posSettings, selectedWarehouseId]);

  useEffect(() => {
    if (searchQuery.trim() && filteredItems.length === 0 && itemsHiddenDueToStock.length > 0) {
      const firstItem = itemsHiddenDueToStock[0];
      const stock = firstItem.variants && firstItem.variants.length > 0
        ? firstItem.variants.reduce((acc, v) => acc + (v.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0), 0)
        : (firstItem.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0);
      
      toast({
        title: "Item Out of Stock",
        description: `"${firstItem.description}" is out of stock (Available: ${stock}). It is hidden from the search results.`,
        variant: "destructive",
        duration: 3000
      });
    }
  }, [searchQuery, filteredItems.length, itemsHiddenDueToStock, selectedWarehouseId]);

  const sortedCart = useMemo(() => {
    return [...cart].sort((a, b) => {
      if (a.isReturnItem && !b.isReturnItem) return -1;
      if (!a.isReturnItem && b.isReturnItem) return 1;
      return 0;
    });
  }, [cart]);

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const lineVal = item.unitPrice * item.cartQuantity;
      return sum + (item.isReturnItem ? -lineVal : lineVal);
    }, 0);
  }, [cart]);

  const itemVatTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.isVatEnabled && item.vatPercentage) {
        const lineVal = (item.unitPrice * item.cartQuantity) * (item.vatPercentage / 100);
        return sum + (item.isReturnItem ? -lineVal : lineVal);
      }
      return sum;
    }, 0);
  }, [cart]);
  const manualDiscountAmount = discountType === "PERCENTAGE"
    ? Number((subTotal * (discountValue / 100)).toFixed(2))
    : discountValue;

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const matchedMembershipTier = useMemo(() => {
    if (!selectedClient || selectedClient.membershipStatus !== "ACTIVE" || membershipTiers.length === 0) {
      return null;
    }
    return membershipTiers.find(
      t => (t.id === selectedClient.membershipTierId || t.name === selectedClient.membershipTier) &&
           t.status === "active" &&
           !t.isTrash
    ) || null;
  }, [selectedClient, membershipTiers]);

  const membershipDiscountAmount = useMemo(() => {
    if (!matchedMembershipTier) return 0;
    const minPurchase = Number(matchedMembershipTier.minPurchaseValue || 0);
    if (subTotal >= minPurchase) {
      const pct = Number(matchedMembershipTier.discountPercentage);
      if (pct > 0) {
        return Number((subTotal * (pct / 100)).toFixed(2));
      }
    }
    return 0;
  }, [matchedMembershipTier, subTotal]);

  const effectiveDiscountAmount = (appliedPromo || discountAmount > 0 ? discountAmount : manualDiscountAmount) + membershipDiscountAmount;

  const tax = (posSettings?.allowTax ?? true) ? (itemVatTotal + (subTotal - effectiveDiscountAmount) * (taxPercent / 100)) : 0;
  const grandTotal = subTotal + tax - effectiveDiscountAmount;
  const roundedGrandTotal = Math.round(grandTotal);
  const dueAmount = roundedGrandTotal - paidAmount;

  // Check Discount Limit Rules
  const discountLimitError = React.useMemo(() => {
    if (!posSettings?.enableDiscountLimits || (!discountAmount && !discountValue && !manualDiscountAmount)) {
      return null;
    }

    const currentDiscountAmt = effectiveDiscountAmount || discountAmount || manualDiscountAmount || 0;
    if (currentDiscountAmt <= 0) return null;

    const isBelowCostRule = posSettings?.discountRuleMode === "below_cost" || posSettings?.preventBelowCostPrice;
    const isMaxPercentRule = posSettings?.discountRuleMode === "max_percent" || posSettings?.enableMaxDiscountPercent;

    if (isBelowCostRule) {
      const totalCost = cart.reduce((acc, item) => {
        const itemCost = Number((item as any).costPrice || (item as any).purchasePrice || (item as any).variant?.costPrice || (item as any).variant?.purchasePrice || 0);
        return acc + (itemCost * (item.cartQuantity || 1));
      }, 0);

      const netSalePrice = subTotal - currentDiscountAmt;
      if (totalCost > 0 && netSalePrice < totalCost) {
        return `Discount drops total sale price (৳${netSalePrice.toFixed(2)}) below stock cost value (৳${totalCost.toFixed(2)})`;
      }
    }

    if (isMaxPercentRule) {
      const maxAllowedPercent = Number(posSettings?.maxDiscountPercentage || 0);
      let calculatedPercent = 0;

      if (discountType === "PERCENTAGE") {
        calculatedPercent = Number(discountValue || 0);
      } else {
        calculatedPercent = subTotal > 0 ? (currentDiscountAmt / subTotal) * 100 : 0;
      }

      if (maxAllowedPercent > 0 && calculatedPercent > maxAllowedPercent) {
        return `Discount (${calculatedPercent.toFixed(1)}%) exceeds maximum allowed limit of ${maxAllowedPercent}%`;
      }
    }

    return null;
  }, [posSettings, discountAmount, discountValue, manualDiscountAmount, discountType, effectiveDiscountAmount, subTotal, cart]);

  const handleAddToCart = (item: Item, quantity: number = 1) => {
    if (item.variants && item.variants.length > 0) {
      setSelectedItemForVariants(item);
      return;
    }

    const basePrice = getBasePrice(item, orderType);
    let priceToUse = basePrice;
    const discount = getItemDiscount(item);
    if (discount) {
      if (discount.discountType === "PERCENTAGE") {
        priceToUse = basePrice * Math.max(0, 1 - (discount.discountValue / 100));
      } else if (discount.discountType === "FLAT") {
        priceToUse = Math.max(0, basePrice - discount.discountValue);
      }
    }

    const delta = isReturnMode ? -quantity : quantity;
    const cartKey = item.id;

    // Stock check for simple item addition
    const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
    if (!isNegativeSaleAllowed && item.trackInventory && !isReturnMode) {
      const availableStock = item.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
      const existing = cart.find((i) => i.cartKey === cartKey);
      const currentQty = existing ? existing.cartQuantity : 0;
      if (currentQty + quantity > availableStock) {
        toast({
          title: "Stock Alert",
          description: `Cannot add more of: ${item.description || item.name || "item"}. Available stock: ${availableStock}.`,
          variant: "destructive"
        });
        return;
      }
    }

    const itemToAdd: CartItem = { 
      ...item, 
      unitPrice: priceToUse,
      cartKey,
      cartQuantity: delta
    };

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        const updatedItem = { ...existing, cartQuantity: existing.cartQuantity + delta };
        if (updatedItem.cartQuantity === 0) {
          return prev.filter((i) => i.cartKey !== cartKey);
        }
        return [updatedItem, ...prev.filter((i) => i.cartKey !== cartKey)];
      }
      return [itemToAdd, ...prev];
    });

    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  };

  const handleVariantAddToCart = (item: Item, variant: ItemVariant, quantity: number = 1) => {
    let basePriceToUse = item.unitPrice;
    if (orderType === "WHOLESALE") {
      if (variant.wholesalePrice !== null && variant.wholesalePrice !== undefined) {
        basePriceToUse = Number(variant.wholesalePrice);
      } else if (variant.wholesaleDiscountAmount !== null && variant.wholesaleDiscountAmount !== undefined) {
        basePriceToUse = Number(variant.salesPrice || item.unitPrice) - Number(variant.wholesaleDiscountAmount);
      } else if (item.wholesalePrice !== null && item.wholesalePrice !== undefined) {
        basePriceToUse = Number(item.wholesalePrice);
      } else if (item.wholesaleDiscountAmount !== null && item.wholesaleDiscountAmount !== undefined) {
        basePriceToUse = item.unitPrice - Number(item.wholesaleDiscountAmount);
      } else if (variant.salesPrice !== null && variant.salesPrice !== undefined) {
        basePriceToUse = Number(variant.salesPrice);
      }
    } else {
      if (variant.salesPrice !== null && variant.salesPrice !== undefined) {
        basePriceToUse = Number(variant.salesPrice);
      }
    }
    let priceToUse = basePriceToUse;
    const discount = getItemDiscount(item, variant.id);
    if (discount) {
      if (discount.discountType === "PERCENTAGE") {
        priceToUse = basePriceToUse * Math.max(0, 1 - (discount.discountValue / 100));
      } else if (discount.discountType === "FLAT") {
        priceToUse = Math.max(0, basePriceToUse - discount.discountValue);
      }
    }

    const delta = isReturnMode ? -quantity : quantity;
    const cartKey = `${item.id}-${variant.id}`;

    // Stock check for variant item addition
    const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
    if (!isNegativeSaleAllowed && item.trackInventory && !isReturnMode) {
      const variantStock = variant.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
      const existing = cart.find((i) => i.cartKey === cartKey);
      const currentQty = existing ? existing.cartQuantity : 0;
      if (currentQty + quantity > variantStock) {
        toast({
          title: "Stock Alert",
          description: `Cannot add more of: ${item.description || item.name || "item"} (${variant.color} / ${variant.size}). Available stock: ${variantStock}.`,
          variant: "destructive"
        });
        return;
      }
    }

    const itemToAdd: CartItem = {
      ...item,
      unitPrice: priceToUse,
      variantId: variant.id,
      variantSku: variant.sku,
      size: variant.size,
      color: variant.color,
      imageUrl: variant.imageUrl || item.imageUrl,
      cartKey,
      cartQuantity: delta
    };

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        const updatedItem = { ...existing, cartQuantity: existing.cartQuantity + delta };
        if (updatedItem.cartQuantity === 0) {
          return prev.filter((i) => i.cartKey !== cartKey);
        }
        return [updatedItem, ...prev.filter((i) => i.cartKey !== cartKey)];
      }
      return [itemToAdd, ...prev];
    });

    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  };

  const handleUpdateQuantity = (cartKey: string, delta: number) => {
    const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;

    setCart((prev) => {
      const item = prev.find((i) => i.cartKey === cartKey);
      if (item && delta > 0 && !isNegativeSaleAllowed && item.trackInventory && !isReturnMode) {
        let availableStock = 0;
        if (item.variantId) {
          const variant = items.find(it => it.id === item.id)?.variants?.find(v => v.id === item.variantId);
          availableStock = variant?.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
        } else {
          availableStock = items.find(it => it.id === item.id)?.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
        }

        if (item.cartQuantity + delta > availableStock) {
          toast({
            title: "Stock Alert",
            description: `Cannot exceed available stock of ${availableStock} for ${item.description || item.name || "item"}.`,
            variant: "destructive"
          });
          return prev;
        }
      }

      return prev.map((i) => {
        if (i.cartKey === cartKey) {
          const newQ = i.cartQuantity + delta;
          return { ...i, cartQuantity: newQ };
        }
        return i;
      }).filter((i) => i.cartQuantity !== 0);
    });
  };

  const handleCustomQuantitySet = (cartKey: string, qty: number) => {
    const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;

    setCart((prev) => {
      const item = prev.find((i) => i.cartKey === cartKey);
      if (item && !isNegativeSaleAllowed && item.trackInventory && !isReturnMode) {
        let availableStock = 0;
        if (item.variantId) {
          const variant = items.find(it => it.id === item.id)?.variants?.find(v => v.id === item.variantId);
          availableStock = variant?.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
        } else {
          availableStock = items.find(it => it.id === item.id)?.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
        }

        if (qty > availableStock) {
          toast({
            title: "Stock Alert",
            description: `Cannot exceed available stock of ${availableStock} for ${item.description || item.name || "item"}. Setting to max available.`,
            variant: "destructive"
          });
          qty = availableStock;
        }
      }

      return prev.map((i) => {
        if (i.cartKey === cartKey) {
          return { ...i, cartQuantity: qty };
        }
        return i;
      }).filter((i) => i.cartQuantity !== 0);
    });
  };

  const handleRemoveItem = (cartKey: string) => {
    setCart((prev) => prev.filter((i) => i.cartKey !== cartKey));
  };

  const tryWeighingScaleScan = (rawCode: string): boolean => {
    const codeStr = rawCode.trim().toLowerCase();
    if (codeStr.length < 11) return false;

    // Check if there is an exact match for the FULL rawCode first!
    const exactMatch = items.find((item) => {
      const matchesOrderType = orderType === "RETAIL"
        ? (item.itemType === "RETAIL" || item.itemType === "READY_PRODUCT")
        : item.itemType === "WHOLESALE";
      if (!matchesOrderType) return false;

      return (
        item.code?.toLowerCase() === codeStr ||
        item.barcode?.toLowerCase() === codeStr ||
        item.variants?.some((v) => v.sku?.toLowerCase() === codeStr || v.barcode?.toLowerCase() === codeStr)
      );
    });

    // If exact match exists and it's NOT a scale item, let normal barcode scanner handle it
    if (exactMatch && !exactMatch.isWeighingScale) {
      return false;
    }

    // Split barcode: first 7 digits as barcode/code, remainder as quantity
    const prefix7 = codeStr.slice(0, 7);
    const qtyDigits = codeStr.slice(7);

    if (!/^\d{4,6}$/.test(qtyDigits)) return false;

    // Find all matching items for this orderType
    const matchingItems = items.filter((item) => {
      const matchesOrderType = orderType === "RETAIL"
        ? (item.itemType === "RETAIL" || item.itemType === "READY_PRODUCT")
        : item.itemType === "WHOLESALE";

      if (!matchesOrderType) return false;

      const matchesCode = Boolean(
        item.code && (
          item.code.toLowerCase() === prefix7 ||
          prefix7 === item.code.toLowerCase() ||
          codeStr.startsWith(item.code.toLowerCase())
        )
      );
      const matchesBarcode = Boolean(
        item.barcode && (
          item.barcode.toLowerCase() === prefix7 ||
          prefix7 === item.barcode.toLowerCase() ||
          codeStr.startsWith(item.barcode.toLowerCase())
        )
      );
      const matchesDesc = Boolean(
        item.description && (
          item.description.toLowerCase() === prefix7 ||
          prefix7 === item.description.toLowerCase() ||
          codeStr.startsWith(item.description.toLowerCase())
        )
      );
      const matchesName = Boolean(
        item.name && (
          item.name.toLowerCase() === prefix7 ||
          prefix7 === item.name.toLowerCase() ||
          codeStr.startsWith(item.name.toLowerCase())
        )
      );
      const matchesVariant = item.variants?.some(
        (v) => (v.sku && (v.sku.toLowerCase() === prefix7 || codeStr.startsWith(v.sku.toLowerCase()))) ||
               (v.barcode && (v.barcode.toLowerCase() === prefix7 || codeStr.startsWith(v.barcode.toLowerCase())))
      );

      return matchesCode || matchesBarcode || matchesDesc || matchesName || matchesVariant;
    });

    // Prioritize item that has isWeighingScale enabled and matches code or barcode
    const targetItem = matchingItems.find(i => i.isWeighingScale && (i.code?.toLowerCase() === prefix7 || i.barcode?.toLowerCase() === prefix7))
      || matchingItems.find(i => i.isWeighingScale)
      || matchingItems[0];

    if (targetItem) {
      if (!targetItem.isWeighingScale) {
        toast({
          title: "Scale Mode Disabled",
          description: `Product "${targetItem.description || targetItem.name}" was found for code ${prefix7}, but Weighing Scale is not enabled.`,
          variant: "destructive"
        });
        return true;
      }

      const divisor = qtyDigits.length === 6 ? 10000 : (qtyDigits.length === 5 ? 1000 : 100);
      const parsedQty = parseFloat(qtyDigits) / divisor;

      if (isNaN(parsedQty) || parsedQty <= 0) return false;

      const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
      if (!isNegativeSaleAllowed && targetItem.trackInventory) {
        const itemStock = targetItem.variants && targetItem.variants.length > 0
          ? targetItem.variants.reduce((acc, v) => acc + (v.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0), 0)
          : (targetItem.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0);

        if (itemStock <= 0) {
          toast({
            title: "Stock Alert",
            description: `Cannot add: ${targetItem.description || targetItem.name || "Item"} is out of stock.`,
            variant: "destructive"
          });
          return true;
        }
      }

      toast({
        title: "Scale Barcode Scanned",
        description: `Added: ${targetItem.description || targetItem.name || "Item"} (${parsedQty} kg)`,
        duration: 1500,
      });

      if (targetItem.variants && targetItem.variants.length > 0) {
        const matchedVariant = targetItem.variants.find(v => (v.sku && prefix7 === v.sku.toLowerCase()) || (v.barcode && prefix7 === v.barcode.toLowerCase())) || targetItem.variants[0];
        handleVariantAddToCart(targetItem, matchedVariant, parsedQty);
      } else {
        handleAddToCart(targetItem, parsedQty);
      }

      return true;
    }

    return false;
  };

  const handleBarcodeScan = (barcode: string) => {
    for (const item of items) {
      if (item.variants) {
        const matchedVariant = item.variants.find(
          v => v.barcode === barcode || v.sku === barcode
        );
        if (matchedVariant) {
          const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
          if (!isNegativeSaleAllowed && item.trackInventory) {
            const variantStock = matchedVariant.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
            if (variantStock <= 0) {
              toast({
                title: "Stock Alert",
                description: `Cannot add: ${item.description} (${matchedVariant.color} / ${matchedVariant.size}) is out of stock.`,
                variant: "destructive"
              });
              return;
            }
          }

          toast({
            title: "SKU Scanned",
            description: `Added: ${item.description} (${matchedVariant.color} / ${matchedVariant.size})`,
            duration: 1200,
          });
          handleVariantAddToCart(item, matchedVariant);
          return;
        }
      }
    }

    const matchedItem = items.find(i => i.code === barcode || i.barcode === barcode);
    if (matchedItem) {
      if (matchedItem.variants && matchedItem.variants.length > 0) {
        setSelectedItemForVariants(matchedItem);
        return;
      }

      const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
      if (!isNegativeSaleAllowed && matchedItem.trackInventory) {
        const itemStock = matchedItem.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
        if (itemStock <= 0) {
          toast({
            title: "Stock Alert",
            description: `Cannot add: ${matchedItem.description} is out of stock.`,
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: "Product Scanned",
        description: `Added: ${matchedItem.description}`,
        duration: 1200,
      });
      handleAddToCart(matchedItem);
      return;
    }

    if (tryWeighingScaleScan(barcode)) {
      return;
    }

    toast({
      title: "Barcode Not Found",
      description: `Could not find product matching: ${barcode}`,
      variant: "destructive"
    });
  };
  
  // Exact match search auto-add to cart
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;

    // Check scale scan first
    if (tryWeighingScaleScan(query)) {
      setSearchQuery("");
      return;
    }

    // Check variants first (SKU, Barcode)
    for (const item of items) {
      if (item.variants) {
        const matchedVariant = item.variants.find(
          v => v.barcode === query || v.sku === query
        );
        if (matchedVariant) {
          const matchesOrderType = orderType === "RETAIL"
            ? (item.itemType === "RETAIL" || item.itemType === "READY_PRODUCT")
            : item.itemType === "WHOLESALE";
          if (matchesOrderType) {
            const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
            if (!isNegativeSaleAllowed && item.trackInventory) {
              const variantStock = matchedVariant.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
              if (variantStock <= 0) {
                toast({
                  title: "Stock Alert",
                  description: `Cannot add: ${item.description} (${matchedVariant.color} / ${matchedVariant.size}) is out of stock.`,
                  variant: "destructive"
                });
                setSearchQuery("");
                return;
              }
            }

            toast({
              title: "SKU Found",
              description: `Added: ${item.description} (${matchedVariant.color} / ${matchedVariant.size})`,
              duration: 1200,
            });
            handleVariantAddToCart(item, matchedVariant);
            setSearchQuery("");
            return;
          }
        }
      }
    }

    // Check parent items (Code or Barcode)
    const matchedItem = items.find(i => i.code === query || i.barcode === query);
    if (matchedItem) {
      const matchesOrderType = orderType === "RETAIL"
        ? (matchedItem.itemType === "RETAIL" || matchedItem.itemType === "READY_PRODUCT")
        : matchedItem.itemType === "WHOLESALE";
      if (matchesOrderType) {
        // If the matched parent item has variants, open the SKU select options
        if (matchedItem.variants && matchedItem.variants.length > 0) {
          setSelectedItemForVariants(matchedItem);
          setSearchQuery("");
          return;
        }

        const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
        if (!isNegativeSaleAllowed && matchedItem.trackInventory) {
          const itemStock = matchedItem.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
          if (itemStock <= 0) {
            toast({
              title: "Stock Alert",
              description: `Cannot add: ${matchedItem.description} is out of stock.`,
              variant: "destructive"
            });
            setSearchQuery("");
            return;
          }
        }

        toast({
          title: "Product Found",
          description: `Added: ${matchedItem.description}`,
          duration: 1200,
        });
        handleAddToCart(matchedItem);
        setSearchQuery("");
        return;
      }
    }

    if (tryWeighingScaleScan(query)) {
      setSearchQuery("");
      return;
    }
  }, [searchQuery, items, orderType]);

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }

      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime > 150) {
        buffer = "";
      }

      lastKeyTime = currentTime;

      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }

      if (e.key === "Enter") {
        if (buffer.trim()) {
          handleBarcodeScan(buffer.trim());
          buffer = "";
          e.preventDefault();
        }
      } else {
        if (e.key.length === 1) {
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [items, orderType, isReturnMode]);




  const handlePrintLastBill = async () => {
    try {
      const res = await getLastSaleForUser();
      if (res?.success && res.saleId) {
        printInvoiceDirect(res.saleId);
      } else {
        toast({ title: "No Last Bill", description: "Could not find a recent sale for your account.", variant: "destructive" });
      }
    } catch(err) {
      toast({ title: "Error", description: "Failed to fetch last bill.", variant: "destructive" });
    }
  };

  const handleVoidSale = async () => {
    if(!actionSaleNumber) return toast({ title: "Error", description: "Sale Number is required", variant: "destructive" });
    setIsVoiding(true);
    try {
      const res = await voidSale(actionSaleNumber);
      if(res.success) {
        toast({ title: "Sale Voided", description: "The transaction has been successfully voided." });
        setIsVoidModalOpen(false);
        setActionSaleNumber('');
      } else {
        toast({ title: "Void Failed", description: res.error, variant: "destructive" });
      }
    } catch(err) {
      toast({ title: "Error", description: "An error occurred while voiding", variant: "destructive" });
    }
    setIsVoiding(false);
  };

  
  const handleBarcodeReturnScan = (query: string) => {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    
    let matchedVariant: any = null;
    let matchedItem: any = null;
    
    for (const item of items) {
      if (item.variants && item.variants.length > 0) {
        const v = item.variants.find(
          (varItem) =>
            varItem.sku.toLowerCase() === q ||
            (varItem.barcode && varItem.barcode.toLowerCase() === q)
        );
        if (v) {
          matchedVariant = v;
          matchedItem = item;
          break;
        }
      }
      if (item.code.toLowerCase() === q) {
        matchedItem = item;
        break;
      }
    }
    
    if (matchedVariant && matchedItem) {
      const exists = returnItemsState.find(
        (i) => i.itemId === matchedItem.id && i.variantId === matchedVariant.id
      );
      if (exists) {
        handleUpdateReturnQty(matchedItem.id, exists.returnQty + 1, matchedVariant.id);
      } else {
        setReturnItemsState((prev) => [
          ...prev,
          {
            itemId: matchedItem.id,
            variantId: matchedVariant.id,
            maxQty: 9999,
            returnQty: 1,
          },
        ]);
      }
      setBarcodeInput("");
      toast({ title: "Product Found", description: `${matchedItem.name} - ${matchedVariant.color} / ${matchedVariant.size} added to return list.` });
    } else if (matchedItem) {
      const exists = returnItemsState.find(
        (i) => i.itemId === matchedItem.id && !i.variantId
      );
      if (exists) {
        handleUpdateReturnQty(matchedItem.id, exists.returnQty + 1);
      } else {
        setReturnItemsState((prev) => [
          ...prev,
          {
            itemId: matchedItem.id,
            maxQty: 9999,
            returnQty: 1,
          },
        ]);
      }
      setBarcodeInput("");
      toast({ title: "Product Found", description: `${matchedItem.name} added to return list.` });
    } else {
      toast({ title: "Not Found", description: `No product or variant found matching: ${query}`, variant: "destructive" });
    }
  };

  const handleAddReturnItemsToCart = () => {
    const validReturnItems = returnItemsState.filter((r) => r.returnQty > 0);
    if (validReturnItems.length === 0) {
      toast({ title: "Warning", description: "No items selected for return.", variant: "destructive" });
      return;
    }

    const newCartEntries: CartItem[] = [];

    for (const rState of validReturnItems) {
      const item = items.find((i) => i.id === rState.itemId);
      if (item) {
        let variant: ItemVariant | undefined;
        if (rState.variantId && item.variants) {
          variant = item.variants.find((v) => v.id === rState.variantId);
        }

        const displayPrice = variant
          ? getBasePrice({ ...item, variantId: rState.variantId } as any, orderType)
          : getBasePrice(item, orderType);
        const cartKey = `${item.id}-${rState.variantId || "base"}-return`;

        newCartEntries.push({
          ...item,
          unitPrice: displayPrice,
          cartQuantity: rState.returnQty,
          variantId: rState.variantId,
          variantSku: variant?.sku,
          size: variant?.size,
          color: variant?.color,
          cartKey,
          isReturnItem: true,
          originalSaleId: returnSaleDetails?.id,
        });
      } else if (returnSaleDetails && returnSaleDetails.items) {
        const detailItem = returnSaleDetails.items.find(
          (i: any) => i.itemId === rState.itemId && (rState.variantId ? i.variantId === rState.variantId : !i.variantId)
        );
        if (detailItem) {
          const cartKey = `${detailItem.itemId}-${detailItem.variantId || "base"}-return`;
          newCartEntries.push({
            id: detailItem.itemId,
            code: detailItem.code || "RET",
            name: detailItem.description,
            description: detailItem.description,
            salesPrice: detailItem.unitPrice as any,
            itemType: "RETAIL",
            trackInventory: true,
            unitId: detailItem.unitId || "",
            cartQuantity: rState.returnQty,
            variantId: detailItem.variantId || undefined,
            variantSku: detailItem.variantSku || undefined,
            size: detailItem.size || undefined,
            color: detailItem.color || undefined,
            unitPrice: Number(detailItem.unitPrice),
            cartKey,
            isReturnItem: true,
            originalSaleId: returnSaleDetails.id,
          } as any);
        }
      }
    }

    if (newCartEntries.length === 0) {
      toast({ title: "Warning", description: "No valid return items found to add.", variant: "destructive" });
      return;
    }

    setCart((prev) => {
      const nonReturn = prev.filter((i) => !i.isReturnItem);
      return [...nonReturn, ...newCartEntries];
    });

    if (returnSaleDetails?.clientId) {
      setSelectedClientId(returnSaleDetails.clientId);
    } else if (returnCustomerId) {
      setSelectedClientId(returnCustomerId);
    }

    setIsExchangeMode(true);
    setIsReturnModalOpen(false);
    setReturnItemsState([]);
    setReturnSaleDetails(null);
    sonnerToast.success(`Exchange Items Added: ${newCartEntries.length} returned item(s) added to cart. Select new items from catalog.`, {
      position: "bottom-right",
    });
  };

  const handleFetchSaleForReturn = async (saleNum?: any) => {
    const saleNumberToFetch = (typeof saleNum === "string" && saleNum) ? saleNum : actionSaleNumber;
    if(!saleNumberToFetch) return toast({ title: "Error", description: "Sale Number is required", variant: "destructive" });
    setIsFetchingSale(true);
    setReturnSearchError(null);
    try {
      const res = await getSaleByNumber(saleNumberToFetch);
      if (res.success && res.sale) {
        const fetchedSale: any = res.sale;
        const isClientWholesale = !!(
          fetchedSale.client?.clientType === "wholesale" ||
          fetchedSale.client?.company?.toLowerCase().includes("wholesale") ||
          fetchedSale.client?.name?.toLowerCase().includes("wholesale") ||
          fetchedSale.client?.email?.toLowerCase().includes("wholesale") ||
          fetchedSale.client?.clientCode?.toLowerCase().includes("wholesale")
        );
        const hasWholesaleItems = fetchedSale.items?.some((i: any) => i.item?.itemType === "WHOLESALE");
        const isSaleWholesale = fetchedSale.orderType === "WHOLESALE" || isClientWholesale || hasWholesaleItems;
        const isCurrentWholesale = orderType === "WHOLESALE";

        if (isCurrentWholesale && !isSaleWholesale) {
          const msg = `Mode Mismatch: Invoice ${saleNumberToFetch} is a Retail invoice. Please switch POS mode to Retail to return this invoice.`;
          toast({
            title: "Mode Mismatch",
            description: msg,
            variant: "destructive"
          });
          setReturnSearchError(msg);
          setReturnSaleDetails(null);
          setReturnItemsState([]);
          setIsFetchingSale(false);
          return;
        } else if (!isCurrentWholesale && isSaleWholesale) {
          const msg = `Mode Mismatch: Invoice ${saleNumberToFetch} is a Wholesale invoice. Please switch POS mode to Wholesale to return this invoice.`;
          toast({
            title: "Mode Mismatch",
            description: msg,
            variant: "destructive"
          });
          setReturnSearchError(msg);
          setReturnSaleDetails(null);
          setReturnItemsState([]);
          setIsFetchingSale(false);
          return;
        }
        setReturnSearchError(null);
        setReturnSaleDetails(fetchedSale);
        setReturnItemsState(fetchedSale.items.map((i: any) => ({ itemId: i.itemId, variantId: i.variantId || undefined, maxQty: Number(i.quantity), returnQty: 0 })));
        if (fetchedSale.clientId) {
          setSelectedClientId(fetchedSale.clientId);
          setReturnCustomerId(fetchedSale.clientId);
        }
      } else {
        const msg = res.error || `Invoice "${saleNumberToFetch}" not found.`;
        toast({ title: "Not Found", description: msg, variant: "destructive" });
        setReturnSearchError(msg);
        setReturnSaleDetails(null);
      }
    } catch (err) {
      const msg = "Failed to fetch sale details. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setReturnSearchError(msg);
      setReturnSaleDetails(null);
    }
    setIsFetchingSale(false);
  };

  const handleToggleFullReturn = (checked: boolean) => {
    setIsFullReturnChecked(checked);
    if (checked && returnSaleDetails?.items) {
      setReturnItemsState(prev => prev.map(i => ({ ...i, returnQty: i.maxQty })));
    } else if (!checked) {
      setReturnItemsState(prev => prev.map(i => ({ ...i, returnQty: 0 })));
    }
  };

  const handleUpdateReturnQty = (itemId: string, qty: number, variantId?: string) => {
    setReturnItemsState(prev => {
      const updated = prev.map(i => {
        if (i.itemId === itemId && (variantId ? i.variantId === variantId : !i.variantId)) {
          return { ...i, returnQty: Math.min(Math.max(0, qty), i.maxQty) };
        }
        return i;
      });
      // Auto-check full return if all items are at maxQty, else uncheck
      const isAllMax = updated.length > 0 && updated.every(i => i.returnQty === i.maxQty && i.maxQty > 0);
      setIsFullReturnChecked(isAllMax);
      return updated;
    });
  };


  const handleProcessVoidReturn = async () => {
    const selectedItems = returnItemsState.filter(i => i.returnQty > 0).map(i => {
      const it = items.find(x => x.id === i.itemId);
      const price = it ? getBasePrice({ ...it, variantId: i.variantId } as any, orderType) : 0;
      return { 
        itemId: i.itemId, 
        variantId: i.variantId || undefined, 
        quantity: i.returnQty, 
        unitPrice: price 
      };
    });
    if(selectedItems.length === 0) return toast({ title: "Error", description: "Please select at least one item to return", variant: "destructive" });
    
    setIsReturning(true);
    try {
      const res = await processSaleReturn(null, selectedItems, selectedWarehouseId);
      const returnSale = (res as any).returnSale;
      if(res.success && returnSale) {
        const saleNum = returnSale.saleNumber;
        const saleId = returnSale.id;
        const refundAmt = Number(returnSale.grandTotal);
        setCompletedSaleNumber(saleNum);
        setCompletedSaleId(saleId || '');
        setChangeAmount(Math.abs(refundAmt));
        toast({ title: "Void Return Processed", description: `Return ${saleNum} created.` });
        setIsReturnModalOpen(false);
        setReturnItemsState([]);
        if (saleId) {
          printInvoiceDirect(saleId);
        }
        setIsChangeDialogOpen(true);
      } else {
        toast({ title: "Return Failed", description: res.error, variant: "destructive" });
      }
    } catch(err) {
      toast({ title: "Error", description: "An error occurred while processing return", variant: "destructive" });
    }
    setIsReturning(false);
  };

  const handleProcessReturn = async () => {
    const selectedItems = returnItemsState.filter(i => i.returnQty > 0).map(i => ({ 
      itemId: i.itemId, 
      variantId: i.variantId || undefined, 
      quantity: i.returnQty 
    }));
    if(selectedItems.length === 0) return toast({ title: "Error", description: "Please select at least one item to return", variant: "destructive" });
    
    setIsReturning(true);
    try {
      const res = await processSaleReturn(returnSaleDetails.id, selectedItems, undefined, refundMode);
      const returnSale = (res as any).returnSale;
      if(res.success && returnSale) {
        const saleNum = returnSale.saleNumber;
        const saleId = returnSale.id;
        const refundAmt = Number(returnSale.grandTotal);
        const details = (returnSale as any).paymentDetails;
        const arOffset = Number(details?.arOffsetAmount || 0);

        setCompletedSaleNumber(saleNum);
        setCompletedSaleId(saleId || '');
        setChangeAmount(Math.abs(refundAmt));
        
        toast({ 
          title: "Return Processed Successfully", 
          description: arOffset > 0 
            ? `Return ${saleNum}: ৳${arOffset.toFixed(2)} adjusted against Client Due, ৳${(Math.abs(refundAmt) - arOffset).toFixed(2)} refunded.` 
            : `Return ${saleNum} created for ৳${Math.abs(refundAmt).toFixed(2)}.`
        });
        
        setIsReturnModalOpen(false);
        setActionSaleNumber('');
        setReturnSaleDetails(null);
        setReturnItemsState([]);
        if (saleId) {
          printInvoiceDirect(saleId);
        }
        setIsChangeDialogOpen(true);
      } else {
        toast({ title: "Return Failed", description: res.error, variant: "destructive" });
      }
    } catch(err) {
      toast({ title: "Error", description: "An error occurred while processing return", variant: "destructive" });
    }
    setIsReturning(false);
  };


  const handleRecallCart = (heldCart: any) => {
    setCart(heldCart.cart);
    if (heldCart.clientId) {
      setSelectedClientId(heldCart.clientId);
      const client = clients.find(c => c.id === heldCart.clientId);
      const isWholesale = client
        ? !!(
            client.company?.toLowerCase().includes("wholesale") ||
            client.name?.toLowerCase().includes("wholesale") ||
            client.email?.toLowerCase().includes("wholesale") ||
            client.clientCode?.toLowerCase().includes("wholesale") ||
            client.clientType === 'wholesale'
          )
        : false;
      const newMode = isWholesale ? "WHOLESALE" : "RETAIL";
      setOrderType(newMode);
      
      const params = new URLSearchParams(window.location.search);
      params.set("mode", newMode);
      router.replace(`?${params.toString()}`);
    }
    setHeldCarts(heldCarts.filter((c: any) => c.id !== heldCart.id));
    deleteHeldCartAction(heldCart.id).catch(console.error);
    setIsHeldCartsModalOpen(false);
    toast({ title: "Cart Recalled", description: "Held cart has been restored." });
  };

  const handleDeleteHeldCart = (id: string) => {
    setHeldCarts(heldCarts.filter((c: any) => c.id !== id));
    deleteHeldCartAction(id).catch(console.error);
    if (heldCarts.length === 1) setIsHeldCartsModalOpen(false);
    toast({ title: "Held Cart Deleted", description: "The held cart was removed." });
  };

  const onAttemptDeleteHeldCart = (id: string) => {
    const isSecureHoldBillDeleteRequired = posSettings?.securePos && (posSettings?.securePosHoldBillDelete ?? true);
    if (isSecureHoldBillDeleteRequired && !holdBillDeletePermittedById) {
      setPendingDeleteHeldCartId(id);
      setIsHoldBillDeleteSecurityModalOpen(true);
      return;
    }
    handleDeleteHeldCart(id);
  };

  const handleHoldCart = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Nothing to hold.", variant: "destructive" });
      return;
    }
    const newHeldCart = {
      id: new Date().getTime().toString(),
      cart: [...cart],
      clientId: selectedClientId,
      amount: grandTotal
    };
    setHeldCarts((prev) => [...prev, newHeldCart]);
    saveHeldCartAction(newHeldCart).catch(console.error);
    handleNewSale(); // clear screen
    toast({ title: "Cart Held", description: "Current transaction put on hold." });
  };

  const handleNewSale = () => {
    try { localStorage.removeItem("pos_active_draft"); } catch (e) {}
    setIsChangeDialogOpen(false);
    setCart([]);
    setSearchQuery('');
    setDiscountAmount(0);
    setDiscountValue(0);
    setDiscountType("FLAT");
    setTaxPercent(0);
    setPaidAmount(0);
    setCashAmount(0);
    setCardAmount(0);
    setMfsAmount(0);
    setIsDueSale(false);
    setSuccessMsg('');
    setCompletedSaleNumber('');
    setCompletedSaleId('');
    setChangeAmount(0);
    setPromoCode('');
    setAppliedPromo(null);
    setPromoDiscountMsg('');
    const walkwayCustomer = clients.find(c => c.name?.toLowerCase() === "walkway customer");
    const walkwayId = walkwayCustomer?.id || walkwayCustomerId;
    
    if (orderType === "WHOLESALE") {
      const firstWholesale = clients.find(c => {
        return !!(
          c.company?.toLowerCase().includes("wholesale") ||
          c.name?.toLowerCase().includes("wholesale") ||
          c.email?.toLowerCase().includes("wholesale") ||
          c.clientCode?.toLowerCase().includes("wholesale") ||
          c.clientType === 'wholesale'
        );
      });
      if (firstWholesale) {
        setSelectedClientId(firstWholesale.id);
      } else {
        setSelectedClientId("");
      }
    } else {
      setSelectedClientId(walkwayId);
    }
  };

  const handleApplyPromo = async () => {
    if (posSettings?.allowCoupon === false) {
      toast({
        title: "Coupon Disabled",
        description: "Coupon feature is disabled in POS settings.",
        variant: "destructive"
      });
      return;
    }
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    toast({
      title: "Validating Coupon...",
      description: "Please wait while we verify your coupon code.",
    });

    const result = await validateCoupon(code, subTotal, selectedClientId);
    if (result.success && result.discountAmount !== undefined) {
      setDiscountAmount(result.discountAmount);
      setAppliedPromo(code);
      setPromoDiscountMsg(result.message || `Coupon applied!`);
      toast({
        title: "Coupon Applied!",
        description: result.message || `Discount of ৳${result.discountAmount.toFixed(2)} applied.`,
      });
    } else {
      toast({
        title: "Invalid Coupon",
        description: result.error || "The coupon code you entered is invalid.",
        variant: "destructive"
      });
    }
  };

  const handleRemovePromo = () => {
    setDiscountAmount(0);
    setAppliedPromo(null);
    setPromoDiscountMsg("");
    setPromoCode("");
    toast({
      title: "Promo Removed",
      description: "Coupon code has been removed."
    });
  };

  const printInvoiceDirect = (saleId: string) => {
    const oldIframe = document.getElementById('print-invoice-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    // Register callback for child iframe
    (window as any).triggerIframePrint = () => {
      const iframeElement = document.getElementById('print-invoice-iframe') as HTMLIFrameElement;
      if (iframeElement && iframeElement.contentWindow) {
        iframeElement.contentWindow.focus();
        iframeElement.contentWindow.print();
      }
    };

    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
    iframe.style.border = '0';
    iframe.src = `/print/invoice/${saleId}`;

    document.body.appendChild(iframe);

    // Fallback print triggers in case child script fails to call triggerIframePrint
    iframe.onload = () => {
      setTimeout(() => {
        const iframeElement = document.getElementById('print-invoice-iframe') as HTMLIFrameElement;
        if (iframeElement && iframeElement.contentWindow && (window as any).triggerIframePrint) {
          // If triggerIframePrint is still defined, it means it hasn't fired yet
          iframeElement.contentWindow.focus();
          iframeElement.contentWindow.print();
          delete (window as any).triggerIframePrint;
        }
      }, 3000);
    };
  };

  const handleProcessTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Warning",
        description: "Your cart is empty. Add items before processing.",
        variant: "destructive"
      });
      return;
    }
    const effectiveClientId = selectedClientId || walkwayCustomerId;
    if (!effectiveClientId) {
      toast({
        title: "Warning",
        description: "Customer selection is required to process transaction.",
        variant: "destructive"
      });
      return;
    }
    if (!selectedClientId && walkwayCustomerId) {
      setSelectedClientId(walkwayCustomerId);
    }
    if (!selectedWarehouseId) {
      toast({
        title: "Warning",
        description: "Warehouse selection is required.",
        variant: "destructive"
      });
      return;
    }
    setCashAmount(grandTotal > 0 ? grandTotal : 0);
    setCardAmount(0);
    setMfsAmount(0);
    setIsDueSale(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmOrder = async (overrides?: {
    cashAmount?: number;
    cardAmount?: number;
    mfsAmount?: number;
    cashAccountId?: string;
    cardAccountId?: string;
    mfsAccountId?: string;
    isDueSale?: boolean;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
    permittedById?: string;
  }) => {
    const effectivePointsRedeemed = overrides?.pointsRedeemed || 0;
    const effectivePointsDiscountAmount = overrides?.pointsDiscountAmount || 0;
    const effectiveCashAmount = overrides?.cashAmount ?? cashAmount;
    const effectiveCardAmount = overrides?.cardAmount ?? cardAmount;
    const effectiveMfsAmount = overrides?.mfsAmount ?? mfsAmount;
    const effectiveCashAccountId = overrides?.cashAccountId ?? cashAccountId;
    const effectiveCardAccountId = overrides?.cardAccountId ?? cardAccountId;
    const effectiveMfsAccountId = overrides?.mfsAccountId ?? mfsAccountId;
    const effectiveIsDueSale = overrides?.isDueSale ?? isDueSale;
    const effectivePermittedById = overrides?.permittedById || undefined;

    // Due sale customer checks
    const walkwayCustomer = clients.find(c => c.name?.toLowerCase() === "walkway customer");
    if (effectiveIsDueSale && (!selectedClientId || selectedClientId === walkwayCustomer?.id)) {
      toast({
        title: "Validation Error",
        description: "Due Sales are not allowed for Walkway Customer. Please select a registered customer.",
        variant: "destructive"
      });
      return;
    }

    if (discountLimitError) {
      toast({
        title: "Discount Limit Rule Violated",
        description: discountLimitError,
        variant: "destructive"
      });
      return;
    }

    // Payment validation
    const totalPaid = effectiveCashAmount + effectiveCardAmount + effectiveMfsAmount;
    if (!effectiveIsDueSale && totalPaid < roundedGrandTotal) {
      toast({
        title: "Validation Error",
        description: `Full payment of ৳${roundedGrandTotal.toFixed(2)} is required unless 'Due Sale' is enabled. Current paid amount is ৳${totalPaid.toFixed(2)}.`,
        variant: "destructive"
      });
      return;
    }

    if (effectiveIsDueSale && totalPaid > roundedGrandTotal) {
      toast({
        title: "Validation Error",
        description: `Paid amount (৳${totalPaid.toFixed(2)}) cannot exceed the Grand Total (৳${roundedGrandTotal.toFixed(2)}) for a Due Sale.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const saleItems = cart.map((item) => ({
        itemId: item.id,
        variantId: item.variantId || null,
        description: item.variantSku ? `${item.description} (${item.color} / ${item.size})` : item.description,
        quantity: item.cartQuantity,
        unitPrice: item.unitPrice,
        amount: item.unitPrice * item.cartQuantity,
      }));

      const primaryPaymentMethod = effectiveCashAmount > 0 ? effectiveCashAccountId : (effectiveCardAmount > 0 ? effectiveCardAccountId : (effectiveMfsAmount > 0 ? effectiveMfsAccountId : "SPLIT"));

      if (isExchangeMode) {
        const returnItems = cart
          .filter((i) => i.isReturnItem)
          .map((i) => ({
            itemId: i.id,
            variantId: i.variantId || undefined,
            quantity: i.cartQuantity,
            unitPrice: i.unitPrice,
            description: i.name,
          }));

        const newItems = cart
          .filter((i) => !i.isReturnItem)
          .map((i) => ({
            itemId: i.id,
            variantId: i.variantId || undefined,
            quantity: i.cartQuantity,
            unitPrice: i.unitPrice,
            description: i.name,
          }));

        const res = await processSaleExchange({
          clientId: selectedClientId,
          warehouseId: selectedWarehouseId,
          orderType: orderType as any,
          returnItems,
          newItems,
          discount: effectiveDiscountAmount,
          tax: tax,
          paymentDetails: {
            cashAmount: effectiveCashAmount,
            cashAccountId: effectiveCashAccountId || undefined,
            cardAmount: effectiveCardAmount,
            cardAccountId: effectiveCardAccountId || undefined,
            mfsAmount: effectiveMfsAmount,
            mfsAccountId: effectiveMfsAccountId || undefined,
          },
        });

        if (res.success && res.sale) {
          const saleNum = res.sale.saleNumber || "";
          const saleId = res.sale.id || "";
          setCompletedSaleNumber(saleNum);
          setCompletedSaleId(saleId);
          setCart([]);
          setIsExchangeMode(false);
          setIsConfirmModalOpen(false);
          toast({
            title: "Exchange Successful",
            description: `Exchange Order ${saleNum} processed successfully!`,
          });
          if (saleId) {
            printInvoiceDirect(saleId);
          }
          setIsChangeDialogOpen(true);
        } else {
          toast({
            title: "Error processing exchange",
            description: res.error || "Failed to process exchange.",
            variant: "destructive",
          });
        }
        setIsProcessing(false);
        return;
      }

      const res = await createSale({
        clientId: selectedClientId,
        warehouseId: selectedWarehouseId,
        date: new Date(),
        status: "COMPLETED",
        orderType: orderType as any,
        notes: `POS Sale - Paid via Split Payment${membershipDiscountAmount > 0 ? ` (Includes Membership Discount of ৳${membershipDiscountAmount.toFixed(2)})` : ""}`,
        tax: tax,
        discount: effectiveDiscountAmount + effectivePointsDiscountAmount,
        items: saleItems,
        couponCode: appliedPromo || undefined,
        paymentMethod: primaryPaymentMethod,
        salesAssistantId: salesAssistantId,
        permittedById: effectivePermittedById,
        paymentDetails: {
          cashAmount: effectiveCashAmount,
          cashAccountId: effectiveCashAccountId || null,
          cardAmount: effectiveCardAmount,
          cardAccountId: effectiveCardAccountId || null,
          mfsAmount: effectiveMfsAmount,
          mfsAccountId: effectiveMfsAccountId || null,
          pointsRedeemed: effectivePointsRedeemed,
          pointsDiscountAmount: effectivePointsDiscountAmount,
        }
      });

      if (res.success) {
        const saleNum = (res.sale as any)?.saleNumber || '';
        const saleId = (res.sale as any)?.id || '';
        setCompletedSaleNumber(saleNum);
        setCompletedSaleId(saleId || '');
        setChangeAmount(totalPaid - roundedGrandTotal);
        toast({
          title: "Success",
          description: `Order ${saleNum} processed successfully!`,
        });
        
        if (res.sale) {
          setCompletedSaleNumber(res.sale.saleNumber);
        }
        
        setCart([]);
        setIsConfirmModalOpen(false);
        if (saleId) {
          printInvoiceDirect(saleId);
        }
        setIsChangeDialogOpen(true);
      } else {
        toast({
          title: "Error processing sale",
          description: res.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create sale.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAllocated = useMemo(() => {
    return Number(Object.values(invoiceAllocations).reduce((sum, val) => sum + val, 0).toFixed(2));
  }, [invoiceAllocations]);

  const totalCollected = useMemo(() => {
    return Number((dueCashAmount + dueCardAmount + dueMfsAmount).toFixed(2));
  }, [dueCashAmount, dueCardAmount, dueMfsAmount]);

  const handleAutoAllocateFIFO = () => {
    let tempAmount = lumpSumAmount;
    const newAllocations: Record<string, number> = {};
    for (const sale of outstandingSales) {
      if (tempAmount <= 0) {
        newAllocations[sale.id] = 0;
      } else if (tempAmount >= sale.remainingDue) {
        newAllocations[sale.id] = sale.remainingDue;
        tempAmount = Number((tempAmount - sale.remainingDue).toFixed(2));
      } else {
        newAllocations[sale.id] = tempAmount;
        tempAmount = 0;
      }
    }
    setInvoiceAllocations(newAllocations);
    setDueCashAmount(lumpSumAmount);
    setDueCardAmount(0);
    setDueMfsAmount(0);
  };

  const printDueReceipt = (id: string) => {
    const oldIframe = document.getElementById("print-due-receipt-iframe");
    if (oldIframe) {
      oldIframe.remove();
    }

    (window as any).triggerIframePrint = () => {
      const iframeElement = document.getElementById("print-due-receipt-iframe") as HTMLIFrameElement;
      if (iframeElement && iframeElement.contentWindow) {
        iframeElement.contentWindow.focus();
        iframeElement.contentWindow.print();
      }
    };

    const iframe = document.createElement("iframe");
    iframe.id = "print-due-receipt-iframe";
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    iframe.style.border = "0";
    iframe.src = `/print/due-receipt/${id}`;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        const iframeElement = document.getElementById("print-due-receipt-iframe") as HTMLIFrameElement;
        if (iframeElement && iframeElement.contentWindow && (window as any).triggerIframePrint) {
          iframeElement.contentWindow.focus();
          iframeElement.contentWindow.print();
          delete (window as any).triggerIframePrint;
        }
      }, 3000);
    };
  };

  const handleSubmitDuePayment = async () => {
    if (!payDueClientId) return;

    const totalCollected = Number((dueCashAmount + dueCardAmount + dueMfsAmount).toFixed(2));
    const totalAllocated = Number(Object.values(invoiceAllocations).reduce((sum, amt) => sum + amt, 0).toFixed(2));

    if (totalCollected <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter payment amount to collect.",
        variant: "destructive"
      });
      return;
    }

    if (totalCollected > clientNetARBalance + 0.01) {
      toast({
        title: "Validation Error",
        description: `Over-receipt error: Total collected amount (৳${totalCollected.toFixed(2)}) cannot exceed customer's total net AR balance (৳${clientNetARBalance.toFixed(2)}).`,
        variant: "destructive"
      });
      return;
    }

    if (totalAllocated > totalCollected + 0.01) {
      toast({
        title: "Validation Error",
        description: `Allocated payment amount (৳${totalAllocated.toFixed(2)}) cannot exceed total paid amount (৳${totalCollected.toFixed(2)}).`,
        variant: "destructive"
      });
      return;
    }

    const activeAllocations = Object.entries(invoiceAllocations)
      .filter(([_, amt]) => amt > 0)
      .map(([saleId, amt]) => ({
        saleId,
        amountToPay: amt,
      }));

    setIsSubmittingDuePayment(true);
    try {
      const res = await collectCustomerDue({
        clientId: payDueClientId,
        cashAmount: dueCashAmount,
        cashAccountId: dueCashAccountId || undefined,
        cardAmount: dueCardAmount,
        cardAccountId: dueCardAccountId || undefined,
        mfsAmount: dueMfsAmount,
        mfsAccountId: dueMfsAccountId || undefined,
        allocations: activeAllocations,
      });

      if (res.success) {
        const receiptId = (res as any).voucherId || (res as any).collectionId;

        if (receiptId) {
          sonnerToast.success("Due payment collected successfully!", {
            action: {
              label: "Print Receipt",
              onClick: () => printDueReceipt(receiptId),
            },
            position: "bottom-right",
          });
          printDueReceipt(receiptId);
        } else {
          toast({
            title: "Success",
            description: "Due payment collected successfully!",
          });
        }

        setIsPayDueModalOpen(false);
        setPayDueClientId("");
        setOutstandingSales([]);
        setLumpSumAmount(0);
        setDueCashAmount(0);
        setDueCardAmount(0);
        setDueMfsAmount(0);
      } else {
        toast({
          title: "Error collecting due",
          description: (res as any).error || "Failed to process payment",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while collecting due.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDuePayment(false);
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.phone) return;

    setNewCustomerLoading(true);
    try {
      const res = await createClient({
        name: newCustomerData.name,
        email: newCustomerData.email || null,
        phone: newCustomerData.phone,
        company: newCustomerData.company,
        address: newCustomerData.address,
        status: "active",
        clientType: orderType === "WHOLESALE" ? "wholesale" : "regular",
        membershipTier: newCustomerData.membershipTier,
        membershipStatus: newCustomerData.membershipTier !== "NONE" ? "ACTIVE" : "INACTIVE"
      });

      if (res.success && res.client) {
        toast({
          title: "Success",
          description: "New client registered successfully!"
        });
        const newClientObj = res.client as Client;
        setClients(prev => [newClientObj, ...prev]);
        const updatedList = [newClientObj, ...clients];
        changeCustomerAndSyncMode(newClientObj.id, updatedList);
        setIsAddCustomerOpen(false);
        setNewCustomerData({
          name: "",
          email: "",
          phone: "",
          company: "",
          address: "",
          membershipTier: "NONE"
        });
      } else {
        toast({
          title: "Error",
          description: res.error || "Failed to create client",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Unexpected Error",
        description: "Failed to register new client.",
        variant: "destructive"
      });
    } finally {
      setNewCustomerLoading(false);
    }
  };

  useEffect(() => {
    if (!isChangeDialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleNewSale();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isChangeDialogOpen]);

  // Global Escape & F1 key shortcut to focus search input
  useEffect(() => {
    const handleEscapeFocus = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "F1") {
        if (
          isReturnModalOpen ||
          isConfirmModalOpen ||
          isHeldCartsModalOpen ||
          isVoidModalOpen ||
          isAddCustomerOpen ||
          isPayDueModalOpen ||
          isPrintDialogOpen ||
          isChangeDialogOpen ||
          !!selectedItemForVariants
        ) {
          return;
        }

        if (searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener("keydown", handleEscapeFocus);
    return () => {
      window.removeEventListener("keydown", handleEscapeFocus);
    };
  }, [
    isReturnModalOpen,
    isConfirmModalOpen,
    isHeldCartsModalOpen,
    isVoidModalOpen,
    isAddCustomerOpen,
    isPayDueModalOpen,
    isPrintDialogOpen,
    isChangeDialogOpen,
    selectedItemForVariants
  ]);

  const activeScreenType = searchParams.get("screen") || posSettings?.posScreenType || "standard";
  const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
  const computedTaxAmount = (posSettings?.allowTax ?? true) ? ((subTotal - discountAmount) * (taxPercent / 100)) : 0;

  const getItemLineUnitPrice = (item: any) => {
    return item.unitPrice || 0;
  };

  const handleDirectPaymentCheckout = async ({
    cashAmount: directCashAmount = 0,
    cardAmount: directCardAmount = 0,
    mfsAmount: directMfsAmount = 0,
    cashAccountId: directCashAccountId,
    cardAccountId: directCardAccountId,
    mfsAccountId: directMfsAccountId,
    isDueBill: directIsDueBill,
    pointsRedeemed: directPointsRedeemed = 0,
    pointsDiscountAmount: directPointsDiscountAmount = 0,
  }: {
    cashAmount?: number;
    cardAmount?: number;
    mfsAmount?: number;
    cashAccountId?: string;
    cardAccountId?: string;
    mfsAccountId?: string;
    isDueBill?: boolean;
    pointsRedeemed?: number;
    pointsDiscountAmount?: number;
  } = {}) => {
    if (cart.length === 0) {
      toast({
        title: "Warning",
        description: "Your cart is empty. Add items before processing.",
        variant: "destructive",
      });
      return;
    }
    const effectiveClientId = selectedClientId || walkwayCustomerId;
    if (!effectiveClientId) {
      toast({
        title: "Warning",
        description: "Customer selection is required.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedWarehouseId) {
      toast({
        title: "Warning",
        description: "Warehouse selection is required.",
        variant: "destructive",
      });
      return;
    }

    setCashAmount(directCashAmount);
    setCardAmount(directCardAmount);
    setMfsAmount(directMfsAmount);
    if (directCashAccountId) setCashAccountId(directCashAccountId);
    if (directCardAccountId) setCardAccountId(directCardAccountId);
    if (directMfsAccountId) setMfsAccountId(directMfsAccountId);
    await handleConfirmOrder({
      cashAmount: directCashAmount,
      cardAmount: directCardAmount,
      mfsAmount: directMfsAmount,
      cashAccountId: directCashAccountId || cashAccountId,
      cardAccountId: directCardAccountId || cardAccountId,
      mfsAccountId: directMfsAccountId || mfsAccountId,
      isDueSale: directIsDueBill ?? isDueSale,
      pointsRedeemed: directPointsRedeemed,
      pointsDiscountAmount: directPointsDiscountAmount,
    });
  };

  return (
    <>
      {activeScreenType === "modern" ? (
        <POSScreenModern
          items={items}
          filteredItems={filteredItems}
          tryWeighingScaleScan={tryWeighingScaleScan}
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          setSelectedWarehouseId={setSelectedWarehouseId}
          currentUser={currentUser}
          orderType={orderType}
          isWholesaleAllowed={isWholesaleAllowed}
          updateOrderMode={updateOrderMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchInputRef={searchInputRef}
          onExitPOS={() => router.push("/dashboard/sales")}
          clients={clients}
          clientOptions={clientOptions}
          selectedClientId={selectedClientId}
          changeCustomerAndSyncMode={changeCustomerAndSyncMode}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          appliedPromo={appliedPromo}
          handleApplyPromo={handleApplyPromo}
          handleRemovePromo={handleRemovePromo}
          cart={cart}
          getItemDiscount={getItemDiscount}
          getItemLineUnitPrice={getItemLineUnitPrice}
          handleAddToCart={handleAddToCart}
          handleUpdateQuantity={handleUpdateQuantity}
          handleCustomQuantitySet={handleCustomQuantitySet}
          handleRemoveItem={handleRemoveItem}
          isNegativeSaleAllowed={isNegativeSaleAllowed}
          paymentAccounts={paymentAccounts}
          itemCount={cart.reduce((acc, i) => acc + (i.cartQuantity || 1), 0)}
          subTotal={subTotal}
          discountAmount={discountAmount}
          setDiscountAmount={setDiscountAmount}
          taxAmount={computedTaxAmount}
          taxPercent={taxPercent}
          grandTotal={grandTotal}
          previousCustomerDue={previousCustomerDue}
          onConfirmDirectPayment={handleDirectPaymentCheckout}
          isExchangeMode={isExchangeMode}
          heldCartsCount={heldCarts.length}
          hasLastSale={hasLastSale}
          completedSaleNumber={completedSaleNumber}
          onReturnClick={() => {
            setActionSaleNumber("");
            if (selectedClientId) setReturnCustomerId(selectedClientId);
            setIsReturnModalOpen(true);
          }}
          onExchangeClick={() => {
            if (isExchangeMode) {
              setIsExchangeMode(false);
              setCart((prev) => prev.filter((i) => !i.isReturnItem));
              sonnerToast.info(
                "Exchange Mode Deactivated: Switched to standard POS sale.",
                {
                  position: "bottom-right",
                }
              );
            } else {
              setIsExchangeMode(true);
              setActionSaleNumber("");
              if (selectedClientId) setReturnCustomerId(selectedClientId);
              setIsReturnModalOpen(true);
              sonnerToast.success(
                "Exchange Mode Active: Select returned items from modal or barcode scanner.",
                {
                  position: "bottom-right",
                }
              );
            }
          }}
          onCollectDueClick={() => {
            setPayDueClientId("");
            setOutstandingSales([]);
            setIsPayDueModalOpen(true);
          }}
          onHoldClick={() => {
            if (cart.length > 0) handleHoldCart();
            else if (heldCarts.length > 0) setIsHeldCartsModalOpen(true);
            else toast({ title: "Hold", description: "No carts held." });
          }}
          onRefreshClick={() => {
            handleNewSale();
            toast({ title: "Refreshed", description: "POS reset successfully" });
          }}
          onLastBillClick={handlePrintLastBill}
          posSettings={posSettings}
          membershipSettings={membershipSettings}
        />
      ) : (
        <POSScreenStandard
          items={items}
          filteredItems={filteredItems}
          categories={categories}
          filterType={filterType}
          setFilterType={setFilterType}
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          setSelectedWarehouseId={setSelectedWarehouseId}
          currentUser={currentUser}
          orderType={orderType}
          isWholesaleAllowed={isWholesaleAllowed}
          updateOrderMode={updateOrderMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchInputRef={searchInputRef}
          onExitPOS={() => router.push("/dashboard/sales")}
          clients={clients}
          clientOptions={clientOptions}
          selectedClientId={selectedClientId}
          changeCustomerAndSyncMode={changeCustomerAndSyncMode}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          cart={cart}
          getItemDiscount={getItemDiscount}
          handleAddToCart={handleAddToCart}
          handleUpdateQuantity={handleUpdateQuantity}
          handleCustomQuantitySet={handleCustomQuantitySet}
          handleRemoveItem={handleRemoveItem}
          posSettings={posSettings}
          itemCount={cart.reduce((acc, i) => acc + (i.cartQuantity || 1), 0)}
          subTotal={subTotal}
          discountAmount={discountAmount}
          taxAmount={computedTaxAmount}
          taxPercent={taxPercent}
          grandTotal={grandTotal}
          appliedPromo={appliedPromo}
          promoDiscountMsg={promoDiscountMsg}
          onProcessTransaction={handleProcessTransaction}
          isExchangeMode={isExchangeMode}
          heldCartsCount={heldCarts.length}
          hasLastSale={hasLastSale}
          completedSaleNumber={completedSaleNumber}
          onReturnClick={() => {
            setActionSaleNumber("");
            if (selectedClientId) setReturnCustomerId(selectedClientId);
            setIsReturnModalOpen(true);
          }}
          onExchangeClick={() => {
            if (isExchangeMode) {
              setIsExchangeMode(false);
              setCart((prev) => prev.filter((i) => !i.isReturnItem));
              sonnerToast.info(
                "Exchange Mode Deactivated: Switched to standard POS sale.",
                {
                  position: "bottom-right",
                }
              );
            } else {
              setIsExchangeMode(true);
              setActionSaleNumber("");
              if (selectedClientId) setReturnCustomerId(selectedClientId);
              setIsReturnModalOpen(true);
              sonnerToast.success(
                "Exchange Mode Active: Select returned items from modal or barcode scanner.",
                {
                  position: "bottom-right",
                }
              );
            }
          }}
          onCollectDueClick={() => {
            setPayDueClientId("");
            setOutstandingSales([]);
            setIsPayDueModalOpen(true);
          }}
          onHoldClick={() => {
            if (cart.length > 0) handleHoldCart();
            else if (heldCarts.length > 0) setIsHeldCartsModalOpen(true);
            else toast({ title: "Hold", description: "No carts held." });
          }}
          onRefreshClick={() => {
            handleNewSale();
            toast({ title: "Refreshed", description: "POS reset successfully" });
          }}
          onLastBillClick={handlePrintLastBill}
        />
      )}

      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-6xl p-0 overflow-hidden bg-card text-card-foreground border border-border">
          <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
            {/* Left side: Order Items Summary list */}
            <div className="flex-1 bg-muted/20 p-6 overflow-y-auto border-r border-border">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-bold text-foreground">Confirm Order Items</DialogTitle>
              </DialogHeader>
              <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold w-10"></th>
                      <th className="text-left py-3 px-4 font-semibold">Item</th>
                      <th className="text-center py-3 px-4 font-semibold w-16">Qty</th>
                      <th className="text-right py-3 px-4 font-semibold">Price</th>
                      <th className="text-right py-3 px-4 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedCart.map((item) => (
                      <tr key={item.cartKey} className="hover:bg-muted/10 transition-colors">
                        <td className="py-2 px-4">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-muted-foreground text-center px-0.5 truncate">{item.code}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.isReturnItem ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/30 rounded uppercase tracking-wide">
                                🔴 Return
                              </span>
                            ) : isExchangeMode ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded uppercase tracking-wide">
                                🟢 New Item
                              </span>
                            ) : null}
                            <span className="font-semibold text-foreground">{item.description}</span>
                          </div>
                          {item.variantSku && (
                            <div className="flex gap-1 mt-1">
                              <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-foreground rounded font-medium">{item.color}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-foreground rounded font-medium">{item.size}</span>
                            </div>
                          )}
                        </td>
                        <td className="text-center py-3 px-4 font-bold">
                          <span className={item.isReturnItem ? "text-rose-600" : "text-foreground"}>
                            {item.isReturnItem ? `-${item.cartQuantity}` : item.cartQuantity}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-muted-foreground">৳{item.unitPrice.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 font-bold">
                          <span className={item.isReturnItem ? "text-rose-600" : "text-foreground"}>
                            {item.isReturnItem ? `-৳${(item.cartQuantity * item.unitPrice).toFixed(2)}` : `৳${(item.cartQuantity * item.unitPrice).toFixed(2)}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/40 border-t-2 border-border font-bold">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-left">
                        <span className="text-xs text-muted-foreground font-medium">Total Line Items: </span>
                        <span className="text-sm font-bold text-foreground">{sortedCart.length}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-foreground font-bold text-sm">
                        {sortedCart.reduce((acc, item) => acc + (item.isReturnItem ? -item.cartQuantity : item.cartQuantity), 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-xs font-semibold">Subtotal:</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground text-sm">
                        ৳{subTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Right side: Payment Details, Promo Codes, Paid Amount, Balance Displays */}
            <div className="w-full md:w-[400px] bg-background p-6 flex flex-col justify-between border-t md:border-t-0 border-border">
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Coupon Code Section */}
                {(posSettings?.allowCoupon ?? true) && (
                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block mb-2"><span className="flex items-center gap-2"><FaTicketAlt /> Promo / Coupon Code</span></label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Enter coupon code..." 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        disabled={!!appliedPromo}
                        className="h-9 text-xs bg-background"
                      />
                      {appliedPromo ? (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={handleRemovePromo}
                          className="h-9 px-3 shrink-0"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleApplyPromo}
                          className="h-9 px-3 shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                    {appliedPromo && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-green-600 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded">
                        <span className="font-bold">Code: {appliedPromo}</span>
                        <span>{promoDiscountMsg}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Manual Discount & Tax */}
                <div className="grid grid-cols-2 gap-3">
                  {(posSettings?.allowDiscount ?? true) ? (
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Manual Discount</label>
                      <div className="flex gap-1.5">
                        <Select
                          value={discountType}
                          onValueChange={(value: "FLAT" | "PERCENTAGE") => {
                            setDiscountType(value);
                            setDiscountValue(0);
                            if (appliedPromo) {
                              setAppliedPromo(null);
                              setPromoDiscountMsg("");
                            }
                          }}
                        >
                          <SelectTrigger className="w-[65px] h-9 text-xs shrink-0">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FLAT" className="text-xs">৳</SelectItem>
                            <SelectItem value="PERCENTAGE" className="text-xs">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          type="number" 
                          value={discountValue || ""}
                          onChange={(e) => {
                            setDiscountValue(Number(e.target.value) || 0);
                            if (appliedPromo) {
                              setAppliedPromo(null);
                              setPromoDiscountMsg("");
                            }
                          }}
                          placeholder="0"
                          className={`h-9 text-xs font-semibold ${
                            discountLimitError 
                              ? "border-rose-500 text-rose-600 focus-visible:ring-rose-500 bg-rose-500/10 dark:bg-rose-950/20" 
                              : "bg-background border-border"
                          }`}
                        />
                      </div>
                      {discountLimitError && (
                        <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                          <FaExclamationTriangle className="w-3 h-3 shrink-0" />
                          <span>{discountLimitError}</span>
                        </div>
                      )}
                    </div>
                  ) : <div></div>}
                  {(posSettings?.allowTax ?? true) && (
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">TAX</label>
                      <div className="text-sm font-medium text-foreground">৳{tax.toFixed(2)}</div>
                    </div>
                  )}
                </div>

                {/* Sales Assistant Section */}
                <div className="bg-muted/40 p-3.5 rounded-xl border border-border">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1.5">
                    <FaUsers className="text-muted-foreground" /> Sales Assistant
                  </label>
                  <SearchableSelect
                    options={assistantOptions}
                    value={salesAssistantId}
                    onValueChange={(val) => setSalesAssistantId(val)}
                    placeholder="Select Sales Assistant..."
                    searchPlaceholder="Search assistant..."
                    className="w-full h-9 text-xs bg-background"
                    allowClear={true}
                  />
                </div>

                {/* Due Sale Checkbox */}
                {(posSettings?.allowDueSale ?? true) && (
                  <div className="flex items-center gap-2 bg-muted/20 border border-border p-2.5 rounded-xl">
                    <input
                      type="checkbox"
                      id="due-sale-checkbox"
                      checked={isDueSale}
                      disabled={selectedClientId === walkwayCustomerId || selectedClientId === clients.find(c => c.name?.toLowerCase() === "walkway customer")?.id}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsDueSale(checked);
                        if (checked) {
                          setCashAmount(0);
                          setCardAmount(0);
                          setMfsAmount(0);
                        } else {
                          setCashAmount(Math.max(0, roundedGrandTotal - (cardAmount + mfsAmount)));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label 
                      htmlFor="due-sale-checkbox" 
                      className={`text-xs font-bold text-foreground select-none ${
                        (selectedClientId === walkwayCustomerId || selectedClientId === clients.find(c => c.name?.toLowerCase() === "walkway customer")?.id)
                          ? "opacity-50 cursor-not-allowed" 
                          : "cursor-pointer"
                      }`}
                    >
                      Due Sale (Allow credit / partial payment)
                    </label>
                  </div>
                )}

                {/* Payment Method Select Dropdown & Inputs */}
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Payment Split</span>
                  
                  {/* Cash Row */}
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <label className="text-xs font-semibold text-foreground w-[50px] shrink-0">Cash:</label>
                    <div className="grid grid-cols-[1fr_110px] gap-2 flex-1 min-w-0">
                      <Select value={cashAccountId} onValueChange={(val) => setCashAccountId(val)}>
                        <SelectTrigger className="h-9 text-xs bg-background border-border w-full truncate">
                          <SelectValue placeholder="Select Cash" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPaymentAccounts
                            .filter((acc) => acc.type === "CASH")
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                {acc.code ? `${acc.code} - ` : ""}{acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-full">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">৳</span>
                        <Input
                          type="number"
                          value={cashAmount || ""}
                          onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                          className="h-9 text-xs font-medium pl-6 bg-background text-right w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Row */}
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <label className="text-xs font-semibold text-foreground w-[50px] shrink-0">Card:</label>
                    <div className="grid grid-cols-[1fr_110px] gap-2 flex-1 min-w-0">
                      <Select value={cardAccountId} onValueChange={(val) => setCardAccountId(val)}>
                        <SelectTrigger className="h-9 text-xs bg-background border-border w-full truncate">
                          <SelectValue placeholder="Select Card / Bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPaymentAccounts
                            .filter((acc) => acc.type === "BANK")
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                {acc.code ? `${acc.code} - ` : ""}{acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-full">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">৳</span>
                        <Input
                          type="number"
                          value={cardAmount || ""}
                          onChange={(e) => {
                            const newCard = Number(e.target.value) || 0;
                            setCardAmount(newCard);
                            if (!isDueSale) {
                              setCashAmount(Math.max(0, roundedGrandTotal - (newCard + mfsAmount)));
                            }
                          }}
                          className="h-9 text-xs font-medium pl-6 bg-background text-right w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MFS Row */}
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <label className="text-xs font-semibold text-foreground w-[50px] shrink-0">MFS:</label>
                    <div className="grid grid-cols-[1fr_110px] gap-2 flex-1 min-w-0">
                      <Select value={mfsAccountId} onValueChange={(val) => setMfsAccountId(val)}>
                        <SelectTrigger className="h-9 text-xs bg-background border-border w-full truncate">
                          <SelectValue placeholder="Select Wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPaymentAccounts
                            .filter((acc) => acc.type === "WALLET")
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                {acc.code ? `${acc.code} - ` : ""}{acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-full">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">৳</span>
                        <Input
                          type="number"
                          value={mfsAmount || ""}
                          onChange={(e) => {
                            const newMfs = Number(e.target.value) || 0;
                            setMfsAmount(newMfs);
                            if (!isDueSale) {
                              setCashAmount(Math.max(0, roundedGrandTotal - (cardAmount + newMfs)));
                            }
                          }}
                          className="h-9 text-xs font-medium pl-6 bg-background text-right w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paid Amount Display & Quick cash helpers */}
                <div className="pt-2 border-t border-border/40">
                  {/* Quick Cash Payment Shortcuts */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Quick Cash Shortcuts</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[50, 100, 500, 1000].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium px-2.5 border-border bg-muted/20 hover:bg-muted"
                          onClick={() => setCashAmount((prev) => prev + amt)}
                        >
                          +৳{amt}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-2.5 border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => {
                          setCashAmount(grandTotal);
                          setCardAmount(0);
                          setMfsAmount(0);
                        }}
                      >
                        Exact
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-2.5 border-destructive/20 text-destructive hover:bg-destructive/10"
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

                {/* Real-time Change / Due Displays */}
                <div className="pt-2">
                  {paidAmount >= roundedGrandTotal ? (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-3 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wide">Change to Return:</span>
                      <span className="text-lg font-black">৳{(paidAmount - roundedGrandTotal).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wide">Remaining Due:</span>
                      <span className="text-lg font-black">৳{(roundedGrandTotal - paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Price Summary Breakdown */}
                <div className="pt-3 border-t border-border space-y-1.5">
                  {isExchangeMode && (
                    <>
                      <div className="flex justify-between text-xs font-semibold text-rose-600">
                        <span>Returned Subtotal:</span>
                        <span>-৳{cart.filter((i) => i.isReturnItem).reduce((acc, i) => acc + i.unitPrice * i.cartQuantity, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-emerald-600">
                        <span>New Items Subtotal:</span>
                        <span>+৳{cart.filter((i) => !i.isReturnItem).reduce((acc, i) => acc + i.unitPrice * i.cartQuantity, 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>{isExchangeMode ? "Net Subtotal:" : "Subtotal:"}</span>
                    <span>৳{subTotal.toFixed(2)}</span>
                  </div>
                  {appliedPromo || discountAmount > 0 || manualDiscountAmount > 0 ? (
                    <div className="flex justify-between text-xs font-semibold text-green-600">
                      <span>Discount{appliedPromo ? ` (${appliedPromo})` : ""}:</span>
                      <span>-৳{(appliedPromo || discountAmount > 0 ? discountAmount : manualDiscountAmount).toFixed(2)}</span>
                    </div>
                  ) : null}
                  {membershipDiscountAmount > 0 && matchedMembershipTier && (
                    <div className="flex justify-between text-xs font-semibold text-amber-600">
                      <span>Membership Discount ({matchedMembershipTier.name} - {Number(matchedMembershipTier.discountPercentage).toFixed(1)}%):</span>
                      <span>-৳{membershipDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {matchedMembershipTier && membershipDiscountAmount === 0 && Number(matchedMembershipTier.minPurchaseValue || 0) > 0 && (
                    <div className="flex justify-between text-[11px] text-amber-600/70 italic">
                      <span>{matchedMembershipTier.name} Min Purchase:</span>
                      <span>৳{Number(matchedMembershipTier.minPurchaseValue).toLocaleString()}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Tax:</span>
                      <span>৳{tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-foreground pt-1.5 border-t border-dashed border-border">
                    <span>Grand Total (Round):</span>
                    <span>৳{roundedGrandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-amber-600 pt-1.5 border-t border-dashed border-border">
                    <span>Previous Due:</span>
                    <span>৳{previousCustomerDue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-destructive">
                    <span>Total Due:</span>
                    <span>৳{(previousCustomerDue + (isReturnMode ? 0 : Math.max(0, roundedGrandTotal - paidAmount))).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                <Button 
                  className={`flex-1 rounded-xl text-white font-semibold transition-all ${
                    isProcessing || !!discountLimitError
                      ? 'bg-slate-700 text-muted-foreground opacity-60 cursor-not-allowed'
                      : paidAmount >= roundedGrandTotal 
                      ? 'bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/15' 
                      : 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/15'
                  }`} 
                  onClick={() => handleConfirmOrder()} 
                  disabled={isProcessing || !!discountLimitError}
                >
                  {isProcessing ? "Processing..." : paidAmount >= roundedGrandTotal ? "Confirm & Pay" : "Confirm (Part Paid)"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintDialogOpen} onOpenChange={(open) => {
        setIsPrintDialogOpen(open);
        if (!open) {
          setIsChangeDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-center flex items-center gap-2 justify-center">
              <FaPrint className="text-primary animate-pulse" /> Print Invoice ({completedSaleNumber})
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 bg-muted/30">
            {completedSaleId ? (
              <iframe
                src={`/print/invoice/${completedSaleId}`}
                className="w-full h-[500px] border rounded-md shadow-sm bg-white"
                id="pos-print-iframe"
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                Loading receipt preview...
              </div>
            )}
          </div>
          <div className="p-4 border-t flex gap-3 bg-background">
            <Button
              className="flex-1 h-11 text-base font-semibold"
              onClick={() => {
                setIsPrintDialogOpen(false);
                setIsChangeDialogOpen(true);
              }}
            >
              Done & View Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeDialogOpen} onOpenChange={(open) => { if (!open) handleNewSale(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">
              <span className="flex items-center gap-2 justify-center">
                <FaMoneyBillWave className={changeAmount < -0.001 ? "text-amber-500" : "text-emerald-500"} />
                {changeAmount < -0.001 ? "Due Amount" : "Change Amount"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className={`text-5xl font-black mb-2 ${changeAmount < -0.001 ? 'text-amber-500' : 'text-emerald-500'}`}>
              ৳{Math.abs(changeAmount).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-5">
              {changeAmount < -0.001
                ? "Remaining due balance recorded for this transaction."
                : "Change to return to customer."}
            </p>
            <Button className="w-full h-12 text-base font-semibold" onClick={handleNewSale}>New Sale (Press Enter)</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedItemForVariants} onOpenChange={(open) => !open && setSelectedItemForVariants(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select SKUs (Add Multiple)</DialogTitle>
          </DialogHeader>
          {selectedItemForVariants && (
            <div className="space-y-4">
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 divide-y divide-border">
                {selectedItemForVariants.variants
                  ?.filter((v) => {
                    const isNegativeSaleAllowed = posSettings?.allowNegativeSale ?? false;
                    if (isNegativeSaleAllowed) return true;
                    if (!selectedItemForVariants.trackInventory) return true;
                    const variantStock = v.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0;
                    return variantStock > 0;
                  })
                  ?.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-md overflow-hidden relative flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
                        {v.imageUrl || selectedItemForVariants.imageUrl ? (
                          <img src={v.imageUrl || selectedItemForVariants.imageUrl || undefined} alt={v.sku} className="object-cover w-full h-full" />
                        ) : (
                          <span>{v.sku.slice(-4)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{v.color} / {v.size}</p>
                        <p className="text-xs text-muted-foreground">SKU: {v.sku}</p>
                        {v.stocks && (
                          <p className="text-[10px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wide">
                            Stock: <span className="font-bold text-foreground ml-1 bg-muted px-1.5 py-0.5 rounded">{v.stocks.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all rounded-full flex gap-1"
                      onClick={() => {
                        handleVariantAddToCart(selectedItemForVariants, v);
                        toast({
                          title: "SKU Added",
                          description: `Added ${v.color} / ${v.size} to cart.`,
                          duration: 1200,
                        });
                      }}
                    >
                      <FaPlus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter className="pt-2 border-t">
                <Button variant="secondary" onClick={() => setSelectedItemForVariants(null)}>
                  Close (Esc)
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle><span className="flex items-center gap-2"><FaUsers /> Add New {orderType === "WHOLESALE" ? "Wholesale" : "Retail"} Customer</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
              <Input 
                value={newCustomerData.name}
                onChange={e => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Walkin Customer"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
              <Input 
                type="email"
                value={newCustomerData.email}
                onChange={e => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="customer@domain.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone *</label>
              <Input 
                value={newCustomerData.phone}
                onChange={e => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+8801XXXXXXXXX"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Company</label>
              <Input 
                value={newCustomerData.company}
                onChange={e => setNewCustomerData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company Name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Address</label>
              <Input 
                value={newCustomerData.address}
                onChange={e => setNewCustomerData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Dhaka, Bangladesh"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Membership Type</label>
              <Select
                value={newCustomerData.membershipTier}
                onValueChange={value => setNewCustomerData(prev => ({ ...prev, membershipTier: value }))}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select Membership Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">None</SelectItem>
                  <SelectItem value="BRONZE" className="text-xs">Bronze</SelectItem>
                  <SelectItem value="SILVER" className="text-xs">Silver</SelectItem>
                  <SelectItem value="GOLD" className="text-xs">Gold</SelectItem>
                  <SelectItem value="PLATINUM" className="text-xs">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={newCustomerLoading}>
                {newCustomerLoading ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      
      {/* Unified Return Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={(open) => { 
        setIsReturnModalOpen(open); 
        if(!open) { 
          setReturnSaleDetails(null); 
          setReturnItemsState([]); 
          setBarcodeInput(""); 
          if (isExchangeMode && cart.filter(i => i.isReturnItem).length === 0) {
            setIsExchangeMode(false);
            sonnerToast.info("Exchange Mode Exited", { position: "bottom-right" });
          }
        } 
      }}>
        <DialogContent className="sm:max-w-6xl h-[85vh] max-h-[85vh] overflow-y-auto">
          <Tabs defaultValue="void-return" className="w-full">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
              <DialogTitle className="text-xl font-bold tracking-tight">Process Return</DialogTitle>
              <TabsList className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <TabsTrigger value="void-return" className="font-semibold text-xs py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md shadow-sm">Void Return (By Product)</TabsTrigger>
                <TabsTrigger value="invoice-return" className="font-semibold text-xs py-1.5 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md shadow-sm">Return (By Invoice/Customer)</TabsTrigger>
              </TabsList>
            </DialogHeader>
            
            <TabsContent value="void-return" className="py-2">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-2">Search Product or Scan Barcode / SKU</label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <SearchableSelect 
                        options={returnProductOptions}
                        value=""
                        onValueChange={(val) => {
                          if(val) {
                            const [itemId, variantId] = val.split(':');
                            const item = items.find(i => i.id === itemId);
                            if(item) {
                              const exists = returnItemsState.find(i => i.itemId === itemId && (variantId ? i.variantId === variantId : !i.variantId));
                              if(!exists) {
                                setReturnItemsState(prev => [...prev, { itemId, variantId, maxQty: 9999, returnQty: 1 }]);
                              } else {
                                handleUpdateReturnQty(itemId, exists.returnQty + 1, variantId);
                              }
                            }
                          }
                        }}
                        placeholder="Search products, variants or barcodes..."
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold w-10"></th>
                        <th className="text-left py-3 px-4 font-semibold">Item</th>
                        <th className="text-center py-3 px-4 font-semibold w-32">Qty</th>
                        <th className="text-right py-3 px-4 font-semibold">Price</th>
                        <th className="text-right py-3 px-4 font-semibold">Total</th>
                        <th className="text-center py-3 px-4 font-semibold w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {returnItemsState.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-muted-foreground font-medium">
                            <FaShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            No items added to return list yet. Use the search bar above.
                          </td>
                        </tr>
                      ) : (
                        returnItemsState.map((state) => {
                          const item = items.find(i => i.id === state.itemId);
                          if(!item) return null;
                          const variant = state.variantId ? item.variants?.find(v => v.id === state.variantId) : null;
                          const label = item.name || item.description;
                          const price = getBasePrice({ ...item, variantId: state.variantId } as any, orderType);
                          const total = price * state.returnQty;
                          return (
                            <tr key={`${state.itemId}-${state.variantId || 'none'}`} className="hover:bg-muted/5 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={label} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground text-center px-0.5 truncate">{item.code}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-semibold text-foreground">{label}</span>
                                {variant && (
                                  <div className="flex gap-1 mt-1">
                                    <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-foreground rounded font-medium">{variant.color}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-foreground rounded font-medium">{variant.size}</span>
                                    {variant.sku && <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-muted-foreground font-mono rounded">{variant.sku}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-2 w-[124px] mx-auto shrink-0">
                                  <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => handleUpdateReturnQty(state.itemId, state.returnQty - 1, state.variantId)}>-</Button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={state.returnQty === 0 ? "" : state.returnQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      handleUpdateReturnQty(state.itemId, isNaN(val) ? 0 : val, state.variantId);
                                    }}
                                    className="text-sm font-semibold w-14 text-center text-foreground bg-background border border-border/80 rounded-md outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5 px-0.5 m-0"
                                  />
                                  <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => handleUpdateReturnQty(state.itemId, state.returnQty + 1, state.variantId)}>+</Button>
                                </div>
                              </td>
                              <td className="text-right py-2.5 px-4 text-muted-foreground font-semibold">৳{price.toFixed(2)}</td>
                              <td className="text-right py-2.5 px-4 font-bold text-foreground">৳{total.toFixed(2)}</td>
                              <td className="text-center py-2.5 px-4">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg" onClick={() => setReturnItemsState(prev => prev.filter(i => !(i.itemId === state.itemId && i.variantId === state.variantId)))}>
                                  <FaTrashAlt className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => { 
                    setIsReturnModalOpen(false); 
                    setReturnItemsState([]); 
                    setBarcodeInput(""); 
                    if (isExchangeMode && cart.filter(i => i.isReturnItem).length === 0) {
                      setIsExchangeMode(false);
                      sonnerToast.info("Exchange Mode Exited", { position: "bottom-right" });
                    }
                  }}>Cancel</Button>
                  <Button className="bg-[#d97706] text-white hover:bg-[#d97706]/90 border border-[#d97706]/20 font-bold shadow-sm" onClick={handleAddReturnItemsToCart} disabled={returnItemsState.length === 0}>
                    <FaExchangeAlt className="w-3.5 h-3.5 mr-1.5" /> Add to Exchange Cart
                  </Button>
                  <Button variant="default" onClick={() => handleProcessVoidReturn()} disabled={isReturning || returnItemsState.length === 0}>{isReturning ? "Processing..." : "Process Void Return"}</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="invoice-return" className="py-4">
              <div className="flex gap-4 mb-4 border-b pb-2">
                <Button 
                  variant={returnMode === "invoice" ? "default" : "outline"} 
                  onClick={() => {
                    setReturnMode("invoice");
                    setReturnSaleDetails(null);
                    setReturnItemsState([]);
                  }}
                >
                  By Invoice
                </Button>
                <Button 
                  variant={returnMode === "customer" ? "default" : "outline"} 
                  onClick={() => {
                    setReturnMode("customer");
                    setReturnSaleDetails(null);
                    setReturnItemsState([]);
                  }}
                >
                  By Customer
                </Button>
              </div>
              
              {!returnSaleDetails ? (
                returnMode === "invoice" ? (
                  <div className="flex gap-2 items-end mb-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2">Sale Number</label>
                      <Input 
                        placeholder="e.g. SL-12345" 
                        value={actionSaleNumber} 
                        onChange={(e) => setActionSaleNumber(e.target.value)} 
                      />
                    </div>
                    <Button onClick={handleFetchSaleForReturn} disabled={isFetchingSale}>{isFetchingSale ? "Searching..." : "Search"}</Button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Select Customer</label>
                    <SearchableSelect 
                      options={clientOptions}
                      value={returnCustomerId || null}
                      onValueChange={(val) => {
                        const newCustId = val || "";
                        setReturnCustomerId(newCustId);
                        if (newCustId) {
                          setSelectedClientId(newCustId);
                        }
                      }}
                      placeholder="Search Customer..."
                    />
                    {isFetchingCustomerSales && <p className="text-xs text-muted-foreground mt-1">Loading sales...</p>}
                    {!isFetchingCustomerSales && customerSales.length > 0 && (
                      <div className="mt-4 border rounded-lg p-2 max-h-[35vh] overflow-y-auto flex flex-col gap-2 bg-muted/5">
                        <p className="font-semibold text-sm px-1 py-1">Select an Invoice to Return From:</p>
                        {customerSales.map(sale => (
                          <div key={sale.id} className="flex justify-between items-center p-2.5 bg-background border rounded-lg cursor-pointer hover:bg-muted/30 hover:border-primary/20 transition-all" onClick={() => {
                            setActionSaleNumber(sale.saleNumber);
                            handleFetchSaleForReturn(sale.saleNumber);
                          }}>
                            <div>
                              <p className="text-sm font-bold">{sale.saleNumber}</p>
                              <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleDateString()}</p>
                            </div>
                            <p className="text-sm font-semibold">৳{sale.grandTotal}</p>
                            <Button size="sm" variant="secondary">Select</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-4 mb-4">
                  {/* Selected Sale Header Summary Card with Back Button & Return Full Invoice Checkbox */}
                  <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl shadow-sm gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 text-xs font-bold shrink-0"
                        onClick={() => {
                          setReturnSaleDetails(null);
                          setReturnItemsState([]);
                          setIsFullReturnChecked(false);
                        }}
                      >
                        <FaArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
                      </Button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-foreground">{returnSaleDetails.saleNumber}</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded shrink-0">
                            ৳{Number(returnSaleDetails.grandTotal).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Customer: <span className="font-semibold text-foreground">{returnSaleDetails.client?.name || "Walk-in Customer"}</span> • Date: {new Date(returnSaleDetails.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Refund Method Selector & Return Full Invoice Checkbox */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                      <div className="flex items-center bg-muted/60 p-1 border border-border rounded-lg gap-1">
                        <button
                          type="button"
                          onClick={() => setRefundMode("AR_OFFSET_FIRST")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                            refundMode === "AR_OFFSET_FIRST" 
                              ? "bg-background text-foreground shadow-xs border border-border/80" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Adjusts client due debt first before cash refund"
                        >
                          Client Due Adjust (Default)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefundMode("CASH_PAID_ONLY")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                            refundMode === "CASH_PAID_ONLY" 
                              ? "bg-primary text-primary-foreground shadow-xs" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="Refunds customer paid amount in cash/channels (Max: Paid Amount)"
                        >
                          Cash Refund (Paid Amount)
                        </button>
                      </div>

                      <label className="flex items-center gap-2 px-3 py-1.5 bg-background border border-primary/40 hover:border-primary rounded-lg cursor-pointer transition-all shadow-xs shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={isFullReturnChecked}
                          onChange={(e) => handleToggleFullReturn(e.target.checked)}
                          className="h-4 w-4 rounded border-primary text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Return Full Invoice</span>
                      </label>
                    </div>
                  </div>

                  {/* SS2: Sale Items */}
                  <div className="border rounded-xl p-4 bg-muted/10">
                    {returnItemsState.length > 0 && returnItemsState.every(i => i.maxQty === 0) && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-bold mb-3 flex items-center gap-2">
                        <FaExclamationTriangle className="w-4 h-4 shrink-0" />
                        <span>All items on this invoice have already been fully returned. Duplicate returns are disabled.</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-sm">Sale Items (Select Quantities to Return)</p>
                      <span className="text-xs text-muted-foreground font-medium">Available = Purchased - Returned</span>
                    </div>
                    <div className="max-h-[30vh] overflow-y-auto flex flex-col gap-2">
                      {returnSaleDetails.items.map((item: any) => {
                        const state = returnItemsState.find(i => i.itemId === item.itemId && (item.variantId ? i.variantId === item.variantId : !i.variantId));
                        const origQty = item.originalQuantity ?? Number(item.quantity);
                        const retQty = Number(item.returnedQuantity || 0);
                        const availQty = state?.maxQty ?? Math.max(0, origQty - retQty);
                        const isItemFullyReturned = availQty === 0;

                        return (
                          <div key={item.id} className={`flex items-center justify-between border rounded-lg p-3 shadow-sm transition-all ${isItemFullyReturned ? 'bg-muted/40 opacity-75 border-destructive/20' : 'bg-background hover:border-primary/20'}`}>
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{item.description}</p>
                                {isItemFullyReturned ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded shrink-0">
                                    Fully Returned
                                  </span>
                                ) : retQty > 0 ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded shrink-0">
                                    Partially Returned ({retQty})
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                <span>Purchased: <strong className="text-foreground">{origQty}</strong></span>
                                <span>•</span>
                                <span>Returned: <strong className={retQty > 0 ? "text-destructive" : "text-foreground"}>{retQty}</strong></span>
                                <span>•</span>
                                <span>Available to Return: <strong className={availQty > 0 ? "text-primary" : "text-muted-foreground"}>{availQty}</strong></span>
                                <span>•</span>
                                <span>৳{item.unitPrice}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3 w-[128px] shrink-0 justify-end">
                              <Button size="icon" variant="outline" className="h-7 w-7" disabled={isItemFullyReturned || (state?.returnQty || 0) <= 0} onClick={() => handleUpdateReturnQty(item.itemId, (state?.returnQty || 0) - 1, item.variantId)}>-</Button>
                              <input
                                type="number"
                                min="0"
                                max={availQty}
                                disabled={isItemFullyReturned}
                                value={state?.returnQty ?? 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleUpdateReturnQty(item.itemId, isNaN(val) ? 0 : val, item.variantId);
                                }}
                                className="text-sm font-semibold w-14 text-center text-foreground bg-background border border-border/80 rounded-md outline-none focus:border-primary/50 disabled:bg-muted disabled:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none py-0.5 px-0.5 m-0"
                              />
                              <Button size="icon" variant="outline" className="h-7 w-7" disabled={isItemFullyReturned || (state?.returnQty || 0) >= availQty} onClick={() => handleUpdateReturnQty(item.itemId, (state?.returnQty || 0) + 1, item.variantId)}>+</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { 
                  setIsReturnModalOpen(false); 
                  setReturnSaleDetails(null); 
                  setReturnItemsState([]); 
                  setBarcodeInput(""); 
                  if (isExchangeMode && cart.filter(i => i.isReturnItem).length === 0) {
                    setIsExchangeMode(false);
                    sonnerToast.info("Exchange Mode Exited", { position: "bottom-right" });
                  }
                }}>Cancel</Button>
                <Button 
                  className="bg-[#d97706] text-white hover:bg-[#d97706]/90 border border-[#d97706]/20 font-bold shadow-sm" 
                  onClick={handleAddReturnItemsToCart} 
                  disabled={!returnSaleDetails || returnItemsState.filter(i => i.returnQty > 0).length === 0}
                >
                  <FaExchangeAlt className="w-3.5 h-3.5 mr-1.5" /> Add to Exchange Cart
                </Button>
                <Button variant="default" onClick={handleProcessReturn} disabled={isReturning || !returnSaleDetails}>{isReturning ? "Processing..." : "Process Invoice Return"}</Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Held Carts Modal */}
      <Dialog open={isHeldCartsModalOpen} onOpenChange={setIsHeldCartsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Held Carts</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {heldCarts.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No carts are currently on hold.</p>
            ) : (
              heldCarts.map((hc: any) => (
                <div key={hc.id} className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg hover:border-primary/30 transition-all">
                  <div>
                    <p className="font-semibold text-foreground">
                      {clients.find(c => c.id === hc.clientId)?.name || "Walk-in Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(parseInt(hc.id)).toLocaleString()} • {hc.cart.length} item(s)
                    </p>
                    <p className="text-sm font-bold mt-1 text-primary">৳{hc.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => onAttemptDeleteHeldCart(hc.id)}
                    >
                      Delete
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleRecallCart(hc)}
                    >
                      Recall
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hold Bill Delete Security Verification Modal */}
      <POSSecurityModal
        isOpen={isHoldBillDeleteSecurityModalOpen}
        onClose={() => {
          setIsHoldBillDeleteSecurityModalOpen(false);
          setPendingDeleteHeldCartId(null);
        }}
        onSuccess={(userId, userName) => {
          setHoldBillDeletePermittedById(userId);
          if (pendingDeleteHeldCartId) {
            handleDeleteHeldCart(pendingDeleteHeldCartId);
            setPendingDeleteHeldCartId(null);
          }
          setIsHoldBillDeleteSecurityModalOpen(false);
          sonnerToast.success(`Hold Bill Deletion authorized by ${userName}`);
        }}
        actionTitle="Authorize Hold Bill Deletion"
        actionDescription="Secure POS is enabled. Select an authorized user with POS permissions and enter password to delete held bill."
      />

      {/* Collect Customer Due Dialog Modal */}
      <Dialog open={isPayDueModalOpen} onOpenChange={setIsPayDueModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-foreground">Collect Customer Due</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col md:flex-row gap-6 mt-2 max-h-[75vh]">
            {/* Left Column: Customer Select & Outstanding Invoices */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Customer Select */}
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Select Customer</label>
                <SearchableSelect
                  options={clients
                    .filter(c => c.name?.toLowerCase() !== "walkway customer")
                    .map((c) => {
                      const descParts = [];
                      if (c.clientType === 'wholesale') descParts.push("WS");
                      if (c.clientCode) descParts.push(c.clientCode);
                      if (c.phone) descParts.push(c.phone);
                      const dueAmount = Number((c as any).netDue || 0);
                      if (dueAmount > 0) {
                        descParts.push(`Due: ৳${dueAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`);
                      } else {
                        descParts.push(`Due: ৳0.00`);
                      }
                      return {
                        value: c.id,
                        label: c.name || c.email || "Unnamed Customer",
                        description: descParts.length > 0 ? descParts.join(" | ") : undefined
                      };
                    })}
                  value={payDueClientId || null}
                  onValueChange={(val) => {
                    setPayDueClientId(val || "");
                    setLumpSumAmount(0);
                  }}
                  placeholder="Select Customer..."
                  searchPlaceholder="Search customer by name, client code, or phone..."
                  className="w-full h-10 text-xs bg-background border-border"
                />
              </div>

              {payDueClientId && (
                <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Customer Account Due Summary</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-background rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Total Outstanding Due</span>
                      <span className="text-sm font-black text-destructive">৳{clientNetARBalance.toFixed(2)}</span>
                    </div>
                    <div className="p-2 bg-background rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Sales Invoices Due</span>
                      <span className="text-sm font-bold text-foreground">৳{outstandingSales.reduce((sum, s) => sum + s.remainingDue, 0).toFixed(2)}</span>
                    </div>
                    <div className="p-2 bg-background rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Opening / Account Due</span>
                      <span className="text-sm font-bold text-primary">৳{clientOpeningDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {payDueClientId && outstandingSales.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground block">Outstanding Sales Invoices</span>
                  <div className="border border-border rounded-xl overflow-hidden bg-background">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Invoice No</th>
                          <th className="py-2.5 px-3 font-semibold">Date</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Grand Total</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Remaining Due</th>
                          <th className="py-2.5 px-3 font-semibold text-right w-[150px]">Paying Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {outstandingSales.map((sale) => {
                          const paying = invoiceAllocations[sale.id] || 0;
                          return (
                            <tr key={sale.id} className="hover:bg-muted/10">
                              <td className="py-2.5 px-3 font-mono font-bold text-foreground">{sale.saleNumber}</td>
                              <td className="py-2.5 px-3 text-muted-foreground">{new Date(sale.date).toLocaleDateString()}</td>
                              <td className="py-2.5 px-3 text-right text-muted-foreground">৳{sale.grandTotal.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-destructive">৳{sale.remainingDue.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="relative w-full">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">৳</span>
                                  <Input
                                    type="number"
                                    value={paying || ""}
                                    max={sale.remainingDue}
                                    onChange={(e) => {
                                      const val = Math.min(sale.remainingDue, Number(e.target.value) || 0);
                                      setInvoiceAllocations(prev => ({
                                        ...prev,
                                        [sale.id]: val
                                      }));
                                    }}
                                    className="h-8 text-xs font-semibold pl-5 bg-background text-right"
                                    placeholder="0"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {payDueClientId && outstandingSales.length === 0 && clientNetARBalance > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-medium space-y-1">
                  <p className="font-bold text-sm">General Account Due Collection</p>
                  <p>This customer has no active sales invoices, but has an Outstanding Account Due balance of <strong>৳{clientNetARBalance.toFixed(2)}</strong>. You can enter the payment amount under <strong>Collection Payment Splits</strong> on the right to collect payment directly against their account balance.</p>
                </div>
              )}

              {payDueClientId && outstandingSales.length === 0 && clientNetARBalance <= 0 && (
                <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground text-sm font-medium">
                  No outstanding dues found for this customer.
                </div>
              )}
            </div>

            {/* Right Column: Collection Payment Splits & Totals Summary */}
            <div className="w-full md:w-[360px] shrink-0 space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 overflow-y-auto pr-1">
              {/* FIFO Section */}
              <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase text-muted-foreground block">FIFO Auto-Allocation</span>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Lump Sum Amount</label>
                    <Input
                      type="number"
                      value={lumpSumAmount || ""}
                      onChange={(e) => setLumpSumAmount(Number(e.target.value) || 0)}
                      placeholder="Enter total amount to collect..."
                      className="h-10 text-sm bg-background font-semibold"
                      disabled={!payDueClientId || clientNetARBalance <= 0}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAutoAllocateFIFO}
                    disabled={!payDueClientId || clientNetARBalance <= 0}
                    className={`bg-primary text-primary-foreground h-10 px-4 shrink-0 font-bold ${(!payDueClientId || clientNetARBalance <= 0) ? "" : "animate-pulse hover:animate-none"}`}
                  >
                    Auto-Allocate
                  </Button>
                </div>
              </div>

              {/* Payment Splits */}
              <div className="bg-muted/30 border border-border p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase text-muted-foreground block">Collection Payment Splits</span>
                
                {/* Cash Row */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <label className="text-xs font-semibold text-foreground w-[50px] shrink-0">Cash:</label>
                  <div className="grid grid-cols-[1fr_110px] gap-2 flex-1 min-w-0">
                    <Select value={dueCashAccountId} onValueChange={(val) => setDueCashAccountId(val)} disabled={!payDueClientId || clientNetARBalance <= 0}>
                      <SelectTrigger className="h-9 text-xs bg-background border-border w-full truncate">
                        <SelectValue placeholder="Select Cash" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPaymentAccounts
                          .filter(acc => acc.type === "CASH")
                          .map(acc => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs">
                              {acc.code ? `${acc.code} - ` : ""}{acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">৳</span>
                      <Input
                        type="number"
                        value={dueCashAmount || ""}
                        onChange={(e) => setDueCashAmount(Number(e.target.value) || 0)}
                        className="h-9 text-xs font-medium pl-6 bg-background text-right w-full"
                        placeholder="0"
                        disabled={!payDueClientId || clientNetARBalance <= 0}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Row */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <label className="text-xs font-semibold text-foreground w-[50px] shrink-0">Card:</label>
                  <div className="grid grid-cols-[1fr_110px] gap-2 flex-1 min-w-0">
                    <Select value={dueCardAccountId} onValueChange={(val) => setDueCardAccountId(val)} disabled={!payDueClientId || clientNetARBalance <= 0}>
                      <SelectTrigger className="h-9 text-xs bg-background border-border w-full truncate">
                        <SelectValue placeholder="Select Card Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPaymentAccounts
                          .filter(acc => acc.type === "BANK")
                          .map(acc => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs">
                              {acc.code ? `${acc.code} - ` : ""}{acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">৳</span>
                      <Input
                        type="number"
                        value={dueCardAmount || ""}
                        onChange={(e) => setDueCardAmount(Number(e.target.value) || 0)}
                        className="h-9 text-xs font-medium pl-6 bg-background text-right w-full"
                        placeholder="0"
                        disabled={!payDueClientId || clientNetARBalance <= 0}
                      />
                    </div>
                  </div>
                </div>

                {/* MFS Row */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <label className="text-xs font-semibold text-foreground w-[50px] shrink-0">MFS:</label>
                  <div className="grid grid-cols-[1fr_110px] gap-2 flex-1 min-w-0">
                    <Select value={dueMfsAccountId} onValueChange={(val) => setDueMfsAccountId(val)} disabled={!payDueClientId || clientNetARBalance <= 0}>
                      <SelectTrigger className="h-9 text-xs bg-background border-border w-full truncate">
                        <SelectValue placeholder="Select Wallet Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPaymentAccounts
                          .filter(acc => acc.type === "WALLET")
                          .map(acc => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs">
                              {acc.code ? `${acc.code} - ` : ""}{acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">৳</span>
                      <Input
                        type="number"
                        value={dueMfsAmount || ""}
                        onChange={(e) => setDueMfsAmount(Number(e.target.value) || 0)}
                        className="h-9 text-xs font-medium pl-6 bg-background text-right w-full"
                        placeholder="0"
                        disabled={!payDueClientId || clientNetARBalance <= 0}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Collections & Validation */}
              <div className="bg-muted/20 border border-border p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase block">Summary</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Total Allocated:</span>
                    <span className="font-semibold text-foreground">৳{totalAllocated.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1.5 border-t border-dashed border-border/80">
                    <span className="text-muted-foreground font-semibold">Total Collected:</span>
                    <span className="font-black text-primary">৳{totalCollected.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayDueModalOpen(false)}
            >
              Cancel
            </Button>
            {payDueClientId && clientNetARBalance > 0 && (
              <Button
                type="button"
                onClick={handleSubmitDuePayment}
                disabled={isSubmittingDuePayment || totalCollected <= 0 || totalCollected > clientNetARBalance + 0.01 || totalAllocated > totalCollected + 0.01}
                className="bg-[#0f8c5a] text-white hover:bg-[#0f8c5a]/90 font-bold"
              >
                {isSubmittingDuePayment ? "Processing..." : "Collect Due"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
