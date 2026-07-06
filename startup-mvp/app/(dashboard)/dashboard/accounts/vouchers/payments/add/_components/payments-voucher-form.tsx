"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave } from "react-icons/fi";

export default function PaymentsVoucherForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard/accounts/vouchers");
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <FiArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-xl font-bold">New Payment (Payment Voucher)</h1>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Log a payment transaction out of bank/cash accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input type="date" id="date" required defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref">Reference</Label>
                <Input type="text" id="ref" placeholder="e.g. PAY-10023" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paying">Paying Account (Credit Source)</Label>
                <Input type="text" id="paying" placeholder="Cash / Bank Account" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payee">Payee / Recipient Account</Label>
                <Input type="text" id="payee" placeholder="Supplier / Expense Account" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input type="number" id="amount" placeholder="৳ 0.00" min="0.01" step="0.01" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" placeholder="Enter payment details..." rows={3} />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="gap-2">
                <FiSave className="h-4 w-4" />
                {loading ? "Saving payment..." : "Save Payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
