"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, X, Undo2, Hand, RefreshCcw, Printer, Check } from "lucide-react";
import { createSale, getSalesByClient, getLastSaleId } from "../../_actions/sale.action";
import { useRouter } from "next/navigation";
import { useToastContext } from "@/components/ui/providers/toast-provider";

type ItemType = "READY_PRODUCT" | "RETAIL" | "WHOLESALE";

interface Item {
  id: string;
  code: string;
  description: string;
  unit: string;
  unitPrice: number;
  wholesalePrice?: number;
  itemType: ItemType;
  category?: string | null;
  imageUrl: string | null;
  stocks: { warehouseId: string; quantity: number }[];
}

interface Client {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface CartItem extends Item {
  cartQuantity: number;
}

interface POSComponentProps {
  items: Item[];
  clients: Client[];
  warehouses: Warehouse[];
}

export default function POSComponent({ items, clients, warehouses }: POSComponentProps) {
  const router = useRouter();
  const { toast } = useToastContext();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [orderType, setOrderType] = useState<"RETAIL" | "WHOLESALE">("RETAIL");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [isReturnMode, setIsReturnMode] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients.find(c => c.name?.toLowerCase() === "walkway customer")?.id || clients[0]?.id || "");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || "");
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [heldCarts, setHeldCarts] = useState<CartItem[][]>([]);
  const [completedSaleData, setCompletedSaleData] = useState<{ id: string, change: number, saleNumber: string } | null>(null);
  // Invoice Return Modal State
  const [isInvoiceReturnModalOpen, setIsInvoiceReturnModalOpen] = useState(false);
  const [invoiceReturnNumber, setInvoiceReturnNumber] = useState("");
  const [invoiceReturnData, setInvoiceReturnData] = useState<any>(null);
  const [invoiceReturnItems, setInvoiceReturnItems] = useState<any[]>([]);
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);

  const handleOpenInvoiceReturnModal = () => {
    setIsInvoiceReturnModalOpen(true);
    setInvoiceReturnNumber("");
    setInvoiceReturnData(null);
    setInvoiceReturnItems([]);
  };

  const handleSearchInvoiceReturn = async () => {
    if (!invoiceReturnNumber) return;
    setIsSearchingInvoice(true);
    // @ts-ignore
    const { getSaleByInvoiceNumber } = await import("../../_actions/sale.action");
    const res = await getSaleByInvoiceNumber(invoiceReturnNumber);
    if (res.success && res.sale) {
      setInvoiceReturnData(res.sale);
      setInvoiceReturnItems(res.sale.items.map((i: any) => ({
        ...i,
        selected: false,
        qtyToReturn: 0
      })));
    } else {
      toast({ title: "Error", description: res.error || "Invoice not found", variant: "destructive" });
    }
    setIsSearchingInvoice(false);
  };

  const handleToggleInvoiceReturnItem = (id: string, checked: boolean) => {
    setInvoiceReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, selected: checked, qtyToReturn: checked ? 1 : 0 };
      }
      return item;
    }));
  };

  const handleUpdateInvoiceReturnQty = (id: string, qty: number) => {
    setInvoiceReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        let newQty = Math.max(1, qty);
        newQty = Math.min(newQty, item.quantity); // Cannot exceed sold quantity
        return { ...item, qtyToReturn: newQty, selected: true };
      }
      return item;
    }));
  };

  const handleProcessInvoiceReturn = async () => {
    const itemsToReturn = invoiceReturnItems.filter(i => i.selected && i.qtyToReturn > 0);
    if (itemsToReturn.length === 0) return;
    if (!selectedWarehouseId) {
      toast({ title: "Warning", description: "Select warehouse first", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const clientIdToUse = invoiceReturnData?.clientId || selectedClientId || warehouses[0]?.id; // Fallback

      const saleItems = itemsToReturn.map((item) => ({
        itemId: item.itemId,
        description: item.productName,
        quantity: -item.qtyToReturn, // Negative for return
        unitPrice: item.price,
        amount: - (item.price * item.qtyToReturn),
      }));

      const { createSale } = await import("../../_actions/sale.action");
      const res = await createSale({
        clientId: clientIdToUse,
        warehouseId: selectedWarehouseId,
        date: new Date(),
        status: "COMPLETED",
        orderType: orderType as any,
        notes: `Return for Invoice: ${invoiceReturnData?.saleNumber}`,
        tax: 0,
        discount: 0,
        items: saleItems,
      });

      if (res.success) {
        toast({ title: "Success", description: "Return invoice created successfully" });
        setIsInvoiceReturnModalOpen(false);
        if (res.sale?.id) {
           window.open(`/print/invoice/${res.sale.id}`, '_blank');
        }
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process return", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Void Return Modal State
  const [isVoidReturnModalOpen, setIsVoidReturnModalOpen] = useState(false);
  const [voidReturnSearchQuery, setVoidReturnSearchQuery] = useState("");
  const [voidReturnClientId, setVoidReturnClientId] = useState<string>("");
  const [voidReturnSearchResults, setVoidReturnSearchResults] = useState<any[]>([]);
  const [isSearchingVoidReturn, setIsSearchingVoidReturn] = useState(false);
  const [voidReturnCart, setVoidReturnCart] = useState<any[]>([]);

  const handleOpenVoidReturnModal = () => {
    setIsVoidReturnModalOpen(true);
    setVoidReturnSearchQuery("");
    setVoidReturnClientId("");
    setVoidReturnSearchResults([]);
    setVoidReturnCart([]);
  };

  const handleSearchVoidReturn = async (query: string, clientId: string) => {
    setVoidReturnSearchQuery(query);
    setVoidReturnClientId(clientId);
    
    if (!query && !clientId) {
      setVoidReturnSearchResults([]);
      return;
    }
    
    setIsSearchingVoidReturn(true);
    // @ts-ignore
    const { searchSoldProductsForReturn } = await import("../../_actions/sale.action");
    const res = await searchSoldProductsForReturn(query, clientId);
    if (res.success) {
      setVoidReturnSearchResults(res.items || []);
    }
    setIsSearchingVoidReturn(false);
  };

  const handleAddVoidReturnItem = (item: any) => {
    if (voidReturnCart.find(i => i.id === item.id)) return; // prevent duplicate
    setVoidReturnCart([...voidReturnCart, { ...item, qtyToReturn: 1 }]);
    setVoidReturnSearchQuery("");
    setVoidReturnSearchResults([]);
  };

  const handleUpdateVoidReturnQty = (id: string, qty: number) => {
    setVoidReturnCart(prev => prev.map(item => {
      if (item.id === id) {
        let newQty = Math.max(1, qty);
        newQty = Math.min(newQty, item.soldQuantity); // Cannot exceed sold quantity
        return { ...item, qtyToReturn: newQty };
      }
      return item;
    }));
  };

  const handleRemoveVoidReturnItem = (id: string) => {
    setVoidReturnCart(prev => prev.filter(i => i.id !== id));
  };

  const handleProcessVoidReturn = async () => {
    if (voidReturnCart.length === 0) return;
    if (!selectedWarehouseId) {
      toast({ title: "Warning", description: "Select warehouse first", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const clientIdToUse = voidReturnClientId || selectedClientId || warehouses[0]?.id; // Fallback

      const saleItems = voidReturnCart.map((item) => ({
        itemId: item.itemId,
        description: item.productName,
        quantity: -item.qtyToReturn, // Negative for return
        unitPrice: item.mrp,
        amount: - (item.mrp * item.qtyToReturn),
      }));

      const res = await createSale({
        clientId: clientIdToUse,
        warehouseId: selectedWarehouseId,
        date: new Date(),
        status: "COMPLETED",
        orderType: orderType as any,
        notes: `Void Return (Refs: ${Array.from(new Set(voidReturnCart.map(i => i.saleNumber))).join(', ')})`,
        tax: 0,
        discount: 0,
        items: saleItems,
      });

      if (res.success) {
        toast({ title: "Success", description: "Return created successfully" });
        setIsVoidReturnModalOpen(false);
        if (res.sale?.id) {
           window.open(`/print/invoice/${res.sale.id}`, '_blank');
        }
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process return", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintLastBill = async () => {
    const res = await getLastSaleId();
    if (res.success && res.id) {
      window.open(`/print/invoice/${res.id}`, '_blank');
    } else {
      toast({ title: "Info", description: "No previous bill found." });
    }
  };

  const handleRefreshPOS = () => {
    setSearchQuery("");
    setFilterType("ALL");
    setOrderType("RETAIL");
    setDiscountAmount(0);
    setTaxPercent(0);
    setIsReturnMode(false);
    setCart([]);
    setSelectedClientId(clients.find(c => c.name?.toLowerCase() === "walkway customer")?.id || clients[0]?.id || "");
    setSelectedWarehouseId(warehouses[0]?.id || "");
    setPaymentMethod("CASH");
    setPaidAmount(0);
    // keeping held carts could be optional, but we will clear it if they press hard refresh button
    // setHeldCarts([]); // Actually, let's keep held carts in case they didn't mean to clear them.
    toast({ title: "Refreshed", description: "Order details have been cleared." });
  };




  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
    return cats.sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterType === "ALL" || item.category === filterType;
      const matchesOrderType = item.itemType === orderType;
      return matchesSearch && matchesCategory && matchesOrderType;
    });
  }, [items, searchQuery, filterType, orderType]);

  const subTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.cartQuantity, 0);
  const tax = (subTotal - discountAmount) * (taxPercent / 100);
  const grandTotal = subTotal + tax - discountAmount;
  const dueAmount = grandTotal - paidAmount;

  const handleAddToCart = (item: Item) => {
    const priceToUse = orderType === "WHOLESALE" ? (item.wholesalePrice || item.unitPrice) : item.unitPrice;
    const delta = isReturnMode ? -1 : 1;
    const itemToAdd = { ...item, unitPrice: priceToUse };

    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemToAdd.id);
      if (existing) {
        return prev.map((i) => {
          if (i.id === itemToAdd.id) {
            const newQ = i.cartQuantity + delta;
            return { ...i, cartQuantity: newQ };
          }
          return i;
        }).filter((i) => i.cartQuantity !== 0);
      }
      return [...prev, { ...itemToAdd, cartQuantity: delta }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((i) => {
        if (i.id === itemId) {
          const newQ = i.cartQuantity + delta;
          return { ...i, cartQuantity: newQ };
        }
        return i;
      }).filter((i) => i.cartQuantity !== 0);
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
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
    if (!selectedClientId) {
      toast({
        title: "Warning",
        description: "Customer selection is required to process transaction.",
        variant: "destructive"
      });
      return;
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
        description: item.description,
        quantity: item.cartQuantity,
        unitPrice: item.unitPrice,
        amount: item.unitPrice * item.cartQuantity,
      }));

      // Ignore orderType TS error for now if it doesn't match Prisma exactly due to fresh schema sync
      // The backend accepts "RETAIL" | "READY_PRODUCT"
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
      });

      if (res.success) {
        setSuccessMsg(`Order ${res.sale?.saleNumber} processed successfully!`);
        toast({
          title: "Success",
          description: `Order ${res.sale?.saleNumber} processed successfully!`,
        });
        
        if (res.sale) {
          setCompletedSaleData({
            id: res.sale.id,
            change: dueAmount < 0 ? Math.abs(dueAmount) : 0,
            saleNumber: res.sale.saleNumber
          });
        }
        
        setCart([]);
        setSearchQuery("");
        // Do not close modal yet, wait for user to click Close or Print
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

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Left Side: Product Catalog */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden bg-background">
        {/* Header & Controls */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Product Catalog</h1>
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-none text-foreground"
              />
            </div>
            <Button 
              variant="outline" 
              className="border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => router.push('/dashboard/sales')}
            >
              <X className="w-4 h-4 mr-2" /> Exit POS
            </Button>
          </div>
        </div>

        {/* Filters */}
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

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const displayPrice = orderType === "WHOLESALE" ? (item.wholesalePrice || item.unitPrice) : item.unitPrice;
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
                   <div className="text-lg font-bold text-foreground mb-3">৳{displayPrice.toFixed(2)}</div>
                </div>
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" 
                  onClick={() => handleAddToCart(item)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
            )})}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No products found.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-2 pt-4 border-t border-border shrink-0 overflow-x-auto pb-2">
          <div className="flex items-center w-fit mx-auto rounded-md overflow-hidden border border-border">

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#1f2937] text-white hover:bg-[#1f2937]/90 transition-colors min-w-[120px]"
              onClick={handleOpenVoidReturnModal}
            >
              Void Return <Undo2 className="w-4 h-4" />
            </button>


            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-background text-foreground hover:bg-muted transition-colors border-r border-border min-w-[120px]"
              onClick={handleOpenInvoiceReturnModal}
            >
              Return <Undo2 className="w-4 h-4" />
            </button>
            
            

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#ffb000] text-black hover:bg-[#ffb000]/90 transition-colors min-w-[120px]"
              onClick={() => {
                if(cart.length > 0) {
                  setHeldCarts([...heldCarts, cart]);
                  setCart([]);
                  toast({ title: "Cart Held", description: "Current cart has been put on hold." });
                } else if (heldCarts.length > 0) {
                  const lastHeld = heldCarts[heldCarts.length - 1];
                  setCart(lastHeld);
                  setHeldCarts(heldCarts.slice(0, -1));
                  toast({ title: "Cart Restored", description: "Held cart has been restored." });
                } else {
                  toast({ title: "Hold", description: "No cart to hold or restore." });
                }
              }}
            >
              {heldCarts.length > 0 && cart.length === 0 ? "Resume" : "Hold"} 
              {heldCarts.length > 0 && <span className="ml-1 bg-black text-[#ffb000] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{heldCarts.length}</span>}
              <Hand className="w-4 h-4" />
            </button>

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#0f8c5a] text-white hover:bg-[#0f8c5a]/90 transition-colors min-w-[120px]"
              onClick={handleRefreshPOS}
            >
              Refresh <RefreshCcw className="w-4 h-4" />
            </button>

            <button 
              className="flex items-center justify-center gap-2 h-12 px-6 bg-[#136bfb] text-white hover:bg-[#136bfb]/90 transition-colors min-w-[120px] rounded-r-md"
              onClick={handlePrintLastBill}
            >
              Last Bill <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Cart / Order Details */}
      <div className="w-[450px] flex flex-col bg-card text-card-foreground border-l border-border shadow-md z-10 relative">
        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground shrink-0">Ordr Details</h2>
            
            <div className="flex items-center gap-2">
                             
               <div className="flex bg-muted p-1 rounded-lg">
                  <button 
                    onClick={() => { if (orderType !== "RETAIL") { setOrderType("RETAIL"); setCart([]); setDiscountAmount(0); setIsReturnMode(false); } }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${orderType === "RETAIL" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Retail
                  </button>
                  <button 
                    onClick={() => { if (orderType !== "WHOLESALE") { setOrderType("WHOLESALE"); setCart([]); setDiscountAmount(0); setIsReturnMode(false); } }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${orderType === "WHOLESALE" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Wholesale
                  </button>
               </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Customer Information <span className="text-destructive text-sm">*</span>
              </label>
              <select 
                className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Select Customer...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.email}</option>
                ))}
              </select>
            </div>
            <div>
               <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                 Warehouse <span className="text-destructive text-sm">*</span>
               </label>
               <select 
                className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6 border-y border-border">
             <div className="py-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                    <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-md shrink-0 flex items-center justify-center relative overflow-hidden">
                         {item.imageUrl ? (
                           <img src={item.imageUrl} alt={item.description} className="object-cover w-full h-full" />
                         ) : (
                           <span className="text-[10px] text-muted-foreground px-1 text-center truncate">{item.code}</span>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.description}</p>
                        <p className="text-sm font-bold text-foreground mt-1">৳{item.unitPrice.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-muted rounded-full border border-border px-1 py-1">
                        <button 
                          className="w-6 h-6 flex items-center justify-center bg-background rounded-full border border-border shadow-sm text-muted-foreground hover:text-foreground"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-4 text-center text-foreground">{item.cartQuantity}</span>
                        <button 
                          className="w-6 h-6 flex items-center justify-center bg-background rounded-full border border-border shadow-sm text-muted-foreground hover:text-foreground"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Order Summary */}
          <div className="pt-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Order Summary</h3>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item ({cart.length})</span>
                <span className="font-medium text-foreground">৳{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground font-medium">Discount</span>
                <div className="flex items-center gap-2 w-32">
                  <span className="text-muted-foreground font-medium">৳</span>
                  <Input 
                    type="number" 
                    value={discountAmount || ""} 
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="h-10 px-3 text-right text-base font-medium"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground font-medium">Tax (%)</span>
                <div className="flex items-center gap-2 w-32">
                  <Input 
                    type="number" 
                    value={taxPercent || ""} 
                    onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    className="h-10 px-3 text-right text-base font-medium"
                  />
                  <span className="text-muted-foreground font-medium">%</span>
                </div>
              </div>
              <div className="border-t border-border border-dashed pt-3 flex justify-between items-center">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-black text-foreground">৳{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-6 h-14 text-lg font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
              onClick={handleProcessTransaction}
              disabled={cart.length === 0}
            >
              Process Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog 
        open={isConfirmModalOpen} 
        onOpenChange={(open) => {
          setIsConfirmModalOpen(open);
          if (!open) {
            setCompletedSaleData(null);
            setSuccessMsg("");
          }
        }}
      >
        <DialogContent 
          className={completedSaleData ? "sm:max-w-md p-0 overflow-hidden" : "sm:max-w-4xl p-0 overflow-hidden"}
          onKeyDown={(e) => {
            if (completedSaleData && e.key === "Enter") {
              setIsConfirmModalOpen(false);
              setCompletedSaleData(null);
            }
          }}
        >
          {completedSaleData ? (
            <div className="p-8 flex flex-col items-center justify-center text-center bg-background">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Sale Completed!</h2>
              <p className="text-muted-foreground mb-6">Invoice Number: {completedSaleData.saleNumber}</p>
              
              <div className="bg-muted w-full rounded-lg p-6 mb-8 border border-border">
                <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Change Amount</div>
                <div className="text-5xl font-bold text-green-600">৳{completedSaleData.change.toFixed(2)}</div>
              </div>

              <div className="flex gap-4 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-lg font-semibold" 
                  onClick={() => { setIsConfirmModalOpen(false); setCompletedSaleData(null); }}
                  autoFocus
                >
                  Close (Enter)
                </Button>
                <Button 
                  className="flex-1 h-12 text-lg font-semibold bg-[#ffb000] text-black hover:bg-[#ffb000]/90" 
                  onClick={() => {
                    window.open(`/print/invoice/${completedSaleData.id}`, '_blank');
                    setIsConfirmModalOpen(false);
                    setCompletedSaleData(null);
                  }}
                >
                  Print <Printer className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
              {/* Left Side: Order Details */}
              <div className="flex-1 bg-muted/30 p-6 overflow-y-auto border-r border-border">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-bold text-foreground">Confirm Order ({orderType.replace('_', ' ')})</DialogTitle>
                </DialogHeader>
                
                <div className="bg-background rounded-lg border border-border p-4 mb-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground mb-1">Customer</p>
                      <p className="font-medium">{clients.find(c => c.id === selectedClientId)?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Warehouse</p>
                      <p className="font-medium">{warehouses.find(w => w.id === selectedWarehouseId)?.name || "Unknown"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-background rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium">Item</th>
                        <th className="text-center py-2 px-3 font-medium">Qty</th>
                        <th className="text-right py-2 px-3 font-medium">Price</th>
                        <th className="text-right py-2 px-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cart.map((item) => (
                        <tr key={item.id} className={item.cartQuantity < 0 ? "bg-destructive/5" : ""}>
                          <td className="py-2 px-3">
                            <p className="font-medium text-foreground truncate max-w-[150px]" title={item.description}>{item.description}</p>
                            <p className="text-[10px] text-muted-foreground">{item.code}</p>
                          </td>
                          <td className={`text-center py-2 px-3 font-medium ${item.cartQuantity < 0 ? "text-destructive" : ""}`}>{item.cartQuantity}</td>
                          <td className="text-right py-2 px-3">৳{item.unitPrice.toFixed(2)}</td>
                          <td className={`text-right py-2 px-3 font-medium ${item.cartQuantity < 0 ? "text-destructive" : ""}`}>৳{(item.cartQuantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Payment & Summary */}
              <div className="w-full md:w-[350px] bg-background p-6 flex flex-col">
                <div className="space-y-3 mb-6 flex-1">
                   <h3 className="font-bold text-foreground mb-4">Payment Summary</h3>
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Subtotal:</span>
                     <span className="font-medium">৳{subTotal.toFixed(2)}</span>
                   </div>
                   {discountAmount > 0 && (
                     <div className="flex justify-between text-sm text-green-600">
                       <span>Discount:</span>
                       <span>-৳{discountAmount.toFixed(2)}</span>
                     </div>
                   )}
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Tax ({taxPercent}%):</span>
                     <span className="font-medium">৳{tax.toFixed(2)}</span>
                   </div>
                   <div className="border-t border-border border-dashed my-3 pt-3 flex justify-between text-lg font-bold text-foreground">
                     <span>Grand Total:</span>
                     <span>৳{grandTotal.toFixed(2)}</span>
                   </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-1 block text-foreground">Payment Method</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm ring-offset-background"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Credit/Debit Card</option>
                      <option value="MOBILE">Mobile Banking</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block text-foreground">Paid Amount</label>
                    <Input 
                      type="number" 
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="text-lg font-bold bg-background text-foreground h-12"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block text-foreground">Due / Change</label>
                    <div className={`h-12 flex items-center px-4 rounded-md border text-xl font-bold ${dueAmount > 0 ? 'text-destructive bg-destructive/10' : 'text-green-600 bg-green-500/10'}`}>
                      ৳{Math.abs(dueAmount).toFixed(2)} {dueAmount <= 0 && '(Change)'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto">
                  <Button variant="outline" className="flex-1" onClick={() => setIsConfirmModalOpen(false)} disabled={isProcessing}>
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleConfirmOrder} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Confirm & Pay"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Return Modal */}
      <Dialog open={isVoidReturnModalOpen} onOpenChange={setIsVoidReturnModalOpen}>
        <DialogContent className="sm:max-w-5xl overflow-hidden p-0 flex flex-col h-[85vh]">
          <DialogHeader className="p-4 border-b border-border shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">
              Void Return
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
             {/* Top Search Bar */}
             <div className="flex gap-4">
               <div className="flex-1 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search product to return..."
                   value={voidReturnSearchQuery}
                   onChange={(e) => handleSearchVoidReturn(e.target.value, voidReturnClientId)}
                   className="pl-9 bg-muted"
                 />
                 {voidReturnSearchResults.length > 0 && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                     {voidReturnSearchResults.map(item => (
                       <div 
                         key={item.id} 
                         className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                         onClick={() => handleAddVoidReturnItem(item)}
                       >
                         <div className="flex justify-between items-center">
                           <span className="font-medium text-foreground">{item.productName} ({item.productCode})</span>
                           <span className="text-sm font-bold text-foreground">৳{item.mrp.toFixed(2)}</span>
                         </div>
                         <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                           <span>Invoice: {item.saleNumber} | {new Date(item.date).toLocaleDateString()}</span>
                           <span>Sold Qty: {item.soldQuantity}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               <div className="w-64">
                 <select 
                   className="w-full h-10 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
                   value={voidReturnClientId}
                   onChange={(e) => handleSearchVoidReturn(voidReturnSearchQuery, e.target.value)}
                 >
                   <option value="">All Customers...</option>
                   {clients.map(c => (
                     <option key={c.id} value={c.id}>{c.name || c.email}</option>
                   ))}
                 </select>
               </div>
             </div>

             {/* Table */}
             <div className="border border-border rounded-md overflow-hidden bg-background">
               <table className="w-full text-sm">
                 <thead className="bg-muted text-muted-foreground">
                   <tr>
                     <th className="py-2 px-3 text-left">#</th>
                     <th className="py-2 px-3 text-left">Product</th>
                     <th className="py-2 px-3 text-left">Group</th>
                     <th className="py-2 px-3 text-right">TP</th>
                     <th className="py-2 px-3 text-right">MRP</th>
                     <th className="py-2 px-3 text-center w-28">Quantity</th>
                     <th className="py-2 px-3 text-right">Price</th>
                     <th className="py-2 px-3 text-right">Discount</th>
                     <th className="py-2 px-3 text-right">Total</th>
                     <th className="py-2 px-3 text-right">Sub-Total</th>
                     <th className="py-2 px-3 text-center"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   {voidReturnCart.length === 0 ? (
                     <tr>
                       <td colSpan={11} className="py-8 text-center text-muted-foreground">
                         Search and select a product to return.
                       </td>
                     </tr>
                   ) : voidReturnCart.map((item, index) => {
                     const total = item.qtyToReturn * item.mrp;
                     return (
                       <tr key={item.id} className="hover:bg-muted/30">
                         <td className="py-2 px-3 font-medium">{index + 1}</td>
                         <td className="py-2 px-3">
                           <div className="font-medium text-foreground">{item.productName}</div>
                           <div className="text-[10px] text-muted-foreground">Inv: {item.saleNumber} | Sold: {item.soldQuantity}</div>
                         </td>
                         <td className="py-2 px-3 text-muted-foreground">{item.group}</td>
                         <td className="py-2 px-3 text-right">{item.tp.toFixed(2)}</td>
                         <td className="py-2 px-3 text-right">{item.mrp.toFixed(2)}</td>
                         <td className="py-2 px-3">
                           <Input 
                             type="number"
                             min={1}
                             max={item.soldQuantity}
                             value={item.qtyToReturn || ""}
                             onChange={(e) => handleUpdateVoidReturnQty(item.id, Number(e.target.value))}
                             className="h-8 text-center w-full"
                           />
                         </td>
                         <td className="py-2 px-3 text-right">0.00</td>
                         <td className="py-2 px-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <Input className="h-8 w-16 text-right" value={item.discount || ""} disabled /> <span className="text-muted-foreground">%</span>
                           </div>
                         </td>
                         <td className="py-2 px-3 text-right text-foreground font-medium">{total.toFixed(2)}</td>
                         <td className="py-2 px-3 text-right text-foreground font-medium">{total.toFixed(2)}</td>
                         <td className="py-2 px-3 text-center">
                           <button onClick={() => handleRemoveVoidReturnItem(item.id)} className="text-muted-foreground hover:text-destructive">
                             <X className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>

             {/* Summary */}
             <div className="flex justify-between items-center text-sm font-bold bg-muted/30 p-4 border border-border rounded-md text-foreground">
               <div>Item No: {voidReturnCart.length}</div>
               <div>Total: -{voidReturnCart.reduce((a, b) => a + (b.qtyToReturn * b.mrp), 0).toFixed(2)}</div>
               <div>Gross Total: -{voidReturnCart.reduce((a, b) => a + (b.qtyToReturn * b.mrp), 0).toFixed(2)}</div>
               <div>Round Total: -{Math.round(voidReturnCart.reduce((a, b) => a + (b.qtyToReturn * b.mrp), 0))}</div>
             </div>
             
             <div className="flex justify-between items-center py-4 px-2">
                <div className="font-bold text-lg text-foreground">
                  Return Amount: {Math.round(voidReturnCart.reduce((a, b) => a + (b.qtyToReturn * b.mrp), 0))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsVoidReturnModalOpen(false)}>Close</Button>
                  <Button 
                    className="bg-[#1f2937] text-white hover:bg-black"
                    onClick={handleProcessVoidReturn}
                    disabled={isProcessing || voidReturnCart.length === 0}
                  >
                    {isProcessing ? "Processing..." : "Create Return"}
                  </Button>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Invoice Return Modal */}
      <Dialog open={isInvoiceReturnModalOpen} onOpenChange={setIsInvoiceReturnModalOpen}>
        <DialogContent className="sm:max-w-4xl overflow-hidden p-0 flex flex-col h-[85vh]">
          <DialogHeader className="p-4 border-b border-border shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">
              Return Product | Invoice No: {invoiceReturnData?.saleNumber || "---"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
             {/* Scan Invoice */}
             <div className="flex items-center gap-4 bg-muted/30 p-4 border border-border rounded-md">
               <span className="font-semibold whitespace-nowrap text-foreground">Scan Invoice</span>
               <div className="flex-1 relative">
                 <Input 
                   placeholder="Scan Invoice here or paste number"
                   value={invoiceReturnNumber}
                   onChange={(e) => setInvoiceReturnNumber(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") {
                       handleSearchInvoiceReturn();
                     }
                   }}
                   className="bg-background text-foreground pr-24"
                 />
                 <Button 
                   size="sm" 
                   onClick={handleSearchInvoiceReturn} 
                   className="absolute right-1 top-1 bottom-1 h-auto"
                   disabled={isSearchingInvoice || !invoiceReturnNumber}
                 >
                   Load
                 </Button>
               </div>
             </div>

             {/* Invoice Info Details */}
             {invoiceReturnData && (
               <>
                 <div className="grid grid-cols-4 gap-4 text-sm mt-4 border-b border-border pb-4 text-foreground">
                   <div>
                     <span className="font-bold">Client:</span> {invoiceReturnData.clientName}
                   </div>
                   <div>
                     <span className="font-bold">Biller:</span> {invoiceReturnData.billerName}
                   </div>
                   <div>
                     <span className="font-bold">Date:</span> {new Date(invoiceReturnData.date).toLocaleDateString()}
                   </div>
                   <div>
                     <span className="font-bold">Old:</span> 0
                   </div>
                   
                   <div>
                     <span className="font-bold">Item No:</span> {invoiceReturnData.items.length}
                   </div>
                   <div>
                     <span className="font-bold">Total:</span> {invoiceReturnData.grandTotal.toFixed(2)}
                   </div>
                   <div>
                     <span className="font-bold">Vat:</span> {invoiceReturnData.tax.toFixed(2)}
                   </div>
                   <div>
                     <span className="font-bold">Round Total:</span> {Math.round(invoiceReturnData.grandTotal)}
                   </div>
                 </div>

                 {/* Table */}
                 <div className="border border-border rounded-md overflow-hidden bg-background">
                   <table className="w-full text-sm">
                     <thead className="bg-muted text-muted-foreground">
                       <tr>
                         <th className="py-2 px-3 text-left w-10">#</th>
                         <th className="py-2 px-3 text-left">Product</th>
                         <th className="py-2 px-3 text-left">Price</th>
                         <th className="py-2 px-3 text-center w-28">Quantity</th>
                         <th className="py-2 px-3 text-right">Vat</th>
                         <th className="py-2 px-3 text-right">Sub-Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                       {invoiceReturnItems.map((item) => {
                         const subTotal = item.qtyToReturn * item.price;
                         return (
                           <tr key={item.id} className="hover:bg-muted/30">
                             <td className="py-2 px-3">
                               <Checkbox 
                                 checked={item.selected}
                                 onCheckedChange={(c) => handleToggleInvoiceReturnItem(item.id, c as boolean)}
                               />
                             </td>
                             <td className="py-2 px-3 font-medium text-foreground">
                               {item.productName}
                             </td>
                             <td className="py-2 px-3 text-foreground">{item.price.toFixed(2)}</td>
                             <td className="py-2 px-3">
                               <Input 
                                 type="number"
                                 min={1}
                                 max={item.quantity}
                                 value={item.qtyToReturn || ""}
                                 onChange={(e) => handleUpdateInvoiceReturnQty(item.id, Number(e.target.value))}
                                 disabled={!item.selected}
                                 className="h-8 text-center w-full"
                               />
                               <div className="text-[10px] text-center text-muted-foreground mt-1">Sold: {item.quantity}</div>
                             </td>
                             <td className="py-2 px-3 text-right text-foreground">{item.vat.toFixed(2)}</td>
                             <td className="py-2 px-3 text-right text-foreground font-medium">{subTotal.toFixed(2)}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>

                 {/* Return Info Summary */}
                 <div className="mt-4">
                   <h3 className="font-bold text-foreground mb-2">Return Info</h3>
                   <div className="flex justify-between items-center text-sm border-t border-border pt-4 pb-2 text-foreground font-bold">
                     <div>
                       Item No: {invoiceReturnItems.filter(i => i.selected && i.qtyToReturn > 0).length}
                     </div>
                     <div>
                       Total: {invoiceReturnItems.reduce((a, b) => a + (b.qtyToReturn * b.price), 0).toFixed(2)}
                     </div>
                     <div>
                       Vat: 0.00
                     </div>
                     <div>
                       GrossTotalRound: {Math.round(invoiceReturnItems.reduce((a, b) => a + (b.qtyToReturn * b.price), 0)).toFixed(2)}
                     </div>
                     <div>
                       Point: 0
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                   <Button variant="outline" onClick={() => setIsInvoiceReturnModalOpen(false)}>Cancel</Button>
                   <Button 
                     className="bg-[#1f2937] text-white hover:bg-black"
                     onClick={handleProcessInvoiceReturn}
                     disabled={isProcessing || invoiceReturnItems.filter(i => i.selected && i.qtyToReturn > 0).length === 0}
                   >
                     {isProcessing ? "Processing..." : "Create Return"}
                   </Button>
                 </div>
               </>
             )}
             
             {!invoiceReturnData && (
                <div className="text-center py-20 text-muted-foreground">
                   Scan or enter an invoice number to load return data.
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
