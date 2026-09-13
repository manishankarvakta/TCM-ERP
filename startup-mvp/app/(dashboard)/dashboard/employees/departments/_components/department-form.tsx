"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useToast } from "@/hooks/use-toast";
import { createDepartment, updateDepartment } from "../_actions/department.action";
import Link from "next/link";

interface DepartmentFormProps {
  initialData?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: string;
  } | null;
}

export default function DepartmentForm({ initialData }: DepartmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [status, setStatus] = useState(initialData?.status || "active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast({ title: "Validation Error", description: "Name and Code are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (initialData?.id) {
        res = await updateDepartment(initialData.id, { name, code, description, status });
      } else {
        res = await createDepartment({ name, code, description, status });
      }

      if (res.success) {
        toast({ title: "Success", description: `Department ${initialData ? "updated" : "created"} successfully` });
        router.push("/dashboard/employees/departments");
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
          <Link href="/dashboard/employees/departments">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Departments
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Edit Department" : "Add New Department"}</CardTitle>
          <CardDescription>
            Manage organizational divisions for staff grouping and operational routing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Information Technology, HR & Admin, Accounts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="e.g. IT, HR, ACCT"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of operational responsibilities..."
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
                <Link href="/dashboard/employees/departments">Cancel</Link>
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
