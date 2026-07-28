"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FiAlertCircle, FiPlus, FiTrash2, FiSearch } from "react-icons/fi";
import { createClient, updateClient, getWarehousesForClient } from "../_actions/client.action";
import { getMembershipTiers } from "@/app/(dashboard)/dashboard/settings/_actions/membership-tier.action";
import MediaSelector from "@/components/MediaSelector";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import DocumentSection, { DocumentItem } from "@/components/documents/documentSection";
import { useToast } from "@/hooks/use-toast";
import { getItemsForSale } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const clientFormSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  openingBalance: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  clientType: z.enum(["regular", "wholesale"]),
  warehouseId: z.string().optional().or(z.literal("")),
  membershipNumber: z.string().optional().or(z.literal("")),
  membershipTier: z.string(),
  membershipStatus: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]),
  membershipPoints: z.string().optional().or(z.literal("")),
  membershipExpiry: z.string().optional().or(z.literal("")),
  discounts: z.array(
    z.object({
      id: z.string(),
      itemId: z.string().nullable().optional(),
      variantId: z.string().nullable().optional(),
      name: z.string(),
      code: z.string(),
      price: z.number(),
      discountType: z.enum(["percentage", "flat"]),
      discountValue: z.number().positive("Discount value must be greater than 0"),
    })
  ),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    clientCode?: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
    company: string | null;
    image: string | null;
    documents?: any;
    openingBalance?: any;
    status: string;
    clientType?: string | null;
    itemDiscounts?: any[];
    membershipNumber?: string | null;
    membershipTier?: string | null;
    membershipStatus?: string | null;
    membershipPoints?: number | null;
    membershipExpiry?: any;
    warehouseId?: string | null;
  };
}

export default function ClientForm({ mode, initialData }: ClientFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [membershipTiers, setMembershipTiers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>(
    Array.isArray(initialData?.documents) ? initialData.documents : []
  );

  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>(() => {
    if (!initialData?.itemDiscounts) return [];
    return initialData.itemDiscounts.map((d: any) => {
      const isVariant = !!d.variantId && !!d.variant;
      const name = isVariant
        ? `${d.variant?.item?.name || ""} (${d.variant?.color || ""} - ${d.variant?.size || ""})`
        : (d.item?.name || "Unknown Item");
      const code = isVariant ? (d.variant?.sku || "") : (d.item?.code || "");
      const price = isVariant
        ? (d.variant?.salesPrice ? Number(d.variant.salesPrice) : 0)
        : (d.item?.salesPrice ? Number(d.item.salesPrice) : 0);
      return {
        id: d.id,
        itemId: d.itemId,
        variantId: d.variantId,
        name,
        code,
        price,
        discountType: d.discountType.toLowerCase() as "percentage" | "flat",
        discountValue: Number(d.discountValue) || 0,
      };
    });
  });
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
          city: initialData.city || "",
          state: initialData.state || "",
          zip: initialData.zip || "",
          country: initialData.country || "",
          company: initialData.company || "",
          image: initialData.image || "",
          openingBalance: initialData.openingBalance?.toString() || "0",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
          clientType: (initialData.clientType === "wholesale" ? "wholesale" : "regular") as "regular" | "wholesale",
          warehouseId: initialData.warehouseId || "",
          membershipNumber: initialData.membershipNumber || "",
          membershipTier: (initialData.membershipTier || "NONE"),
          membershipStatus: (initialData.membershipStatus || "INACTIVE") as "ACTIVE" | "INACTIVE" | "EXPIRED",
          membershipPoints: initialData.membershipPoints?.toString() || "0",
          membershipExpiry: initialData.membershipExpiry ? new Date(initialData.membershipExpiry).toISOString().split("T")[0] : "",
          discounts: initialData.itemDiscounts
            ? initialData.itemDiscounts.map((d: any) => {
                const isVariant = !!d.variantId && !!d.variant;
                const name = isVariant
                  ? `${d.variant?.item?.name || "Unknown Item"} (${d.variant?.color || ""} - ${d.variant?.size || ""})`
                  : (d.item?.name || "Unknown Item");
                const code = isVariant ? (d.variant?.sku || "") : (d.item?.code || "");
                const price = isVariant
                  ? (d.variant?.salesPrice ? Number(d.variant.salesPrice) : 0)
                  : (d.item?.salesPrice ? Number(d.item.salesPrice) : 0);
                return {
                  id: d.id || `${d.itemId}-${d.variantId || 'base'}-${Date.now()}`,
                  itemId: d.itemId,
                  variantId: d.variantId,
                  name: name || "",
                  code: code || "",
                  price: Number(price) || 0,
                  discountType: d.discountType.toLowerCase() as "percentage" | "flat",
                  discountValue: Number(d.discountValue) || 0,
                };
              })
            : [],
        }
      : {
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          country: "",
          company: "",
          image: "",
          openingBalance: "0",
          status: "active",
          clientType: "regular",
          warehouseId: "",
          membershipNumber: "",
          membershipTier: "NONE",
          membershipStatus: "INACTIVE",
          membershipPoints: "0",
          membershipExpiry: "",
          discounts: [],
        },
  });

  const clientType = watch("clientType") || "regular";

  useEffect(() => {
    async function loadWarehouses() {
      const res = await getWarehousesForClient();
      if (res.success && res.warehouses) {
        setWarehouses(res.warehouses);
        if (mode === "create" && res.defaultWarehouseId && !watch("warehouseId")) {
          setValue("warehouseId", res.defaultWarehouseId);
        }
      }
    }
    loadWarehouses();
  }, []);

  useEffect(() => {
    async function loadMembershipTiers() {
      const res = await getMembershipTiers(1, 100, "", "active");
      if (res.success && res.membershipTiers) {
        setMembershipTiers(res.membershipTiers);
      }
    }
    loadMembershipTiers();
  }, []);

  useEffect(() => {
    setValue("discounts", activeDiscounts);
  }, [activeDiscounts, setValue]);

  useEffect(() => {
    async function loadItems() {
      try {
        setLoadingItems(true);
        const result = await getItemsForSale();
        if (result.success && result.items) {
          const wholesaleItems = result.items.filter((item: any) => item.itemType === "WHOLESALE");
          setItems(wholesaleItems);
        }
      } catch (err) {
        console.error("Failed to load items for wholesale form:", err);
      } finally {
        setLoadingItems(false);
      }
    }
    loadItems();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#item-search-container")) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const searchResults = items.flatMap(item => {
    const results: any[] = [];
    if (item.variants && item.variants.length > 0) {
      item.variants.forEach((variant: any) => {
        results.push({
          id: `${item.id}-${variant.id}`,
          itemId: item.id,
          variantId: variant.id,
          name: `${item.description} (${variant.color || ""} - ${variant.size || ""})`,
          code: variant.sku || item.code,
          price: variant.salesPrice || item.unitPrice,
          type: "variant"
        });
      });
    } else {
      results.push({
        id: item.id,
        itemId: item.id,
        variantId: null,
        name: item.description,
        code: item.code,
        price: item.unitPrice,
        type: "item"
      });
    }
    return results;
  }).filter(flatItem => {
    const query = searchQuery.toLowerCase();
    return (
      flatItem.name.toLowerCase().includes(query) ||
      flatItem.code.toLowerCase().includes(query)
    );
  });

  const handleAddDiscount = () => {
    if (!selectedItem) {
      toast({
        title: "Error",
        description: "Please select an item or SKU first",
        variant: "destructive",
      });
      return;
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid discount value greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (discountType === "percentage" && value > 100) {
      toast({
        title: "Error",
        description: "Percentage discount cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    const exists = activeDiscounts.some(
      (d) => d.itemId === selectedItem.itemId && d.variantId === selectedItem.variantId
    );

    if (exists) {
      toast({
        title: "Error",
        description: "A discount for this item/SKU already exists in the active list",
        variant: "destructive",
      });
      return;
    }

    const newDiscount = {
      id: `${selectedItem.itemId}-${selectedItem.variantId || 'base'}-${Date.now()}`,
      itemId: selectedItem.itemId,
      variantId: selectedItem.variantId,
      name: selectedItem.name,
      code: selectedItem.code,
      price: selectedItem.price,
      discountType,
      discountValue: value,
    };

    setActiveDiscounts([...activeDiscounts, newDiscount]);
    setSelectedItem(null);
    setSearchQuery("");
    setDiscountValue("");

    toast({
      title: "Discount Added",
      description: `Added ${discountType === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`} discount for ${selectedItem.name}`,
    });
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      setLoading(true);
      setError("");

      const submissionPayload = {
        name: data.name || undefined,
        email: data.email || null,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip: data.zip || undefined,
        country: data.country || undefined,
        company: data.company || undefined,
        image: data.image || undefined,
        openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : 0,
        status: data.status,
        clientType: data.clientType,
        warehouseId: data.warehouseId || undefined,
        membershipNumber: data.membershipNumber || undefined,
        membershipTier: data.membershipTier,
        membershipStatus: data.membershipStatus,
        membershipPoints: data.membershipPoints ? parseInt(data.membershipPoints, 10) : 0,
        membershipExpiry: data.membershipExpiry ? new Date(data.membershipExpiry) : undefined,
        documents: documents,
        itemDiscounts: data.clientType === "wholesale" ? data.discounts : [],
        discounts: data.clientType === "wholesale" ? data.discounts : [],
      };

      if (mode === "create") {
        const result = await createClient(submissionPayload);

        if (!result.success) {
          throw new Error(result.error || "Failed to create client");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/clients`);
      } else {
        const result = await updateClient({
          id: initialData!.id,
          ...submissionPayload,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update client");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/clients`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Client" : "Edit Client"}
          </CardTitle>
          <CardDescription>
            {mode === "create" ? "Enter client details to create a new client" : "Update client information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column - Form Fields (3 parts) */}
              <div className="lg:col-span-3 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      {...register("name")}
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register("email")}
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message as string}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      {...register("phone")}
                      disabled={loading}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      type="text"
                      placeholder="Company Name"
                      {...register("company")}
                      disabled={loading}
                    />
                    {errors.company && (
                      <p className="text-sm text-destructive">{errors.company.message as string}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Street address"
                    {...register("address")}
                    disabled={loading}
                    rows={2}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address.message as string}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="City"
                      {...register("city")}
                      disabled={loading}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="State"
                      {...register("state")}
                      disabled={loading}
                    />
                    {errors.state && (
                      <p className="text-sm text-destructive">{errors.state.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      type="text"
                      placeholder="ZIP"
                      {...register("zip")}
                      disabled={loading}
                    />
                    {errors.zip && (
                      <p className="text-sm text-destructive">{errors.zip.message as string}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      type="text"
                      placeholder="Country"
                      {...register("country")}
                      disabled={loading}
                    />
                    {errors.country && (
                      <p className="text-sm text-destructive">{errors.country.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openingBalance">Opening Balance</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      step="1"
                      placeholder="0.00"
                      {...register("openingBalance")}
                      disabled={loading}
                    />
                    {errors.openingBalance && (
                      <p className="text-sm text-destructive">{errors.openingBalance.message as string}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientType">Client Type</Label>
                    <Select
                      defaultValue={watch("clientType") || "regular"}
                      onValueChange={(value) => setValue("clientType", value as "regular" | "wholesale")}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular Client</SelectItem>
                        <SelectItem value="wholesale">Wholesale Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      defaultValue={initialData?.status === "trash" ? "active" : initialData?.status || "active"}
                      onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="text-sm text-destructive">{errors.status.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouseId">Assigned Warehouse</Label>
                    <Select
                      value={watch("warehouseId") || "none"}
                      onValueChange={(value) => setValue("warehouseId", value === "none" ? "" : value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (All Warehouses)</SelectItem>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name} ({wh.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Membership Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="membershipNumber">Membership ID (Customer ID)</Label>
                      <Input
                        id="membershipNumber"
                        placeholder="Auto-assigned (Customer ID)"
                        value={initialData?.clientCode || "Auto-assigned (Customer ID)"}
                        readOnly
                        disabled={true}
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        The Customer ID (Client Code) is automatically used as the Membership ID.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="membershipTier">Membership Tier</Label>
                      <Select
                        defaultValue={watch("membershipTier") || "NONE"}
                        onValueChange={(value) => setValue("membershipTier", value)}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {membershipTiers
                            .filter(t => t.name !== "NONE")
                            .map((tier) => (
                              <SelectItem key={tier.id} value={tier.name}>
                                {tier.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Select a membership tier for this client.
                      </p>
                      {errors.membershipTier && (
                        <p className="text-xs text-destructive">{errors.membershipTier.message as string}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="membershipStatus">Membership Status</Label>
                      <Select
                        defaultValue={watch("membershipStatus") || "INACTIVE"}
                        onValueChange={(value) => setValue("membershipStatus", value as any)}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="EXPIRED">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.membershipStatus && (
                        <p className="text-xs text-destructive">{errors.membershipStatus.message as string}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="membershipPoints">Points</Label>
                      <Input
                        id="membershipPoints"
                        type="number"
                        placeholder="0"
                        {...register("membershipPoints")}
                        disabled={loading}
                      />
                      {errors.membershipPoints && (
                        <p className="text-xs text-destructive">{errors.membershipPoints.message as string}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="membershipExpiry">Expiry Date</Label>
                      <Input
                        id="membershipExpiry"
                        type="date"
                        {...register("membershipExpiry")}
                        disabled={loading}
                      />
                      {errors.membershipExpiry && (
                        <p className="text-xs text-destructive">{errors.membershipExpiry.message as string}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Image (1 part) */}
              <div className="lg:col-span-1">
                <div className="space-y-2">
                  <Label>Client Photo</Label>
                  <MediaSelector
                    label=""
                    value={watch("image") || ""}
                    onChange={(url) => setValue("image", url || "")}
                    allowedTypes={["image/*"]}
                    width={200}
                    height={200}
                  />
                  {errors.image && (
                    <p className="text-sm text-destructive">{errors.image.message as string}</p>
                  )}
                </div>
              </div>
            </div>

            {clientType === "wholesale" && (
              <Card className="mt-6 border-primary/20 bg-primary/[0.01]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>🏷️ Wholesale Custom Pricing & Discounts</span>
                  </CardTitle>
                  <CardDescription>
                    Define product-specific flat or percentage discounts for this wholesale client.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/20 p-4 rounded-lg border border-border">
                    <div id="item-search-container" className="md:col-span-2 space-y-2 relative">
                      <Label className="text-sm font-semibold">Search Item / SKU *</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Type to search items or SKUs..."
                          value={selectedItem ? selectedItem.name : searchQuery}
                          onChange={(e) => {
                            if (selectedItem) {
                              setSelectedItem(null);
                            }
                            setSearchQuery(e.target.value);
                            setShowItemDropdown(true);
                          }}
                          onFocus={() => setShowItemDropdown(true)}
                          disabled={loadingItems}
                        />
                        <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                      
                      {showItemDropdown && searchQuery.trim() !== "" && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto text-popover-foreground">
                          {loadingItems ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">Loading items...</div>
                          ) : searchResults.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">No items or SKUs found</div>
                          ) : (
                            searchResults.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedItem(item);
                                  setSearchQuery(item.name);
                                  setShowItemDropdown(false);
                                }}
                                className="flex flex-col p-2.5 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border last:border-0 text-left transition-colors"
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-medium text-sm text-foreground">{item.name}</span>
                                  <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full font-mono">
                                    {item.code}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                                  <span>Type: {item.type === "variant" ? "SKU / Variant" : "Base Item"}</span>
                                  <span className="font-semibold text-primary">Price: ${item.price.toFixed(2)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Discount Type</Label>
                      <Select
                        value={discountType}
                        onValueChange={(val) => setDiscountType(val as "percentage" | "flat")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="flat">Flat Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Discount Value</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 5.00"}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={handleAddDiscount}
                          className="flex-shrink-0"
                        >
                          <FiPlus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Active Wholesale Discounts</h4>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                        {activeDiscounts.length} {activeDiscounts.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    
                    <div className="border border-border rounded-md overflow-hidden bg-background">
                      <Table>
                        <TableHeader className="bg-muted/20">
                          <TableRow>
                            <TableHead className="font-semibold text-xs">Item / SKU</TableHead>
                            <TableHead className="font-semibold text-xs">Code</TableHead>
                            <TableHead className="font-semibold text-xs text-right">Base Price</TableHead>
                            <TableHead className="font-semibold text-xs text-right">Discount</TableHead>
                            <TableHead className="font-semibold text-xs text-right">Final Price</TableHead>
                            <TableHead className="font-semibold text-xs text-right w-16">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeDiscounts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">
                                No custom discounts configured for this wholesale client.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeDiscounts.map((discount) => {
                              const finalPrice = discount.discountType === "percentage" 
                                ? discount.price * (1 - discount.discountValue / 100)
                                : Math.max(0, discount.price - discount.discountValue);
                                
                              return (
                                <TableRow key={discount.id} className="hover:bg-muted/10 transition-colors">
                                  <TableCell className="font-medium text-sm py-3">{discount.name}</TableCell>
                                  <TableCell className="font-mono text-xs py-3">{discount.code}</TableCell>
                                  <TableCell className="text-right text-sm py-3">${discount.price.toFixed(2)}</TableCell>
                                  <TableCell className="text-right py-3">
                                    <Badge variant="secondary" className="font-semibold text-xs">
                                      {discount.discountType === "percentage" 
                                        ? `${discount.discountValue}% Off` 
                                        : `$${discount.discountValue.toFixed(2)} Off`}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-semibold text-primary py-3">
                                    ${finalPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right py-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setActiveDiscounts(activeDiscounts.filter((d) => d.id !== discount.id));
                                        toast({
                                          title: "Discount Removed",
                                          description: `Removed discount for ${discount.name}`,
                                        });
                                      }}
                                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                      <FiTrash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Document Section for Previous Dealings / Invoices / Photos */}
            <div className="mt-6">
              <DocumentSection
                documents={documents}
                onChange={setDocuments}
                title="Client Transaction & Dealing Documents"
                description="Upload and attach past invoices, contracts, tax documents, or photo records for this client."
              />
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Create Client" : "Update Client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

