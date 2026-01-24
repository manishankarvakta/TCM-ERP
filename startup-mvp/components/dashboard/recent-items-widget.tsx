"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { FiPackage } from "react-icons/fi";

interface RecentItem {
  id: string;
  code: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  createdAt: Date;
  unit: {
    id: string;
    symbol: string;
    details: string;
  };
  categories: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
}

interface RecentItemsWidgetProps {
  items: RecentItem[];
}

export default function RecentItemsWidget({ items }: RecentItemsWidgetProps) {
  if (items.length === 0) {
    return (
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">Recent Items</CardTitle>
            <CardDescription className="mt-1">Recently added items</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-center space-y-2 border border-dashed rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">
              No items found
            </p>
            <p className="text-xs text-muted-foreground">
              Create your first item to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return `৳ ${new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Recent Items</CardTitle>
            <CardDescription className="mt-1">Recently added items</CardDescription>
          </div>
          <Link href="/dashboard/items">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              View all
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.slice(0, 5).map((item) => (
            <div 
              key={item.id} 
              className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/items/${item.id}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {item.code}
                  </Link>
                  {item.categories.length > 0 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {item.categories[0].category.name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {item.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Unit:</span>
                    {item.unit.symbol}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {formatCurrency(item.unitPrice)}
                </div>
                <div className="text-xs text-muted-foreground">
                  per {item.unit.symbol}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

