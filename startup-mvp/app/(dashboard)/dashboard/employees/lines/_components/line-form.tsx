"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FiAlertCircle } from "react-icons/fi";
import { createLine, updateLine } from "../_actions/line.action";
import { getFloors } from "../../floors/_actions/floor.action";
import { useToast } from "@/hooks/use-toast";

const lineFormSchema = z.object({
  name: z.string().min(1, "Line name is required"),
  description: z.string().optional().or(z.literal("")),
  floorId: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type LineFormData = z.infer<typeof lineFormSchema>;

interface LineFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    floorId: string | null;
    status: string;
  };
}

export default function LineForm({ mode, initialData }: LineFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [floors, setFloors] = useState<any[]>([]);

  useEffect(() => {
    async function loadFloors() {
      const res = await getFloors(1, 100, "", "active");
      if (res.success && res.floors) {
        setFloors(res.floors);
      }
    }
    loadFloors();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LineFormData>({
    resolver: zodResolver(lineFormSchema as any),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || "",
          floorId: initialData.floorId || "",
          status: (initialData.status === "trash" ? "active" : initialData.status) as "active" | "inactive",
        }
      : {
          name: "",
          description: "",
          floorId: "",
          status: "active",
        },
  });

  const onSubmit = async (data: LineFormData) => {
    try {
      setLoading(true);
      setError("");

      if (mode === "create") {
        const result = await createLine({
          name: data.name,
          description: data.description || undefined,
          floorId: data.floorId || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to create line");
        }

        toast({ title: "Success", description: "Line created successfully" });
        router.push(`/dashboard/employees/lines`);
      } else if (mode === "edit" && initialData) {
        const result = await updateLine(initialData.id, {
          name: data.name,
          description: data.description || undefined,
          floorId: data.floorId || undefined,
          status: data.status,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update line");
        }

        toast({ title: "Success", description: "Line updated successfully" });
        router.push(`/dashboard/employees/lines`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Add New Line" : "Edit Line"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Create a dynamic production/work line. Can optionally be associated with a Floor."
              : "Update line details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Line Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Line 01, Line A, Assembly Line 3"
                    {...register("name")}
                    disabled={loading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floorId">Associated Floor (Optional)</Label>
                  <SearchableSelect
                    value={watch("floorId")}
                    onValueChange={(val) => setValue("floorId", val || "")}
                    disabled={loading}
                    placeholder="Select floor (optional)"
                    options={floors.map((f) => ({
                      value: f.id,
                      label: f.name,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this line's operations or details..."
                    {...register("description")}
                    disabled={loading}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    defaultValue={watch("status")}
                    onValueChange={(value) => setValue("status", value as "active" | "inactive")}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/employees/lines")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "create" ? "Add Line" : "Update Line"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
