"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getBasePathFromPathname } from "@/lib/route-utils-client";
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
import { FiAlertCircle, FiSearch } from "react-icons/fi";
import { createUser, updateUser, getActiveUsers } from "@/app/actions/user.action";
import { getActiveWarehouses } from "@/app/(dashboard)/dashboard/master/warehouses/_actions/warehouse.action";
import MediaSelector from "@/components/MediaSelector";

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    )
    .optional()
    .or(z.literal("")),
  role: z.enum(["user", "admin"]),
  image: z.string().url("Invalid image URL").optional().or(z.literal("")),
  inchargeId: z.string().optional().or(z.literal("")),
  defaultWarehouseId: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  isActive: z.enum(["enabled", "disabled"]),
});

type UserFormDataWithId = z.infer<typeof userFormSchema> & { id?: string };

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    image: string | null;
    inchargeId?: string | null;
    incharge?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    defaultWarehouseId?: string | null;
    defaultWarehouse?: {
      id: string;
      name: string;
      code: string;
    } | null;
    status: string;
    isActive: string;
  };
}

export default function UserForm({ mode, initialData }: UserFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getBasePathFromPathname(pathname || "");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [inchargeSearch, setInchargeSearch] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormDataWithId>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name || "",
          email: initialData.email,
          password: "",
          role: (initialData.role as "user" | "admin") || "user",
          image: initialData.image || "",
          inchargeId: initialData.inchargeId || "",
          defaultWarehouseId: initialData.defaultWarehouseId || "",
          status: (initialData.status as "active" | "inactive") || "active",
          isActive: (initialData.isActive as "enabled" | "disabled") || "enabled",
        }
      : {
          name: "",
          email: "",
          password: "",
          role: "user",
          image: "",
          inchargeId: "",
          defaultWarehouseId: "",
          status: "active",
          isActive: "enabled",
        },
  });

  // Fetch active users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const result = await getActiveUsers();
        if (result.success && result.users) {
          setUsers(result.users);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setUsersLoading(false);
      }
    };

    const fetchWarehouses = async () => {
      try {
        setWarehousesLoading(true);
        const result = await getActiveWarehouses();
        if (result.success && result.warehouses) {
          setWarehouses(result.warehouses);
          // Auto-select first warehouse on create mode if none selected
          if (mode === "create" && result.warehouses.length > 0 && !watch("defaultWarehouseId")) {
            setValue("defaultWarehouseId", result.warehouses[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      } finally {
        setWarehousesLoading(false);
      }
    };

    fetchUsers();
    fetchWarehouses();
  }, []);

  const onSubmit = async (data: UserFormDataWithId) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        if (!data.password || data.password.length === 0) {
          setError("Password is required for new users");
          return;
        }

        const result = await createUser({
          name: data.name,
          email: data.email,
          password: data.password!,
          role: data.role,
          image: data.image || undefined,
          inchargeId: data.inchargeId && data.inchargeId.length > 0 ? data.inchargeId : undefined,
          defaultWarehouseId: data.defaultWarehouseId && data.defaultWarehouseId.length > 0 ? data.defaultWarehouseId : undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create user");
        }

        router.push(`${basePath}/users`);
      } else {
        const result = await updateUser({
          id: initialData!.id,
          name: data.name,
          email: data.email,
          password: data.password && data.password.length > 0 ? data.password : undefined,
          role: data.role,
          image: data.image || undefined,
          inchargeId: data.inchargeId && data.inchargeId.length > 0 ? data.inchargeId : undefined,
          defaultWarehouseId: data.defaultWarehouseId && data.defaultWarehouseId.length > 0 ? data.defaultWarehouseId : undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update user");
        }

        router.push(`${basePath}/users`);
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
            {mode === "create" ? "Add New User" : "Edit User"}
          </CardTitle>
          <CardDescription>
            {mode === "create" ? "Enter user details to create a new account" : "Update user information"}
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

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {mode === "edit" && "(leave blank to keep current)"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    disabled={loading}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={watch("role")}
                      onValueChange={(value) => setValue("role", value as "user" | "admin")}
                      disabled={loading}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-destructive">{errors.role.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultWarehouseId">Default Warehouse</Label>
                    <Select
                      value={watch("defaultWarehouseId") || "__none__"}
                      onValueChange={(value) => setValue("defaultWarehouseId", value === "__none__" ? "" : value)}
                      disabled={loading || warehousesLoading}
                    >
                      <SelectTrigger id="defaultWarehouseId">
                        <SelectValue placeholder={warehousesLoading ? "Loading..." : "Select warehouse (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} ({warehouse.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.defaultWarehouseId && (
                      <p className="text-sm text-destructive">{errors.defaultWarehouseId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inchargeId">Incharge</Label>
                    <Select
                      value={watch("inchargeId") || "__none__"}
                      onValueChange={(value) => setValue("inchargeId", value === "__none__" ? "" : value)}
                      disabled={loading || usersLoading}
                    >
                      <SelectTrigger id="inchargeId" className="h-9 text-xs text-left">
                        <SelectValue placeholder={usersLoading ? "Loading..." : "Select incharge (optional)"}>
                          {watch("inchargeId") && watch("inchargeId") !== "__none__" ? (() => {
                            const selectedUser = users.find(u => u.id === watch("inchargeId"));
                            return selectedUser ? (selectedUser.name || selectedUser.email) : "Select incharge (optional)";
                          })() : "Select incharge (optional)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2">
                          <div className="relative">
                            <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                            <Input
                              placeholder="Search users..."
                              value={inchargeSearch}
                              onChange={(e) => setInchargeSearch(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                }
                              }}
                              className="pl-8 h-8 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="__none__" className="text-left">None</SelectItem>
                          {users
                            .filter((user) => {
                              // Filter out current user when editing
                              if (mode === "edit" && user.id === initialData?.id) return false;
                              // Filter by search
                              if (!inchargeSearch) return true;
                              const searchLower = inchargeSearch.toLowerCase();
                              return (
                                user.name?.toLowerCase().includes(searchLower) ||
                                user.email.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id} className="text-left">
                                {user.name || user.email} {user.name && `(${user.email})`}
                              </SelectItem>
                            ))}
                        </div>
                      </SelectContent>
                    </Select>
                    {errors.inchargeId && (
                      <p className="text-sm text-destructive">{errors.inchargeId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                      disabled={loading}
                    >
                      <SelectTrigger id="status">
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

                <div className="space-y-2">
                  <Label htmlFor="isActive">Login Access</Label>
                  <Select
                    value={watch("isActive")}
                    onValueChange={(value) => setValue("isActive", value as "enabled" | "disabled")}
                    disabled={loading}
                  >
                    <SelectTrigger id="isActive">
                      <SelectValue placeholder="Select login access" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.isActive && (
                    <p className="text-sm text-destructive">{errors.isActive.message}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : mode === "create" ? "Create User" : "Update User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Right Column - Photo Upload (1 part) */}
              <div className="lg:col-span-1 flex justify-center items-start">
                <div className="space-y-2 text-center">
                  <div className="flex justify-center items-center mb-4">

                  <Label className="text-center">Profile Photo</Label>
                  </div>
                  <MediaSelector
                    value={watch("image") || ""}
                    onChange={(url) => setValue("image", url)}
                    allowedTypes={["image/*"]}
                    previewStyle="round-full"
                    width={100}
                    height={100}
                  />
                  {errors.image && (
                    <p className="text-sm text-destructive mt-2">{errors.image.message}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
