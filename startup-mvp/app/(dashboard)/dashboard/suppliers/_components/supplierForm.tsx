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
import { FiAlertCircle } from "react-icons/fi";
import { createSupplier, updateSupplier, getWarehousesForSupplier } from "../_actions/supplier.action";
import MediaSelector from "@/components/MediaSelector";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
import DocumentSection, { DocumentItem } from "@/components/documents/documentSection";

const supplierFormSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  openingBalance: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  warehouseId: z.string().optional().or(z.literal("")),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
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
    warehouseId?: string | null;
  };
}

export default function SupplierForm({ mode, initialData }: SupplierFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>(
    Array.isArray(initialData?.documents) ? initialData.documents : []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
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
          warehouseId: initialData.warehouseId || "",
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
          warehouseId: "",
        },
  });

  useEffect(() => {
    async function loadWarehouses() {
      const res = await getWarehousesForSupplier();
      if (res.success && res.warehouses) {
        setWarehouses(res.warehouses);
        if (mode === "create" && res.defaultWarehouseId && !watch("warehouseId")) {
          setValue("warehouseId", res.defaultWarehouseId);
        }
      }
    }
    loadWarehouses();
  }, []);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createSupplier({
          name: data.name || undefined,
          email: data.email || null,
          phone: data.phone,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip: data.zip || undefined,
          country: data.country || undefined,
          company: data.company || undefined,
          image: data.image || undefined,
          documents: documents,
          openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : 0,
          status: data.status,
          warehouseId: data.warehouseId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create supplier");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/suppliers`);
      } else {
        const result = await updateSupplier({
          id: initialData!.id,
          name: data.name || undefined,
          email: data.email || null,
          phone: data.phone,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip: data.zip || undefined,
          country: data.country || undefined,
          company: data.company || undefined,
          image: data.image || undefined,
          documents: documents,
          openingBalance: data.openingBalance ? parseFloat(data.openingBalance) : undefined,
          status: data.status,
          warehouseId: data.warehouseId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update supplier");
        }

        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/suppliers`);
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
            {mode === "create" ? "Add New Supplier" : "Edit Supplier"}
          </CardTitle>
          <CardDescription>
            {mode === "create" ? "Enter supplier details to create a new supplier" : "Update supplier information"}
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
                      <p className="text-sm text-destructive">{errors.name.message}</p>
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
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      {...register("phone")}
                      disabled={loading}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
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
                      <p className="text-sm text-destructive">{errors.company.message}</p>
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
                    <p className="text-sm text-destructive">{errors.address.message}</p>
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
                      <p className="text-sm text-destructive">{errors.city.message}</p>
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
                      <p className="text-sm text-destructive">{errors.state.message}</p>
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
                      <p className="text-sm text-destructive">{errors.zip.message}</p>
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
                      <p className="text-sm text-destructive">{errors.country.message}</p>
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
                      <p className="text-sm text-destructive">{errors.openingBalance.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-sm text-destructive">{errors.status.message}</p>
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
              </div>

              {/* Right Column - Image (1 part) */}
              <div className="lg:col-span-1">
                <div className="space-y-2">
                  <Label>Supplier Photo</Label>
                  <MediaSelector
                    label=""
                    value={watch("image") || ""}
                    onChange={(url) => setValue("image", url || "")}
                    allowedTypes={["image/*"]}
                    width={200}
                    height={200}
                  />
                  {errors.image && (
                    <p className="text-sm text-destructive">{errors.image.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Section for Previous Dealings / Invoices / Photos */}
            <div className="mt-6">
              <DocumentSection
                documents={documents}
                onChange={setDocuments}
                title="Supplier Transaction & Dealing Documents"
                description="Upload and attach past invoices, contracts, tax documents, or photo records for this supplier."
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
                {loading ? "Saving..." : mode === "create" ? "Create Supplier" : "Update Supplier"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

