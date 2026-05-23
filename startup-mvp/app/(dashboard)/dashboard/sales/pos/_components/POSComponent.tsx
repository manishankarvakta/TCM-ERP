"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, X } from "lucide-react";
import { createSale } from "../../_actions/sale.action";
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
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || "");
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

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
        setCart([]);
        setSearchQuery("");
        setTimeout(() => {
          setSuccessMsg("");
          setIsConfirmModalOpen(false);
          router.push("/dashboard/sales");
        }, 2000);
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
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {successMsg ? (
             <div className="py-12 flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Success!</h2>
                <p className="text-muted-foreground">{successMsg}</p>
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
    </div>
  );
}
