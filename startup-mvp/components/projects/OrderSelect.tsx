"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getOrders } from "@/app/actions/orders";
import { FiShoppingCart } from "react-icons/fi";

interface OrderSelectProps {
  value?: string;
  onValueChange: (value: any) => void;
  disabled?: boolean;
}

export default function OrderSelect({ value, onValueChange, disabled }: OrderSelectProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrdersList = async () => {
      setLoading(true);
      // Fetching up to 100 recent orders for selection
      const result = await getOrders(1, 100);
      if (result.success) {
        setOrders(result.orders || []);
      }
      setLoading(false);
    };
    fetchOrdersList();
  }, []);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
        <FiShoppingCart className="h-4 w-4" />
        Linked Order
      </Label>
      <Select 
        value={value} 
        onValueChange={(val) => {
          if (val === "none") {
            onValueChange(null);
          } else {
            const order = orders.find(o => o.id === val);
            onValueChange(order || val);
          }
        }} 
        disabled={disabled || loading}
      >
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue placeholder={loading ? "Loading..." : "Select an order"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {orders.map((order) => (
            <SelectItem key={order.id} value={order.id}>
              {order.orderNumber} ({order.Client?.company || order.Client?.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
