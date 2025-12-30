"use client";

import { useState } from "react";
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
import { createOrganization, updateOrganization } from "../../_actions/organization.action";
import { useToast } from "@/hooks/use-toast";
import MediaSelector from "@/components/MediaSelector";
import { getBasePathFromPathname } from "@/lib/route-utils-client";

const organizationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  details: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  logo: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    details: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo: string | null;
    status: string;
  };
}

export default function OrganizationForm({ mode, initialData }: OrganizationFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          details: initialData.details || "",
          address: initialData.address || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          website: initialData.website || "",
          logo: initialData.logo || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          details: "",
          address: "",
          phone: "",
          email: "",
          website: "",
          logo: "",
          status: "active",
        },
  });

  const status = watch("status");

  const onSubmit = async (data: OrganizationFormData) => {
    setError("");
    setLoading(true);

    try {
      let result;
      if (mode === "create") {
        result = await createOrganization({
          name: data.name,
          details: data.details || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          logo: data.logo || undefined,
          status: data.status,
        });
      } else {
        if (!initialData?.id) {
          setError("Organization ID is required for editing");
          setLoading(false);
          return;
        }
        result = await updateOrganization({
          id: initialData.id,
          name: data.name,
          details: data.details || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          logo: data.logo || undefined,
          status: data.status,
        });
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Organization ${mode === "create" ? "created" : "updated"} successfully`,
        });
        const basePath = getBasePathFromPathname(pathname);
        router.push(`${basePath}/settings?section=organization`);
        router.refresh();
      } else {
        setError(result.error || `Failed to ${mode === "create" ? "create" : "update"} organization`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {mode === "create" ? "Create Organization" : "Edit Organization"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "create"
            ? "Add a new organization to your system"
            : "Update organization information"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center gap-2 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Enter the organization information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6 md:col-span-1">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter organization name"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Details</Label>
                  <Textarea
                    id="details"
                    {...register("details")}
                    placeholder="Enter organization details (optional)"
                    rows={4}
                    className={errors.details ? "border-destructive" : ""}
                  />
                  {errors.details && (
                    <p className="text-sm text-destructive">{errors.details.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    {...register("address")}
                    placeholder="Enter organization address (optional)"
                    rows={3}
                    className={errors.address ? "border-destructive" : ""}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="Enter phone number (optional)"
                    type="tel"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    {...register("email")}
                    placeholder="Enter email address (optional)"
                    type="email"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    {...register("website")}
                    placeholder="https://example.com (optional)"
                    type="url"
                    className={errors.website ? "border-destructive" : ""}
                  />
                  {errors.website && (
                    <p className="text-sm text-destructive">{errors.website.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                  >
                    <SelectTrigger id="status" className={errors.status ? "border-destructive" : ""}>
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
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="logo">Logo</Label>
                <MediaSelector
                  value={watch("logo") || ""}
                  onChange={(url) => setValue("logo", url || "")}
                  width={200}
                  height={200}
                />
                {errors.logo && (
                  <p className="text-sm text-destructive">{errors.logo.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading
                  ? mode === "create"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "create"
                  ? "Create Organization"
                  : "Update Organization"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const basePath = getBasePathFromPathname(pathname);
                  router.push(`${basePath}/settings?section=organization`);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

