import React from "react";
import { getItemById, getItemStock } from "../_actions/item.action";
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
  FiMaximize2
} from "react-icons/fi";
import { hasPermission } from "@/lib/permissions";
import { auth } from "@/lib/auth";

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

  const item = result.item as any; // Cast to any to handle new fields in TS until generate finishes
  const stockResult = await getItemStock(id);
  const stock = stockResult.success ? stockResult.stock : null;
  
  const session = await auth();
  const userId = session?.user?.id;
  const canEdit = userId ? await hasPermission(userId, "master.items", "edit") : false;

  const getItemTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      RAW_MATERIAL: { label: "Raw Material", variant: "secondary" },
      READY_PRODUCT: { label: "Ready Product", variant: "default" },
      RETAIL: { label: "Retail", variant: "outline" },
      WHOLESALE: { label: "Wholesale", variant: "secondary" },
    };
    const config = variants[type] || { label: type, variant: "default" as const };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
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
              <div className="p-2 rounded-lg bg-primary/10">
                <FiPackage className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono text-muted-foreground">{item.code}</span>
                  <Separator orientation="vertical" className="h-4" />
                  {getItemTypeBadge(item.itemType)}
                </div>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/master/items/${item.id}/edit`}>
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Item
              </Link>
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiInfo className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Basic Information</CardTitle>
                </div>
                <CardDescription>Item details and classification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Name</label>
                    <p className="text-sm font-medium">{item.name}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Code</label>
                    <p className="text-sm font-mono">{item.code}</p>
                  </div>

                  {item.description && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Type</label>
                    <div className="mt-1">{getItemTypeBadge(item.itemType)}</div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
                    <p className="text-sm">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1">
                          <FiTag className="h-3 w-3" />
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No category</span>
                      )}
                    </p>
                  </div>

                  {item.sizes && item.sizes.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Sizes</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.sizes.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
                      </div>
                    </div>
                  )}

                  {item.colors && item.colors.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Colors</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.colors.map((c: string) => <Badge key={c} variant="outline" className="bg-muted/50">{c}</Badge>)}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit</label>
                    <p className="text-sm">
                      <span className="inline-flex items-center gap-1">
                        <FiLayers className="h-3 w-3" />
                        <span className="font-medium">{item.unit.symbol}</span>
                        <span className="text-muted-foreground">({item.unit.details})</span>
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiDollarSign className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Pricing Information</CardTitle>
                </div>
                <CardDescription>Cost, wholesale, and sales pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cost Price</label>
                    <p className="text-lg font-bold text-foreground">{formatPrice(item.costPrice)}</p>
                    <p className="text-xs text-muted-foreground">Purchase/production cost</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sales Price</label>
                    <p className="text-lg font-bold text-primary">{formatPrice(item.salesPrice)}</p>
                    <p className="text-xs text-muted-foreground">Retail selling price</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wholesale Price</label>
                    <p className="text-lg font-bold text-blue-600">{formatPrice(item.wholesalePrice)}</p>
                    <p className="text-xs text-muted-foreground">Bulk purchase price</p>
                  </div>

                  {item.discount && Number(item.discount) > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discount</label>
                      <p className="text-lg font-bold text-destructive">{formatPrice(item.discount)}</p>
                      <p className="text-xs text-muted-foreground">Active discount amount</p>
                    </div>
                  )}

                  {profitMargin !== null && (
                    <div className="space-y-1 lg:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profit Margin</label>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-green-600">{profitMargin}%</p>
                        <FiTrendingUp className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">
                          ({formatPrice(item.salesPrice)} - {formatPrice(item.costPrice)} = {formatPrice(Number(item.salesPrice) - Number(item.costPrice))})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Photos Section */}
            {item.images && item.images.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FiImage className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Item Photos</CardTitle>
                  </div>
                  <CardDescription>Product images and gallery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {item.images.map((img: string, i: number) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Item ${i}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a href={img} target="_blank" rel="noreferrer" className="text-white p-2 rounded-full bg-primary/80">
                            <FiMaximize2 className="h-4 w-4" />
                          </a>
                        </div>
                        {item.featuredImage === img && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-[10px] text-white rounded font-bold shadow-md">
                            FEATURED
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Information Card */}
            {item.trackInventory && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FiBox className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Stock Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {stock && stock.message ? (
                    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">{stock.message}</div>
                  ) : stock && stock.quantity !== null ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Stock</label>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold">{Number(stock.quantity).toLocaleString()}</p>
                          <span className="text-sm text-muted-foreground">{item.unit.symbol}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average Cost</label>
                        <p className="text-lg font-bold">{formatPrice(stock.averageCost)}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Value</label>
                        <p className="text-lg font-bold text-primary">{formatPrice(stock.totalValue)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">No stock data available.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Status & E-com</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Status</label>
                  <div>
                    {item.status === "active" ? (
                      <Badge variant="default" className="gap-1"><FiCheckCircle className="h-3 w-3" /> Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><FiXCircle className="h-3 w-3" /> {item.status}</Badge>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-commerce Visibility</label>
                  <div>
                    {item.isEnableEcom ? (
                      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-white border-0">
                        <FiShoppingCart className="h-3 w-3" /> Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><FiXCircle className="h-3 w-3" /> Disabled</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FiClock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Metadata</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created By</label>
                  <div className="flex items-center gap-2">
                    <FiUser className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{item.creator?.name || item.creator?.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created At</label>
                  <p className="text-sm">{format(new Date(item.createdAt), "PPp")}</p>
                </div>
                <Separator />
                <div className="space-y-2">
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
