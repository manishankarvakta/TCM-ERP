"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { createDesignation, updateDesignation } from "../_actions/designation.action";
import { getDepartments } from "../../departments/_actions/department.action";
import Link from "next/link";

interface DesignationFormProps {
  initialData?: {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
    status: string;
  } | null;
}

export default function DesignationForm({ initialData }: DesignationFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [departmentName, setDepartmentName] = useState(initialData?.departmentName || "");
  const [departmentId, setDepartmentId] = useState(initialData?.departmentId || "");
  const [status, setStatus] = useState(initialData?.status || "active");
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadDepts() {
      const res = await getDepartments(1, 1000, "", "active");
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    }
    loadDepts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast({ title: "Validation Error", description: "Designation Name is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (initialData?.id) {
        res = await updateDesignation(initialData.id, { name, code, description, departmentId, departmentName, status });
      } else {
        res = await createDesignation({ name, code, description, departmentId, departmentName, status });
      }

      if (res.success) {
        toast({ title: "Success", description: `Designation ${initialData ? "updated" : "created"} successfully` });
        router.push("/dashboard/employees/designations");
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error || "Operation failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save record", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/employees/designations">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Designations
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Edit Designation" : "Add New Designation"}</CardTitle>
          <CardDescription>
            Manage employee job titles, rank hierarchy, and assign them to an organizational department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Assigned Department</Label>
              <Select
                value={departmentName}
                onValueChange={(val) => {
                  setDepartmentName(val);
                  const found = departments.find((d) => d.name === val);
                  setDepartmentId(found ? found.id : "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Designation Title *</Label>
              <Input
                id="name"
                placeholder="e.g. Senior Executive - IT, Software Engineer, Production Supervisor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code / Abbreviation</Label>
              <Input
                id="code"
                placeholder="e.g. SR-EXEC, SWE, PROD-SUP"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional summary of role duties..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/employees/designations">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <FiSave className="h-4 w-4" />
                {isSubmitting ? "Saving..." : initialData ? "Update Record" : "Create Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
