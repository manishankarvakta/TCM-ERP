"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { createLoan } from "../../_actions/loan.action";
import { FiCalendar, FiDollarSign, FiClock, FiFileText, FiUser } from "react-icons/fi";

interface Employee {
  id: string;
  name: string;
  employeeCode: string | null;
}

interface LoanFormProps {
  employees: Employee[];
}

export default function LoanForm({ employees }: LoanFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    tenureMonths: "12",
    monthlyInstallment: "",
    purpose: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const amount = parseFloat(formData.amount);
    const tenure = parseInt(formData.tenureMonths);
    if (!isNaN(amount) && !isNaN(tenure) && tenure > 0) {
      const installment = (amount / tenure).toFixed(2);
      setFormData(prev => ({ ...prev, monthlyInstallment: installment }));
    }
  }, [formData.amount, formData.tenureMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId) {
      toast({ title: "Error", description: "Please select an employee", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = await createLoan({
        employeeId: formData.employeeId,
        amount: parseFloat(formData.amount),
        tenureMonths: parseInt(formData.tenureMonths),
        monthlyInstallment: parseFloat(formData.monthlyInstallment),
        purpose: formData.purpose,
        startDate: new Date(formData.startDate),
      });

      if (result.success) {
        toast({ title: "Success", description: "Loan application submitted successfully" });
        router.push("/dashboard/hr/loans");
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to submit loan application", variant: "destructive" });
      }
    });
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg border-primary/10">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <FiFileText className="h-5 w-5 text-primary" />
          Loan Details
        </CardTitle>
        <CardDescription>Fill in the employee loan application information</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="flex items-center gap-2">
                <FiUser className="h-4 w-4" />
                Select Employee
              </Label>
              <SearchableSelect 
                value={formData.employeeId} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, employeeId: val || "" }))}
                placeholder="Select an employee"
                options={employees.map((emp) => ({
                  value: emp.id,
                  label: emp.name,
                  description: emp.employeeCode || undefined
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Issue Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <FiDollarSign className="h-4 w-4" />
                Loan Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenureMonths" className="flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Tenure (Months)
              </Label>
              <Input
                id="tenureMonths"
                type="number"
                placeholder="12"
                value={formData.tenureMonths}
                onChange={(e) => setFormData(prev => ({ ...prev, tenureMonths: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="monthlyInstallment" className="flex items-center gap-2">
                <FiDollarSign className="h-4 w-4" />
                Monthly Installment (Auto-calculated)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <Input
                  id="monthlyInstallment"
                  type="number"
                  step="0.01"
                  className="pl-7 bg-muted font-bold"
                  value={formData.monthlyInstallment}
                  readOnly
                />
              </div>
              <p className="text-[10px] text-muted-foreground">The installment is calculated as Total Amount / Tenure.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose" className="flex items-center gap-2">
                <FiFileText className="h-4 w-4" />
                Purpose of Loan
              </Label>
              <Textarea
                id="purpose"
                placeholder="Enter the reason for this loan application..."
                rows={3}
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 min-w-[120px]"
            >
              {isPending ? "Submitting..." : "Apply Loan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
