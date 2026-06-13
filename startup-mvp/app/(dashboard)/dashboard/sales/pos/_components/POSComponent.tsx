"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FaSearch, FaHandPaper, FaSync, FaPrint, FaPlus, FaMinus, FaTrashAlt, FaShoppingCart, FaCheckCircle, FaTimes, FaUndoAlt, FaShoppingBag, FaIndustry, FaTicketAlt, FaCreditCard, FaMoneyBillWave, FaMobileAlt, FaUsers, FaGlassCheers } from "react-icons/fa";
import { createSale, getClientItemDiscounts, validateCoupon, voidSale, processSaleReturn, getLastSaleForUser, getSaleByNumber, getSalesByCustomer } from "../../_actions/sale.action";
import { useRouter, useSearchParams } from "next/navigation";
import { useToastContext } from "@/components/ui/providers/toast-provider";
import { createClient } from "@/app/(dashboard)/dashboard/clients/_actions/client.action";
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
  stocks?: { warehouseId: string; quantity: number }[];
}

interface Item {
  id: string;
  code: string;
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
}

interface Client {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  clientCode?: string | null;
  clientType?: string | null;
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
}

export default function POSComponent({ items, clients: initialClients, warehouses, paymentAccounts = [], currentUser }: POSComponentProps) {


  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToastContext();
  
  const [clients, setClients] = useState<Client[]>(initialClients);
  
  const clientOptions = useMemo(() => {
    return clients.map(c => ({
      value: c.id,
      label: c.name || c.email || "Unnamed Customer",
      description: c.clientType === 'wholesale' ? "Wholesale" : undefined
    }));
  }, [clients]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  
  // URL mode sync
  const initialMode = (searchParams.get("mode") as "RETAIL" | "WHOLESALE") || "RETAIL";
  const [orderType, setOrderType] = useState<"RETAIL" | "WHOLESALE">(initialMode);
  
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [isReturnMode, setIsReturnMode] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<{ id: string, cart: CartItem[], clientId: string, amount: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients.find(c => c.name?.toLowerCase() === "walkway customer")?.id || clients[0]?.id || "");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(currentUser?.defaultWarehouseId || warehouses[0]?.id || "");
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [clientDiscounts, setClientDiscounts] = useState<any[]>([]);

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

  // Sync default payment option when filtered list changes


  useEffect(() => {
    getLastSaleForUser().then(res => setHasLastSale(!!res)).catch(() => setHasLastSale(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('pos_held_carts');
    if (saved) {
      try { setHeldCarts(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos_held_carts', JSON.stringify(heldCarts));
  }, [heldCarts]);

  useEffect(() => {
    if (isConfirmModalOpen && filteredPaymentAccounts.length > 0) {
      const activeOption = filteredPaymentAccounts.find(acc => acc.id === paymentMethod);
      if (!activeOption) {
        const firstCash = filteredPaymentAccounts.find(acc => acc.type === "CASH");
        setPaymentMethod(firstCash ? firstCash.id : filteredPaymentAccounts[0].id);
      }
    }
  }, [filteredPaymentAccounts, isConfirmModalOpen]);

  // Promo Code / Coupon states
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscountMsg, setPromoDiscountMsg] = useState("");

  // Sale completion flow
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [hasLastSale, setHasLastSale] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const [returnMode, setReturnMode] = useState<"invoice" | "customer">("invoice");
  const [returnCustomerId, setReturnCustomerId] = useState("");
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [isFetchingCustomerSales, setIsFetchingCustomerSales] = useState(false);

  useEffect(() => {
    if (returnMode === "customer" && returnCustomerId) {
      setIsFetchingCustomerSales(true);
      getSalesByCustomer(returnCustomerId).then(res => {
        if(res.success) setCustomerSales(res.sales);
        else toast({ title: "Error", description: "Could not fetch sales", variant: "destructive" });
        setIsFetchingCustomerSales(false);
      });
    } else {
      setCustomerSales([]);
    }
  }, [returnMode, returnCustomerId]);

  const [actionSaleNumber, setActionSaleNumber] = useState('');
  const [returnSaleDetails, setReturnSaleDetails] = useState<any>(null);
  const [returnItemsState, setReturnItemsState] = useState<{itemId: string, variantId?: string, maxQty: number, returnQty: number}[]>([]);
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
    address: ""
  });

  // Sync state mode to URL search parameter
  const updateOrderMode = (mode: "RETAIL" | "WHOLESALE") => {
    setOrderType(mode);
    setCart([]);
    setDiscountAmount(0);
    setIsReturnMode(false);
    
    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    router.replace(`?${params.toString()}`);
  };

  const getItemDiscount = (item: CartItem | Item, variantId?: string) => {
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

  const getBasePrice = (item: CartItem | Item, currentOrderType: "RETAIL" | "WHOLESALE") => {
    if ("variantId" in item && item.variantId && item.variants) {
      const variant = item.variants.find(v => v.id === item.variantId);
      if (variant) {
        if (currentOrderType === "WHOLESALE") {
          if (variant.wholesalePrice !== null && variant.wholesalePrice !== undefined) {
            return Number(variant.wholesalePrice);
          }
          if (variant.wholesaleDiscountAmount !== null && variant.wholesaleDiscountAmount !== undefined) {
            return Number(variant.salesPrice || item.unitPrice) - Number(variant.wholesaleDiscountAmount);
          }
        }
        if (variant.salesPrice !== null && variant.salesPrice !== undefined) {
          return Number(variant.salesPrice);
        }
      }
    }
    
    if (currentOrderType === "WHOLESALE") {
      if (item.wholesalePrice !== null && item.wholesalePrice !== undefined) {
        return Number(item.wholesalePrice);
      }
      if (item.wholesaleDiscountAmount !== null && item.wholesaleDiscountAmount !== undefined) {
        return item.unitPrice - Number(item.wholesaleDiscountAmount);
      }
    }
    
    return item.unitPrice;
  };

  const getDiscountedPrice = (item: CartItem, basePrice: number, discounts: any[]) => {
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
      setSelectedClientId(walkway.id);
    }
  }, [clients]);

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

    const newMode = isWholesale ? "WHOLESALE" : "RETAIL";
    if (newMode !== orderType) {
      updateOrderMode(newMode);
    }

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
        const matchesDescription = item.description?.toLowerCase().includes(q);
        const matchesDbDescription = item.itemDescription?.toLowerCase().includes(q);
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesVariant = item.variants?.some(v => 
          (v.sku && v.sku.toLowerCase().includes(q)) || 
          (v.barcode && v.barcode.toLowerCase().includes(q))
        ) || false;

        matchesSearch = matchesCode || matchesDescription || matchesDbDescription || matchesName || matchesVariant;
      }

      const matchesCategory = filterType === "ALL" || item.category === filterType;
      const matchesOrderType = orderType === "RETAIL"
        ? (item.itemType === "RETAIL" || item.itemType === "READY_PRODUCT")
        : item.itemType === "WHOLESALE";
      return matchesSearch && matchesCategory && matchesOrderType;
    });
  }, [items, searchQuery, filterType, orderType]);

  const subTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.cartQuantity, 0);
  const itemVatTotal = cart.reduce((sum, item) => {
    if (item.isVatEnabled && item.vatPercentage) {
      return sum + (item.unitPrice * item.cartQuantity) * (item.vatPercentage / 100);
    }
    return sum;
  }, 0);
  const tax = itemVatTotal + (subTotal - discountAmount) * (taxPercent / 100);
  const grandTotal = subTotal + tax - discountAmount;
  const dueAmount = grandTotal - paidAmount;

  const handleAddToCart = (item: Item) => {
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

    const delta = isReturnMode ? -1 : 1;
    const cartKey = item.id;
    const itemToAdd: CartItem = { 
      ...item, 
      unitPrice: priceToUse,
      cartKey,
      cartQuantity: delta
    };

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) => {
          if (i.cartKey === cartKey) {
            const newQ = i.cartQuantity + delta;
            return { ...i, cartQuantity: newQ };
          }
          return i;
        }).filter((i) => i.cartQuantity !== 0);
      }
      return [...prev, itemToAdd];
    });
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

    const itemToAdd: CartItem = {
      ...item,
      unitPrice: priceToUse,
      variantId: variant.id,
      variantSku: variant.sku,
      size: variant.size,
      color: variant.color,
      cartKey,
      cartQuantity: delta
    };

    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) => {
          if (i.cartKey === cartKey) {
            const newQ = i.cartQuantity + delta;
            return { ...i, cartQuantity: newQ };
          }
          return i;
        }).filter((i) => i.cartQuantity !== 0);
      }
      return [...prev, itemToAdd];
    });
  };

  const handleUpdateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) => {
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
    setCart((prev) => {
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

  const handleBarcodeScan = (barcode: string) => {
    for (const item of items) {
      if (item.variants) {
        const matchedVariant = item.variants.find(
          v => v.barcode === barcode || v.sku === barcode
        );
        if (matchedVariant) {
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

    const matchedItem = items.find(i => i.code === barcode);
    if (matchedItem) {
      toast({
        title: "Product Scanned",
        description: `Added: ${matchedItem.description}`,
        duration: 1200,
      });
      handleAddToCart(matchedItem);
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

    // Check parent items (Code)
    const matchedItem = items.find(i => i.code === query);
    if (matchedItem) {
      const matchesOrderType = orderType === "RETAIL"
        ? (matchedItem.itemType === "RETAIL" || matchedItem.itemType === "READY_PRODUCT")
        : matchedItem.itemType === "WHOLESALE";
      if (matchesOrderType) {
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

  const handleFetchSaleForReturn = async (saleNum?: any) => {
    const saleNumberToFetch = (typeof saleNum === "string" && saleNum) ? saleNum : actionSaleNumber;
    if(!saleNumberToFetch) return toast({ title: "Error", description: "Sale Number is required", variant: "destructive" });
    setIsFetchingSale(true);
    try {
      const res = await getSaleByNumber(saleNumberToFetch);
      if (res.success && res.sale) {
        setReturnSaleDetails(res.sale);
        setReturnItemsState(res.sale.items.map((i: any) => ({ itemId: i.itemId, variantId: i.variantId || undefined, maxQty: Number(i.quantity), returnQty: 0 })));
      } else {
        toast({ title: "Not Found", description: res.error || "Sale not found", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch sale details", variant: "destructive" });
    }
    setIsFetchingSale(false);
  };

  const handleUpdateReturnQty = (itemId: string, qty: number, variantId?: string) => {
    setReturnItemsState(prev => prev.map(i => {
      if (i.itemId === itemId && (variantId ? i.variantId === variantId : !i.variantId)) {
        return { ...i, returnQty: Math.min(Math.max(0, qty), i.maxQty) };
      }
      return i;
    }));
  };


  const handleProcessVoidReturn = async () => {
    const selectedItems = returnItemsState.filter(i => i.returnQty > 0).map(i => {
      const it = items.find(x => x.id === i.itemId);
      const variant = i.variantId ? it?.variants?.find(v => v.id === i.variantId) : null;
      return { 
        itemId: i.itemId, 
        variantId: i.variantId || undefined, 
        quantity: i.returnQty, 
        unitPrice: variant ? (variant.salesPrice || it?.unitPrice || 0) : (it?.unitPrice || 0) 
      };
    });
    if(selectedItems.length === 0) return toast({ title: "Error", description: "Please select at least one item to return", variant: "destructive" });
    
    setIsReturning(true);
    try {
      const res = await processSaleReturn(null, selectedItems, selectedWarehouseId);
      if(res.success && res.returnSale) {
        const saleNum = res.returnSale.saleNumber;
        const saleId = res.returnSale.id;
        const refundAmt = Number(res.returnSale.grandTotal);
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
      const res = await processSaleReturn(returnSaleDetails.id, selectedItems);
      if(res.success && res.returnSale) {
        const saleNum = res.returnSale.saleNumber;
        const saleId = res.returnSale.id;
        const refundAmt = Number(res.returnSale.grandTotal);
        setCompletedSaleNumber(saleNum);
        setCompletedSaleId(saleId || '');
        setChangeAmount(Math.abs(refundAmt));
        toast({ title: "Return Processed", description: `Return ${saleNum} created.` });
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
    }
    setHeldCarts(heldCarts.filter((c: any) => c.id !== heldCart.id));
    setIsHeldCartsModalOpen(false);
    toast({ title: "Cart Recalled", description: "Held cart has been restored." });
  };

  const handleDeleteHeldCart = (id: string) => {
    setHeldCarts(heldCarts.filter((c: any) => c.id !== id));
    if (heldCarts.length === 1) setIsHeldCartsModalOpen(false);
    toast({ title: "Held Cart Deleted", description: "The held cart was removed." });
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
    setHeldCarts([...heldCarts, newHeldCart]);
    handleNewSale(); // clear screen
    toast({ title: "Cart Held", description: "Current transaction put on hold." });
  };

  const handleNewSale = () => {
    setIsChangeDialogOpen(false);
    setCart([]);
    setSearchQuery('');
    setDiscountAmount(0);
    setTaxPercent(0);
    setPaidAmount(0);
    setSuccessMsg('');
    setCompletedSaleNumber('');
    setCompletedSaleId('');
    setChangeAmount(0);
    setPromoCode('');
    setAppliedPromo(null);
    setPromoDiscountMsg('');
    if (walkwayCustomerId) {
      setSelectedClientId(walkwayCustomerId);
    }
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    toast({
      title: "Validating Coupon...",
      description: "Please wait while we verify your coupon code.",
    });

    const result = await validateCoupon(code, subTotal);
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

    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = `/print/invoice/${saleId}`;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
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
    setPaidAmount(grandTotal);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmOrder = async () => {
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

      const res = await createSale({
        clientId: selectedClientId,
        warehouseId: selectedWarehouseId,
        date: new Date(),
        status: "COMPLETED",
        orderType: orderType as any,
        notes: `POS Sale - Paid via ${paymentMethod}`,
        tax: tax,
        discount: discountAmount,
        items: saleItems,
        couponCode: appliedPromo || undefined,
        paymentMethod: paymentMethod,
      });

      if (res.success) {
        const saleNum = (res.sale as any)?.saleNumber || '';
        const saleId = (res.sale as any)?.id || '';
        setCompletedSaleNumber(saleNum);
        setCompletedSaleId(saleId || '');
        setChangeAmount(paidAmount - grandTotal);
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
    } catch (err) {
      console.error(err);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while processing the transaction.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.email) return;

    setNewCustomerLoading(true);
    try {
      const res = await createClient({
        name: newCustomerData.name,
        email: newCustomerData.email,
        phone: newCustomerData.phone,
        company: newCustomerData.company,
        address: newCustomerData.address,
        status: "active"
      });

      if (res.success && res.client) {
        toast({
          title: "Success",
          description: "New client registered successfully!"
        });
        setClients(prev => [res.client as Client, ...prev]);
        setSelectedClientId(res.client.id);
        setIsAddCustomerOpen(false);
        setNewCustomerData({
          name: "",
          email: "",
          phone: "",
          company: "",
          address: ""
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

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      <div className="flex-1 flex flex-col p-6 overflow-hidden bg-background">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Product Catalog
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                orderType === "RETAIL"
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-orange-500/10 text-orange-600"
              }`}>
                {orderType === "RETAIL" ? (<span className="flex items-center gap-1"><FaShoppingBag /> Retail</span>) : (<span className="flex items-center gap-1"><FaIndustry /> Wholesale</span>)}
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId} disabled={currentUser?.role?.toLowerCase() !== "admin"}>
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
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-none text-foreground h-10"
              />
            </div>
            <Button 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors h-10"
              onClick={() => router.push('/dashboard/sales')}
            >
              <FaTimes className="w-4 h-4 mr-2" /> Exit POS
            </Button>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-border pb-4 overflow-x-auto whitespace-nowrap no-scrollbar">
          <button 
            className={`px-4 py-2 text-sm font-medium transition-colors ${filterType === "ALL" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setFilterType("ALL")}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button 
              key={cat}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filterType === cat ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setFilterType(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const displayPrice = orderType === "WHOLESALE" ? (item.wholesalePrice || item.unitPrice) : item.unitPrice;
              const discount = getItemDiscount(item);
              let finalPrice = displayPrice;
              if (discount) {
                if (discount.discountType === "PERCENTAGE") {
                  finalPrice = displayPrice * Math.max(0, 1 - (discount.discountValue / 100));
                } else if (discount.discountType === "FLAT") {
                  finalPrice = Math.max(0, displayPrice - discount.discountValue);
                }
              }
              const hasDiscount = finalPrice !== displayPrice;
              const itemStock = item.variants && item.variants.length > 0
                ? item.variants.reduce((acc, v) => acc + (v.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0), 0)
                : (item.stocks?.find(s => s.warehouseId === selectedWarehouseId)?.quantity || 0);
              
              return (
              <div key={item.id} className="bg-card text-card-foreground rounded-xl border border-border p-4 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                <div>
                   <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground overflow-hidden relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.description} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xs">{item.code}</span>
                      )}
                   </div>
                   <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-foreground" title={item.description}>{item.description}</h3>
                   <div className="text-lg font-bold text-foreground mb-3 flex flex-wrap items-center gap-1.5">
                      <span>৳{finalPrice.toFixed(2)}</span>
                      {hasDiscount && (
                        <>
                          <span className="text-xs text-muted-foreground line-through font-normal">৳{displayPrice.toFixed(2)}</span>
                          <span className="text-[10px] font-semibold text-green-600 bg-green-500/10 px-1 py-0.2 rounded font-normal">
                            {discount.discountType === "PERCENTAGE" ? `${discount.discountValue}% Off` : `৳${discount.discountValue} Off`}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
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
            )})}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-2 pt-4 border-t border-border shrink-0 overflow-x-auto pb-2">
          <div className="flex items-center w-fit rounded-md overflow-hidden border border-border">

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-background text-foreground hover:bg-muted transition-colors border-r border-border min-w-[120px]"
              onClick={() => { setActionSaleNumber(""); setIsReturnModalOpen(true); }}
            >
              Return <FaUndoAlt className="w-4 h-4" />
            </button>
            
            

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#ffb000] text-black hover:bg-[#ffb000]/90 transition-colors min-w-[120px]"
              onClick={() => { if(cart.length > 0) handleHoldCart(); else if(heldCarts.length > 0) setIsHeldCartsModalOpen(true); else toast({title: "Hold", description:"No carts held."}) }}
            >
              "Hold" 
              
              {heldCarts.length > 0 && <span className="ml-1 bg-black text-[#ffb000] rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{heldCarts.length}</span>} 
              
              <FaHandPaper className="w-4 h-4" />
            </button>

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#0f8c5a] text-white hover:bg-[#0f8c5a]/90 transition-colors min-w-[120px]"
              onClick={() => { handleNewSale(); toast({ title: "Refreshed", description: "POS reset successfully" }); }}
            >
              Refresh <FaSync className="w-4 h-4" />
            </button>

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#136bfb] text-white hover:bg-[#136bfb]/90 transition-colors min-w-[120px] rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePrintLastBill}
              disabled={!hasLastSale && !completedSaleNumber}
            >
              Last Bill <FaPrint className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-[450px] flex flex-col bg-card text-card-foreground border-l border-border shadow-md z-10 relative">
        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-xl font-bold text-foreground shrink-0">Order Details</h2>
            <div className="flex bg-muted p-0.5 rounded-lg">
                <button 
                  onClick={() => { if (orderType !== "RETAIL") updateOrderMode("RETAIL"); }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${orderType === "RETAIL" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Retail
                </button>
                <button 
                  onClick={() => { if (orderType !== "WHOLESALE") updateOrderMode("WHOLESALE"); }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${orderType === "WHOLESALE" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Wholesale
                </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Customer <span className="text-destructive">*</span>
                {selectedClientId && clients.find(c => c.id === selectedClientId)?.clientType === 'wholesale' && (
                  <span className="ml-1 px-1 py-0.5 text-[9px] bg-amber-500/15 text-amber-600 rounded font-bold font-sans">WS</span>
                )}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    options={clientOptions}
                    value={selectedClientId || null}
                    onValueChange={(val) => setSelectedClientId(val || "")}
                    placeholder="Select Customer..."
                    searchPlaceholder="Search customer..."
                    className="w-full h-9 text-xs"
                  />
                </div>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddCustomerOpen(true)}
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
                  cart.map((item) => (
                    <div key={item.cartKey} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-md shrink-0 flex items-center justify-center relative overflow-hidden">
                         {item.imageUrl ? (
                           <img src={item.imageUrl} alt={item.description} className="object-cover w-full h-full" />
                         ) : (
                           <span className="text-[10px] text-muted-foreground px-1 text-center truncate">{item.code}</span>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.description}</p>
                        {item.variantSku && (
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.2 bg-muted border border-border text-foreground rounded font-medium">{item.color}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-muted border border-border text-foreground rounded font-medium">{item.size}</span>
                          </div>
                        )}
                        <p className="text-sm font-bold text-foreground">৳{item.unitPrice.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-muted rounded-full border border-border px-1 py-1">
                        <button 
                          className="w-6 h-6 flex items-center justify-center bg-background rounded-full border border-border shadow-sm text-muted-foreground hover:text-foreground"
                          onClick={() => handleUpdateQuantity(item.cartKey, -1)}
                        >
                          <FaMinus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={item.cartQuantity === 0 ? "" : item.cartQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleCustomQuantitySet(item.cartKey, isNaN(val) ? 0 : val);
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (isNaN(val) || val <= 0) {
                              handleRemoveItem(item.cartKey);
                            }
                          }}
                          className="text-sm font-semibold w-10 text-center text-foreground bg-transparent border-none outline-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 m-0"
                        />
                        <button 
                          className="w-6 h-6 flex items-center justify-center bg-background rounded-full border border-border shadow-sm text-muted-foreground hover:text-foreground"
                          onClick={() => handleUpdateQuantity(item.cartKey, 1)}
                        >
                          <FaPlus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                        onClick={() => handleRemoveItem(item.cartKey)}
                      >
                        <FaTrashAlt className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
             </div>
          </div>

          <div className="pt-3">
            <h3 className="text-sm font-bold text-foreground mb-2">Order Summary</h3>
            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item ({cart.length})</span>
                <span className="font-medium text-foreground">৳{subTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-border border-dashed pt-2 flex justify-between items-center">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-lg font-black text-foreground">৳{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-3 h-12 text-base font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
              onClick={handleProcessTransaction}
              disabled={cart.length === 0}
            >
              Process Transaction
            </Button>
          </div>
        </div>
      </div>

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
                    {cart.map((item) => (
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
                          <span className="font-semibold text-foreground">{item.description}</span>
                          {item.variantSku && (
                            <div className="flex gap-1 mt-1">
                              <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-foreground rounded font-medium">{item.color}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-foreground rounded font-medium">{item.size}</span>
                            </div>
                          )}
                        </td>
                        <td className="text-center py-3 px-4 text-muted-foreground font-medium">{item.cartQuantity}</td>
                        <td className="text-right py-3 px-4 text-muted-foreground">৳{item.unitPrice.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 font-bold text-foreground">৳{(item.cartQuantity * item.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side: Payment Details, Promo Codes, Paid Amount, Balance Displays */}
            <div className="w-full md:w-[400px] bg-background p-6 flex flex-col justify-between border-t md:border-t-0 border-border">
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Coupon Code Section */}
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

                {/* Additional Manual Discount & Tax */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Flat Discount (৳)</label>
                    <Input 
                      type="number" 
                      value={discountAmount || ""}
                      onChange={(e) => {
                        setDiscountAmount(Number(e.target.value) || 0);
                        if (appliedPromo) {
                          setAppliedPromo(null);
                          setPromoDiscountMsg("");
                        }
                      }}
                      placeholder="Discount ৳"
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Tax</label>
                                        <div className="text-sm font-medium text-foreground">৳{tax.toFixed(2)}</div>
                  </div>
                </div>

                {/* Payment Method Select Dropdown */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-2"><span className="flex items-center gap-2"><FaCreditCard /> Payment Method</span></label>
                  <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                    <SelectTrigger className="h-10 text-xs bg-background border-border">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPaymentAccounts.filter(acc => acc.type === "CASH").length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30">
                            Cash Accounts
                          </div>
                          {filteredPaymentAccounts
                            .filter(acc => acc.type === "CASH")
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                <span className="flex items-center gap-2"><FaMoneyBillWave /> {acc.code}</span> - {acc.name}
                              </SelectItem>
                            ))}
                        </>
                      )}
                      {filteredPaymentAccounts.filter(acc => acc.type === "BANK").length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 mt-1">
                            Bank / Card List
                          </div>
                          {filteredPaymentAccounts
                            .filter(acc => acc.type === "BANK")
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                <span className="flex items-center gap-2"><FaCreditCard /> {acc.code}</span> - {acc.name}
                              </SelectItem>
                            ))}
                        </>
                      )}
                      {filteredPaymentAccounts.filter(acc => acc.type === "WALLET").length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 mt-1">
                            Digital Accounts / Wallets
                          </div>
                          {filteredPaymentAccounts
                            .filter(acc => acc.type === "WALLET")
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                <span className="flex items-center gap-2"><FaMobileAlt /> {acc.code}</span> - {acc.name}
                              </SelectItem>
                            ))}
                        </>
                      )}
                      {filteredPaymentAccounts.length === 0 && (
                        <>
                          <SelectItem value="CASH" className="text-xs"><span className="flex items-center gap-2"><FaMoneyBillWave /> Cash (Default)</span></SelectItem>
                          <SelectItem value="CARD" className="text-xs"><span className="flex items-center gap-2"><FaCreditCard /> Card (Default)</span></SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Paid Amount & Quick cash helpers */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1"><span className="flex items-center gap-2"><FaMoneyBillWave /> Paid Amount</span></label>
                  <div className="relative mb-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">৳</span>
                    <Input 
                      type="number" 
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      className="text-lg font-bold pl-7 bg-background"
                    />
                  </div>
                  
                  {/* Quick Cash Payment Shortcuts */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Quick Cash Shortcuts</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[50, 100, 500, 1000].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium px-2.5 border-border bg-muted/20 hover:bg-muted"
                          onClick={() => setPaidAmount((prev) => prev + amt)}
                        >
                          +৳{amt}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-2.5 border-primary/20 text-primary hover:bg-primary/10"
                        onClick={() => setPaidAmount(grandTotal)}
                      >
                        Exact
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-2.5 border-destructive/20 text-destructive hover:bg-destructive/10"
                        onClick={() => setPaidAmount(0)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Real-time Change / Due Displays */}
                <div className="pt-2">
                  {paidAmount >= grandTotal ? (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-3 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wide">Change to Return:</span>
                      <span className="text-lg font-black">৳{(paidAmount - grandTotal).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wide">Remaining Due:</span>
                      <span className="text-lg font-black">৳{(grandTotal - paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Price Summary Breakdown */}
                <div className="pt-3 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>৳{subTotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-green-600">
                      <span>Discount:</span>
                      <span>-৳{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Tax:</span>
                      <span>৳{tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-foreground pt-1.5 border-t border-dashed border-border">
                    <span>Grand Total:</span>
                    <span>৳{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                <Button 
                  className={`flex-1 rounded-xl text-white font-semibold transition-all ${
                    paidAmount >= grandTotal 
                      ? 'bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/15' 
                      : 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/15'
                  }`} 
                  onClick={handleConfirmOrder} 
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : paidAmount >= grandTotal ? "Confirm & Pay" : "Confirm (Part Paid)"}
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
            <DialogTitle className="text-center text-foreground"><span className="flex items-center gap-2 justify-center"><FaMoneyBillWave /> Change Amount</span></DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className={`text-5xl font-black mb-2 ${changeAmount >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              ৳{Math.abs(changeAmount).toFixed(2)}
            </div>
            <Button className="w-full h-12 text-base" onClick={handleNewSale}>New Sale (Press Enter)</Button>
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
                {selectedItemForVariants.variants?.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-3 first:pt-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-md overflow-hidden relative flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
                        {selectedItemForVariants.imageUrl ? (
                          <img src={selectedItemForVariants.imageUrl} alt={v.sku} className="object-cover w-full h-full" />
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
            <DialogTitle><span className="flex items-center gap-2"><FaUsers /> Add New Customer</span></DialogTitle>
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
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email *</label>
              <Input 
                type="email"
                value={newCustomerData.email}
                onChange={e => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="customer@domain.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone</label>
              <Input 
                value={newCustomerData.phone}
                onChange={e => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+8801XXXXXXXXX"
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
      <Dialog open={isReturnModalOpen} onOpenChange={(open) => { setIsReturnModalOpen(open); if(!open) { setReturnSaleDetails(null); setReturnItemsState([]); setBarcodeInput(""); } }}>
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
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
                        options={items.flatMap(item => {
                          if (item.variants && item.variants.length > 0) {
                            return item.variants.map(v => ({
                              value: `${item.id}:${v.id}`,
                              label: `${item.name || item.description} - ${v.color} / ${v.size} (${v.sku})`
                            }));
                          } else {
                            return [{
                              value: item.id,
                              label: item.name || item.description
                            }];
                          }
                        })}
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
                          const price = variant ? (variant.salesPrice || item.unitPrice) : item.unitPrice;
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
                                <div className="flex items-center justify-center gap-2">
                                  <Button size="icon" variant="outline" className="h-6 w-6 rounded-full" onClick={() => handleUpdateReturnQty(state.itemId, state.returnQty - 1, state.variantId)}>-</Button>
                                  <span className="w-8 text-center text-sm font-semibold">{state.returnQty}</span>
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
                  <Button variant="outline" onClick={() => { setIsReturnModalOpen(false); setReturnItemsState([]); setBarcodeInput(""); }}>Cancel</Button>
                  <Button variant="default" onClick={() => handleProcessVoidReturn()} disabled={isReturning || returnItemsState.length === 0}>{isReturning ? "Processing..." : "Process Void Return"}</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="invoice-return" className="py-4">
              <div className="flex gap-4 mb-4 border-b pb-2">
                <Button variant={returnMode === "invoice" ? "default" : "outline"} onClick={() => setReturnMode("invoice")}>By Invoice</Button>
                <Button variant={returnMode === "customer" ? "default" : "outline"} onClick={() => setReturnMode("customer")}>By Customer</Button>
              </div>
              
              {returnMode === "invoice" ? (
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
                    options={clients.map(c => ({ value: c.id, label: c.name || c.email || "Unnamed Customer" }))}
                    value={returnCustomerId || null}
                    onValueChange={(val) => setReturnCustomerId(val || "")}
                    placeholder="Search Customer..."
                  />
                  {isFetchingCustomerSales && <p className="text-xs text-muted-foreground mt-1">Loading sales...</p>}
                  {!isFetchingCustomerSales && customerSales.length > 0 && (
                    <div className="mt-4 border rounded-lg p-2 max-h-[30vh] overflow-y-auto flex flex-col gap-2 bg-muted/5">
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
              )}

              {returnSaleDetails && (
                <div className="mt-4 border rounded-lg p-4 bg-muted/10">
                  <p className="font-bold text-sm mb-3">Sale Items (Select Quantities to Return)</p>
                  <div className="max-h-[30vh] overflow-y-auto flex flex-col gap-2">
                    {returnSaleDetails.items.map((item: any) => {
                      const state = returnItemsState.find(i => i.itemId === item.itemId && (item.variantId ? i.variantId === item.variantId : !i.variantId));
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-background border rounded-lg p-3 shadow-sm hover:border-primary/20 transition-all">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm font-semibold text-foreground">{item.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Purchased: {item.originalQuantity ?? item.quantity}
                              {Number(item.returnedQuantity || 0) > 0 && ` (Returned: ${item.returnedQuantity})`}
                              {` | ৳${item.unitPrice}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleUpdateReturnQty(item.itemId, (state?.returnQty || 0) - 1, item.variantId)}>-</Button>
                            <span className="w-8 text-center text-sm font-semibold">{state?.returnQty || 0}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleUpdateReturnQty(item.itemId, (state?.returnQty || 0) + 1, item.variantId)}>+</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setIsReturnModalOpen(false); setReturnSaleDetails(null); setReturnItemsState([]); setBarcodeInput(""); }}>Cancel</Button>
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
                      onClick={() => handleDeleteHeldCart(hc.id)}
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

    </div>
  );
}
