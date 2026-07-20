import React from "react";
import { getItemById, getItemWarehouseStock } from "../_actions/item.action";
import SKUVariantMatrix from "../_components/sku-variant-matrix";
import { prisma } from "@/lib/prisma";
import PageGuard from "@/components/permissions/page-guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  FiEdit, 
  FiArrowLeft, 
  FiPackage, 
  FiTag, 
  FiDollarSign, 
  FiTrendingUp,
  FiInfo,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiImage,
  FiLayers,
  FiBox,
  FiShoppingCart,
  FiMaximize2,
  FiGrid,
  FiPercent
} from "react-icons/fi";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import ItemActionButtons from "../_components/ItemActionButtons";

interface ItemDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ItemDetailsPage({ params }: ItemDetailsPageProps) {
  const { id } = await params;
  const result = await getItemById(id);

  if (!result.success || !result.item) {
    redirect("/dashboard/master/items");
  }

  const item = result.item as any;
  const stockResult = await getItemWarehouseStock(id);
  const warehouseStocks = stockResult.success ? stockResult.stocks : [];
  const warehouseStocksMessage = stockResult.message || null;

  const warehouses = await prisma.warehouse.findMany({
    where: { isTrash: false, status: "active" },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });
  
  const session = await auth();
  const userId = session?.user?.id;
  const canEdit = userId ? await hasPermission(userId, "master.items", "edit") : false;

  const getItemTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline"; color: string }> = {
      RAW_MATERIAL: { label: "Raw Material", variant: "secondary", color: "bg-amber-100 text-amber-800 border-amber-200" },
      READY_PRODUCT: { label: "Ready Product", variant: "default", color: "bg-green-100 text-green-800 border-green-200" },
      RETAIL: { label: "Retail", variant: "outline", color: "bg-blue-100 text-blue-800 border-blue-200" },
      WHOLESALE: { label: "Wholesale", variant: "secondary", color: "bg-purple-100 text-purple-800 border-purple-200" },
    };
    const config = typeMap[type] || { label: type, variant: "default" as const, color: "" };
    return <Badge className={`text-xs font-semibold border ${config.color}`}>{config.label}</Badge>;
  };

  const formatPrice = (price: any) => {
    if (price === null || price === undefined) return "-";
    return `৳${Number(price).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateProfitMargin = () => {
    if (!item.salesPrice || !item.costPrice) return null;
    const cost = Number(item.costPrice);
    const sales = Number(item.salesPrice);
    if (cost === 0) return null;
    const margin = ((sales - cost) / cost) * 100;
    return margin.toFixed(1);
  };

  const profitMargin = calculateProfitMargin();
  const hasVariants = item.variants && item.variants.length > 0;
  const isVatEnabled = item.isVatEnabled === true;
  const vatPercentage = item.vatPercentage ? Number(item.vatPercentage) : 0;

  return (
    <PageGuard permissionKey="master.items" requiredOperation="view">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/master/items">
                <FiArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <FiPackage className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{item.code}</span>
                  {item.slug && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">Slug: {item.slug}</span>
                    </>
                  )}
                  {item.barcode && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">Barcode: {item.barcode}</span>
                    </>
                  )}
                  <Separator orientation="vertical" className="h-4" />
                  {getItemTypeBadge(item.itemType)}
                  {isVatEnabled && (
                    <Badge className="text-xs bg-orange-100 text-orange-800 border border-orange-200 gap-1">
                      <FiPercent className="h-3 w-3" />
                      VAT {vatPercentage}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <ItemActionButtons item={item} canEdit={canEdit} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details (2 columns) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Information Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted">
                    <FiInfo className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </div>
                <CardDescription>Item details and classification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Top Section: 3-column Grouped Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Column 1: Identity */}
                  <div className="space-y-4 border-r border-border/40 pr-6 lg:border-r lg:border-b-0 pb-4 lg:pb-0">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <FiTag className="h-3.5 w-3.5" /> Identity
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item Name</label>
                        <p className="text-base font-bold text-foreground mt-0.5">{item.name}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Item Code</label>
                        <span className="inline-block text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border mt-1">{item.code}</span>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Base Barcode</label>
                        {item.barcode ? (
                          <span className="inline-block text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border mt-1">{item.barcode}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic block mt-1">None assigned</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Slug (URL Key)</label>
                        {item.slug ? (
                          <span className="inline-block text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border mt-1">{item.slug}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic block mt-1">None generated</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Classification */}
                  <div className="space-y-4 border-r border-border/40 pr-6 lg:border-r lg:border-b-0 pb-4 lg:pb-0">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <FiLayers className="h-3.5 w-3.5" /> Classification
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Item Type</label>
                        <div className="mt-1">{getItemTypeBadge(item.itemType)}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Category</label>
                        <div className="mt-1">
                          {item.category ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted border border-border/50 text-xs font-semibold text-foreground">
                              {item.category.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">No category</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Sub-category</label>
                        <div className="mt-1">
                          {item.subCategory ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200/50 text-xs font-semibold text-emerald-700">
                              {item.subCategory.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">No sub-category</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Unit</label>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-muted border border-border/50 text-xs font-semibold mt-1">
                          {item.unit.symbol} <span className="text-muted-foreground text-[10px] font-normal">({item.unit.details})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Variations */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <FiGrid className="h-3.5 w-3.5" /> Variations
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Available Sizes</label>
                        {item.sizes && item.sizes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.sizes.map((s: string) => (
                              <Badge key={s} variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-background shadow-sm">{s}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No sizes defined</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Available Colors</label>
                        {item.colors && item.colors.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.colors.map((c: string) => (
                              <Badge key={c} variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-muted/40 shadow-sm">{c}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No colors defined</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {item.description && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-1 bg-muted/10 p-3 rounded-lg border border-border/30">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.description}</p>
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Bottom Section: Settings & Status in 4-column layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/10 border border-border/60 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                    <div>
                      {item.status === "active" ? (
                        <Badge className="gap-1 bg-green-100 text-green-800 border border-green-200 text-xs">
                          <FiCheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <FiXCircle className="h-3 w-3" /> {item.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/10 border border-border/60 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">E-commerce</span>
                    <div>
                      {item.isEnableEcom ? (
                        <Badge className="gap-1 bg-green-600 hover:bg-green-700 text-white border-0 text-xs">
                          <FiShoppingCart className="h-3 w-3" /> Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <FiXCircle className="h-3 w-3" /> Disabled
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/10 border border-border/60 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Track Inventory</span>
                    <div>
                      {item.trackInventory ? (
                        <Badge className="gap-1 bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                          <FiBox className="h-3 w-3" /> Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <FiXCircle className="h-3 w-3" /> No
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/10 border border-border/60 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">VAT Applied</span>
                    <div>
                      {isVatEnabled ? (
                        <Badge className="gap-1 bg-orange-100 text-orange-800 border border-orange-200 text-xs">
                          <FiPercent className="h-3 w-3" /> {vatPercentage}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <FiXCircle className="h-3 w-3" /> None
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted">
                    <FiDollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Pricing Information</CardTitle>
                </div>
                <CardDescription>Cost, wholesale, and sales pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cost Price</label>
                    <p className="text-xl font-bold text-foreground">{formatPrice(item.costPrice)}</p>
                    <p className="text-xs text-muted-foreground">Purchase cost</p>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                    <label className="text-xs font-medium text-primary uppercase tracking-wide">Sales Price</label>
                    <p className="text-xl font-bold text-primary">{formatPrice(item.salesPrice)}</p>
                    <p className="text-xs text-muted-foreground">Retail price</p>
                  </div>

                  {item.wholesalePrice && Number(item.wholesalePrice) > 0 && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/30 p-4 space-y-1">
                      <label className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">Wholesale</label>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatPrice(item.wholesalePrice)}</p>
                      <p className="text-xs text-muted-foreground">Bulk price</p>
                    </div>
                  )}

                  {item.discount && Number(item.discount) > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800/30 p-4 space-y-1">
                      <label className="text-xs font-medium text-red-600 uppercase tracking-wide">Discount</label>
                      <p className="text-xl font-bold text-red-600">{formatPrice(item.discount)}</p>
                      {item.isPromo ? (
                        <p className="text-xs text-red-600 font-medium">
                          Promo ends: {item.promoEndsAt ? new Date(item.promoEndsAt).toLocaleDateString() : "No end date"}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Active discount</p>
                      )}
                    </div>
                  )}
                </div>

                {profitMargin !== null && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                    <FiTrendingUp className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {profitMargin}% Profit Margin
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Gross profit: {formatPrice(Number(item.salesPrice) - Number(item.costPrice))} per unit
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* VAT & Tax Card */}
            <Card className={`border-border/60 ${isVatEnabled ? "border-orange-200 dark:border-orange-800/40" : ""}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${isVatEnabled ? "bg-orange-100 dark:bg-orange-950/30" : "bg-muted"}`}>
                      <FiPercent className={`h-4 w-4 ${isVatEnabled ? "text-orange-600" : "text-muted-foreground"}`} />
                    </div>
                    <CardTitle className="text-base">VAT & Tax Settings</CardTitle>
                  </div>
                  {isVatEnabled ? (
                    <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs font-semibold">
                      VAT Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">VAT Disabled</Badge>
                  )}
                </div>
                <CardDescription>Item-level value added tax configuration</CardDescription>
              </CardHeader>
              <CardContent>
                {isVatEnabled ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-orange-200 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-1">
                      <label className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide">VAT Rate</label>
                      <p className="text-2xl font-black text-orange-700 dark:text-orange-400">{vatPercentage}%</p>
                      <p className="text-xs text-muted-foreground">Applied to every sale</p>
                    </div>
                    {item.salesPrice && (
                      <>
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">VAT Amount</label>
                          <p className="text-xl font-bold">{formatPrice(Number(item.salesPrice) * vatPercentage / 100)}</p>
                          <p className="text-xs text-muted-foreground">Per unit at retail price</p>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                          <label className="text-xs font-medium text-primary uppercase tracking-wide">Price incl. VAT</label>
                          <p className="text-xl font-bold text-primary">{formatPrice(Number(item.salesPrice) * (1 + vatPercentage / 100))}</p>
                          <p className="text-xs text-muted-foreground">Total customer pays</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                    <FiXCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">VAT is not applied to this item</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Enable VAT in the edit form to apply tax to this product.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SKU Variants Table */}
            {hasVariants && (
              <SKUVariantMatrix
                variants={item.variants}
                warehouses={warehouses}
                isVatEnabled={isVatEnabled}
                vatPercentage={vatPercentage}
                itemSalesPrice={item.salesPrice}
                featuredImage={item.featuredImage}
              />
            )}

            {/* Stock Information Card */}
            {item.trackInventory && (
              <Card className="border-border/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted">
                        <FiBox className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Warehouse Stock</CardTitle>
                        <CardDescription className="mt-0.5">Stock availability across locations</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {warehouseStocksMessage ? (
                    <div className="text-sm text-muted-foreground p-4 m-4 bg-muted rounded-lg">{warehouseStocksMessage}</div>
                  ) : warehouseStocks && warehouseStocks.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-y border-border bg-muted/50">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Warehouse</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Cost</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {warehouseStocks.map((ws: any) => (
                            <tr key={ws.warehouse.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-medium text-foreground">{ws.warehouse.name}</div>
                                <div className="text-xs text-muted-foreground">{ws.warehouse.code}</div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-bold">{Number(ws.quantity).toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground ml-1">{item.unit.symbol}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-medium">{formatPrice(ws.averageCost)}</td>
                              <td className="py-3 px-4 text-right font-bold text-primary">{formatPrice(ws.totalValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-border bg-muted/10">
                          <tr>
                            <td className="py-3 px-4 text-sm font-bold text-foreground">Total</td>
                            <td className="py-3 px-4 text-right font-black">
                              {warehouseStocks.reduce((sum: number, ws: any) => sum + Number(ws.quantity), 0).toLocaleString()}
                              <span className="text-xs text-muted-foreground ml-1 font-normal">{item.unit.symbol}</span>
                            </td>
                            <td className="py-3 px-4 text-right">—</td>
                            <td className="py-3 px-4 text-right font-black text-primary">
                              {formatPrice(warehouseStocks.reduce((sum: number, ws: any) => sum + Number(ws.totalValue), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 m-4 bg-muted rounded-lg border border-dashed border-border flex items-center justify-center">
                      No stock data available in any warehouse.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Photos Section */}
            {item.images && item.images.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-muted">
                      <FiImage className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">Item Photos</CardTitle>
                  </div>
                  <CardDescription>Product images and gallery ({item.images.length} photos)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {item.images.map((img: string, i: number) => (
                      <div key={i} className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border group shadow-sm bg-muted/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Item ${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={img} target="_blank" rel="noreferrer" className="text-white p-2 rounded-full bg-primary/80 hover:bg-primary transition-colors">
                            <FiMaximize2 className="h-4 w-4" />
                          </a>
                        </div>
                        {item.featuredImage === img && (
                          <div className="absolute top-3 left-3 px-2 py-1 bg-primary text-[10px] text-white rounded-md font-bold shadow-md tracking-wider">
                            FEATURED
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variant Summary Card */}
            {hasVariants && (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-muted">
                      <FiGrid className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">Variant Summary</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total SKUs</span>
                    <span className="font-bold">{item.variants.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Colors</span>
                    <span className="font-medium">{item.colors?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sizes</span>
                    <span className="font-medium">{item.sizes?.length || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">With Photos</span>
                    <span className="font-medium text-primary">
                      {item.variants.filter((v: any) => v.image).length} / {item.variants.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">With Barcodes</span>
                    <span className="font-medium text-primary">
                      {item.variants.filter((v: any) => v.barcode).length} / {item.variants.length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted">
                    <FiClock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Metadata</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.creator && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created By</label>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <FiUser className="h-3 w-3 text-primary" />
                        </div>
                        <p className="text-sm font-medium">{item.creator?.name || item.creator?.email}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created At</label>
                  <p className="text-sm">{format(new Date(item.createdAt), "PPp")}</p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</label>
                  <p className="text-sm">{format(new Date(item.updatedAt), "PPp")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageGuard>
  );
}
