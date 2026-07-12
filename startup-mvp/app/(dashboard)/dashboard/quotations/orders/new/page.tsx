import React from 'react';
import { DirectOrderForm } from '@/components/work-order/DirectOrderForm';

export default function NewDirectOrderPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Direct Order</h1>
        <p className="text-muted-foreground">
          Create a work order directly for domains, hosting, or other one-off sales without a quotation.
        </p>
      </div>

      <DirectOrderForm />
    </div>
  );
}
