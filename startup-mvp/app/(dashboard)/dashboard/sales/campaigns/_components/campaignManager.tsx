"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import {
  FiZap,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiPercent,
  FiDollarSign,
  FiCalendar,
  FiCheck,
  FiRefreshCw,
  FiTag,
  FiClock,
  FiAlertCircle,
  FiBriefcase,
  FiGrid,
  FiCheckSquare,
} from "react-icons/fi";
import {
  searchProductsForCampaign,
  applyPromotionalCampaign,
  getActivePromotions,
  clearPromotions,
  getCampaignFilterOptions,
} from "../_actions/campaign.action";

interface CampaignItemSelection {
  id: string;
  code: string;
  name: string;
  barcode?: string | null;
  salesPrice: number;
  costPrice: number;
  discount: number;
  isPromo: boolean;
  promoStartsAt?: string | null;
  promoEndsAt?: string | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  unit?: { symbol: string } | null;
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
}

interface CampaignManagerProps {
  initialActivePromos: any[];
}

export default function CampaignManager({ initialActivePromos }: CampaignManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"create" | "active">("create");

  // Dropdown filter options (Categories & Brands/Companies)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Campaign Form State
  const [selectedItems, setSelectedItems] = useState<CampaignItemSelection[]>([]);
  const [globalStartDate, setGlobalStartDate] = useState<string>("");
  const [globalDate, setGlobalDate] = useState<string>("");
  const [globalDiscountType, setGlobalDiscountType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number | "">(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Promotions List State
  const [activePromos, setActivePromos] = useState<any[]>(initialActivePromos);
  const [selectedPromoIds, setSelectedPromoIds] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch filter options on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      const res = await getCampaignFilterOptions();
      if (res.success) {
        setCategories(res.categories || []);
        setBrands(res.brands || []);
      }
    };
    fetchFilters();
    handleSearch("", "ALL", "ALL");
  }, []);

  const handleSearch = async (query: string = searchQuery, catId: string = selectedCategory, bId: string = selectedBrand) => {
    setIsSearching(true);
    try {
      const res = await searchProductsForCampaign(query, catId, bId);
      if (res.success && res.items) {
        setSearchResults(res.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    handleSearch(q, selectedCategory, selectedBrand);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    handleSearch(searchQuery, val, selectedBrand);
  };

  const handleBrandChange = (val: string) => {
    setSelectedBrand(val);
    handleSearch(searchQuery, selectedCategory, val);
  };

  const addProductToCampaign = (item: any) => {
    if (selectedItems.some((i) => i.id === item.id)) {
      toast({
        title: "Product already added",
        description: `${item.name} is already in the campaign list.`,
      });
      return;
    }

    const newItem: CampaignItemSelection = {
      ...item,
      discountType: globalDiscountType,
      discountValue: typeof globalDiscountValue === "number" ? globalDiscountValue : 0,
    };

    setSelectedItems((prev) => [...prev, newItem]);
  };

  const addAllFilteredProducts = () => {
    const unadded = searchResults.filter((prod) => !selectedItems.some((i) => i.id === prod.id));
    if (unadded.length === 0) {
      toast({
        title: "All products added",
        description: "All products in the current search/filter view are already in your campaign list.",
      });
      return;
    }

    const newEntries: CampaignItemSelection[] = unadded.map((item) => ({
      ...item,
      discountType: globalDiscountType,
      discountValue: typeof globalDiscountValue === "number" ? globalDiscountValue : 0,
    }));

    setSelectedItems((prev) => [...prev, ...newEntries]);
    toast({
      title: "Bulk Added Products",
      description: `Added ${newEntries.length} products to your campaign list.`,
    });
  };

  const removeProductFromCampaign = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const applyGlobalToAll = () => {
    if (typeof globalDiscountValue !== "number" || globalDiscountValue < 0) return;
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        discountType: globalDiscountType,
        discountValue: globalDiscountValue,
      }))
    );
    toast({
      title: "Global settings applied",
      description: `Applied ${globalDiscountValue}${globalDiscountType === "PERCENT" ? "%" : "৳"} to all selected products.`,
    });
  };

  const updateItemDiscount = (id: string, field: "discountType" | "discountValue", value: any) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const calculateEffectivePrice = (salesPrice: number, discountType: "PERCENT" | "AMOUNT", discountValue: number) => {
    let disc = 0;
    if (discountType === "PERCENT") {
      disc = (salesPrice * discountValue) / 100;
    } else {
      disc = discountValue;
    }
    disc = Math.min(salesPrice, Math.max(0, disc));
    return {
      discountAmount: Math.round(disc * 100) / 100,
      finalPrice: Math.round((salesPrice - disc) * 100) / 100,
    };
  };

  const handleApplyCampaign = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No products selected",
        description: "Please search and select at least one product.",
        variant: "destructive",
      });
      return;
    }

    if (!globalDate) {
      toast({
        title: "Expiration date missing",
        description: "Please select a promotion expiration date.",
        variant: "destructive",
      });
      return;
    }

    if (globalStartDate && globalDate && new Date(globalStartDate) > new Date(globalDate)) {
      toast({
        title: "Invalid Date Window",
        description: "Start date cannot be after the expiration date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await applyPromotionalCampaign({
        promoStartsAt: globalStartDate ? new Date(globalStartDate).toISOString() : null,
        promoEndsAt: new Date(globalDate).toISOString(),
        items: selectedItems.map((item) => ({
          id: item.id,
          discountType: item.discountType,
          discountValue: Number(item.discountValue) || 0,
        })),
      });

      if (res.success) {
        toast({
          title: "Campaign Created Successfully!",
          description: res.message,
        });
        setSelectedItems([]);
        // Refresh active promotions list
        const activeRes = await getActivePromotions();
        if (activeRes.success && activeRes.items) {
          setActivePromos(activeRes.items);
        }
        setActiveTab("active");
      } else {
        toast({
          title: "Failed to create campaign",
          description: res.error || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit campaign",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Active Promotions Tab Handlers
  const refreshActivePromos = async () => {
    const res = await getActivePromotions();
    if (res.success && res.items) {
      setActivePromos(res.items);
      setSelectedPromoIds([]);
    }
  };

  const handleClearSelectedPromos = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsClearing(true);
    try {
      const res = await clearPromotions(ids);
      if (res.success) {
        toast({
          title: "Promotions Cleared",
          description: res.message,
        });
        refreshActivePromos();
      } else {
        toast({
          title: "Failed to clear promotions",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const toggleSelectAllPromos = () => {
    if (selectedPromoIds.length === activePromos.length) {
      setSelectedPromoIds([]);
    } else {
      setSelectedPromoIds(activePromos.map((p) => p.id));
    }
  };

  const getPromoStatus = (startsAt?: string | null, endsAt?: string | null) => {
    const now = new Date();
    if (startsAt && now < new Date(startsAt)) {
      return { status: "SCHEDULED", label: "Scheduled", variant: "outline" as const, colorClass: "border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/20" };
    }
    if (endsAt && now > new Date(endsAt)) {
      return { status: "EXPIRED", label: "Expired", variant: "destructive" as const, colorClass: "" };
    }
    return { status: "ACTIVE", label: "Active", variant: "outline" as const, colorClass: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" };
  };

  // Convert brands and categories into options for SearchableSelect
  const brandOptions: SearchableSelectOption[] = [
    { label: "All Companies / Brands", value: "ALL" },
    ...brands.map((b) => ({ label: b.name, value: b.id })),
  ];

  const categoryOptions: SearchableSelectOption[] = [
    { label: "All Categories", value: "ALL" },
    ...categories.map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FiZap className="h-6 w-6 text-amber-500" />
            Promotional Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            Search products by Company/Brand, Category, or keyword, apply percentage or flat discounts, and set campaign window dates.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <FiPlus className="h-4 w-4" /> Create New Campaign
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <FiTag className="h-4 w-4" /> Active Promotions ({activePromos.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Create Campaign */}
        <TabsContent value="create" className="space-y-6 mt-4">
          {/* Top Controls: Expiration Date & Global Settings */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FiCalendar className="h-5 w-5 text-amber-600" />
                1. Campaign Window & Global Discount Rules
              </CardTitle>
              <CardDescription>
                Set the campaign start and expiration dates, and default discount rule for selected items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="promoStartsAt" className="font-semibold text-sm">
                    Start Date <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="promoStartsAt"
                    type="date"
                    value={globalStartDate}
                    onChange={(e) => setGlobalStartDate(e.target.value)}
                    className="mt-1.5 bg-background"
                  />
                </div>

                <div>
                  <Label htmlFor="promoEndsAt" className="font-semibold text-sm">
                    Expiration Date *
                  </Label>
                  <Input
                    id="promoEndsAt"
                    type="date"
                    min={globalStartDate || new Date().toISOString().split("T")[0]}
                    value={globalDate}
                    onChange={(e) => setGlobalDate(e.target.value)}
                    className="mt-1.5 bg-background"
                    required
                  />
                </div>

                <div>
                  <Label className="font-semibold text-sm">Default Discount Mode</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Button
                      type="button"
                      variant={globalDiscountType === "PERCENT" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGlobalDiscountType("PERCENT")}
                      className="flex-1"
                    >
                      <FiPercent className="mr-1 h-4 w-4" /> % Percent
                    </Button>
                    <Button
                      type="button"
                      variant={globalDiscountType === "AMOUNT" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGlobalDiscountType("AMOUNT")}
                      className="flex-1"
                    >
                      <FiDollarSign className="mr-1 h-4 w-4" /> ৳ Amount
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="globalDiscountVal" className="font-semibold text-sm">
                    Default Discount Value
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="globalDiscountVal"
                      type="number"
                      min="0"
                      step="any"
                      value={globalDiscountValue}
                      onChange={(e) => setGlobalDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={globalDiscountType === "PERCENT" ? "e.g. 10%" : "e.g. 50৳"}
                      className="bg-background"
                    />
                    {selectedItems.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={applyGlobalToAll}
                        title="Apply value to all items below"
                      >
                        Apply to All
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Search & Selection Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Search Panel with Searchable Company/Brand & Category Dropdowns */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FiSearch className="h-4 w-4" /> 2. Search & Add Products
                    </CardTitle>
                    {searchResults.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addAllFilteredProducts}
                        className="text-xs flex items-center gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      >
                        <FiCheckSquare className="h-3.5 w-3.5" /> Add All ({searchResults.length})
                      </Button>
                    )}
                  </div>
                  <CardDescription>Filter catalog by Company/Brand, Category, or keyword.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Searchable Dropdown Filters */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Searchable Company / Brand Dropdown */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                        <FiBriefcase className="h-3 w-3" /> Company / Brand
                      </Label>
                      <SearchableSelect
                        options={brandOptions}
                        value={selectedBrand}
                        onValueChange={(val) => handleBrandChange(val || "ALL")}
                        placeholder="All Companies / Brands"
                        searchPlaceholder="Search company/brand..."
                        className="h-8 text-xs bg-background"
                      />
                    </div>

                    {/* Searchable Category Dropdown */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                        <FiGrid className="h-3 w-3" /> Category
                      </Label>
                      <SearchableSelect
                        options={categoryOptions}
                        value={selectedCategory}
                        onValueChange={(val) => handleCategoryChange(val || "ALL")}
                        placeholder="All Categories"
                        searchPlaceholder="Search category..."
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, code, barcode..."
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      className="pl-9 text-sm"
                    />
                  </div>

                  {/* Product Search Results List */}
                  <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                    {isSearching ? (
                      <div className="text-center py-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <FiRefreshCw className="animate-spin h-4 w-4" /> Searching catalog...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">No products found matching filters</div>
                    ) : (
                      searchResults.map((product) => {
                        const isAdded = selectedItems.some((i) => i.id === product.id);
                        return (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2.5 rounded-md border hover:bg-accent/50 transition-colors"
                          >
                            <div className="min-w-0 pr-2 space-y-0.5">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>Code: {product.code}</span>
                                {product.brand?.name && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                    {product.brand.name}
                                  </Badge>
                                )}
                                {product.category?.name && (
                                  <span className="text-[11px] text-muted-foreground">({product.category.name})</span>
                                )}
                                <span>•</span>
                                <span className="font-semibold text-foreground">৳{product.salesPrice}</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isAdded ? "secondary" : "default"}
                              disabled={isAdded}
                              onClick={() => addProductToCampaign(product)}
                            >
                              {isAdded ? (
                                <span className="flex items-center gap-1">
                                  <FiCheck className="h-3.5 w-3.5 text-emerald-600" /> Added
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <FiPlus className="h-3.5 w-3.5" /> Add
                                </span>
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Products Table */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="h-full flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FiTag className="h-4 w-4" /> 3. Selected Campaign Products ({selectedItems.length})
                      </CardTitle>
                      <CardDescription>Configure discount value per product.</CardDescription>
                    </div>

                    {selectedItems.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItems([])}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </CardHeader>

                  <CardContent className="p-0">
                    {selectedItems.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-2 border-t">
                        <FiTag className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium text-muted-foreground">No products selected yet</p>
                        <p className="text-xs text-muted-foreground">
                          Filter by Company/Brand or Category, and add products to include them in this campaign.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[380px] overflow-y-auto border-t">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead>Discount Value</TableHead>
                              <TableHead className="text-right">Promo Price</TableHead>
                              <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedItems.map((item) => {
                              const calc = calculateEffectivePrice(
                                item.salesPrice,
                                item.discountType,
                                item.discountValue
                              );

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    <p className="text-sm line-clamp-1">{item.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <span>{item.code}</span>
                                      {item.brand?.name && <span>• {item.brand.name}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    ৳{item.salesPrice}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5 max-w-[170px]">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 shrink-0 text-xs"
                                        onClick={() =>
                                          updateItemDiscount(
                                            item.id,
                                            "discountType",
                                            item.discountType === "PERCENT" ? "AMOUNT" : "PERCENT"
                                          )
                                        }
                                        title={`Switch to ${item.discountType === "PERCENT" ? "Amount (৳)" : "Percentage (%)"}`}
                                      >
                                        {item.discountType === "PERCENT" ? "%" : "৳"}
                                      </Button>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.discountValue}
                                        onChange={(e) =>
                                          updateItemDiscount(
                                            item.id,
                                            "discountValue",
                                            e.target.value === "" ? 0 : Number(e.target.value)
                                          )
                                        }
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold text-emerald-600 text-sm">
                                    ৳{calc.finalPrice}
                                    <div className="text-[11px] text-muted-foreground font-normal">
                                      (-৳{calc.discountAmount})
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeProductFromCampaign(item.id)}
                                    >
                                      <FiTrash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </div>

                <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {selectedItems.length > 0 && globalDate ? (
                      <span className="text-emerald-600 font-medium">
                        Ready to apply promo campaign window (
                        {globalStartDate ? `${new Date(globalStartDate).toLocaleDateString()} to ` : "Immediately until "}
                        {new Date(globalDate).toLocaleDateString()})
                      </span>
                    ) : (
                      "Select products and expiration date to submit."
                    )}
                  </div>

                  <Button
                    onClick={handleApplyCampaign}
                    disabled={selectedItems.length === 0 || !globalDate || isSubmitting}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <FiRefreshCw className="animate-spin h-4 w-4" /> Applying Campaign...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FiZap className="h-4 w-4" /> Apply Campaign ({selectedItems.length} Products)
                      </span>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Active Promotional Products */}
        <TabsContent value="active" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FiTag className="h-4 w-4" /> Active & Scheduled Promotional Items
                </CardTitle>
                <CardDescription>
                  List of items configured with promotional expiry (`isPromo = true`).
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {selectedPromoIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClearSelectedPromos(selectedPromoIds)}
                    disabled={isClearing}
                  >
                    <FiTrash2 className="mr-1 h-3.5 w-3.5" /> End Promo ({selectedPromoIds.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={refreshActivePromos}>
                  <FiRefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activePromos.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <FiAlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-base font-medium">No active promotional campaigns found</p>
                  <p className="text-sm text-muted-foreground">
                    Use the "Create New Campaign" tab to add promotional pricing to your catalog items.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedPromoIds.length === activePromos.length && activePromos.length > 0}
                            onCheckedChange={toggleSelectAllPromos}
                          />
                        </TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Company / Brand</TableHead>
                        <TableHead className="text-right">Sales Price</TableHead>
                        <TableHead className="text-right">Retail Discount</TableHead>
                        <TableHead className="text-right">Promo Price</TableHead>
                        <TableHead>Campaign Window</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePromos.map((item) => {
                        const statusObj = getPromoStatus(item.promoStartsAt, item.promoEndsAt);
                        const promoPrice = Math.max(0, item.salesPrice - item.discount);

                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedPromoIds.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPromoIds((prev) => [...prev, item.id]);
                                  } else {
                                    setSelectedPromoIds((prev) => prev.filter((id) => id !== item.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.brand?.name || item.category?.name || "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">৳{item.salesPrice}</TableCell>
                            <TableCell className="text-right font-mono text-amber-600">
                              -৳{item.discount}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-emerald-600">
                              ৳{promoPrice.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs font-medium">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <FiClock className="h-3 w-3" />
                                  Start: {item.promoStartsAt ? new Date(item.promoStartsAt).toLocaleDateString() : "Immediate"}
                                </span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <FiClock className="h-3 w-3 text-destructive" />
                                  End: {item.promoEndsAt ? new Date(item.promoEndsAt).toLocaleDateString() : "No Date"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusObj.variant} className={`text-xs ${statusObj.colorClass}`}>
                                {statusObj.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive text-xs"
                                onClick={() => handleClearSelectedPromos([item.id])}
                              >
                                Clear Promo
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
