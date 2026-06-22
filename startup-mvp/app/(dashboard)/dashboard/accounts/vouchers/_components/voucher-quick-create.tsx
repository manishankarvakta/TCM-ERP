"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FiArrowDownCircle, 
  FiArrowUpCircle, 
  FiRefreshCw, 
  FiFileText,
  FiPlus
} from "react-icons/fi";

interface VoucherQuickCreateProps {
  basePath?: string;
}

const voucherTypes = [
  {
    id: "payment",
    title: "Payment Voucher",
    description: "Record payments to suppliers, vendors, or expenses",
    icon: FiArrowUpCircle,
    href: "/payment/add",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
  },
  {
    id: "receipt",
    title: "Receipt Voucher",
    description: "Record money received from clients or income",
    icon: FiArrowDownCircle,
    href: "/receipt/add",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    id: "contra",
    title: "Transfer",
    description: "Transfer between Cash and Bank accounts",
    icon: FiRefreshCw,
    href: "/contra/add",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "expenses",
    title: "Expenses",
    description: "Record business, administrative, or operational expenses",
    icon: FiArrowUpCircle,
    href: "/expenses/add",
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "journal",
    title: "Journal Voucher",
    description: "General entries for adjustments and corrections",
    icon: FiFileText,
    href: "/journal/add",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
];

export default function VoucherQuickCreate({ basePath = "/dashboard/accounts/vouchers" }: VoucherQuickCreateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FiPlus className="h-5 w-5" />
          Quick Create Voucher
        </CardTitle>
        <CardDescription>
          Select the type of voucher you want to create
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {voucherTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Link 
                key={type.id} 
                href={`${basePath}${type.href}`}
                className="block"
              >
                <div 
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200
                    hover:shadow-md hover:scale-[1.02] cursor-pointer
                    ${type.bgColor} ${type.borderColor}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-white dark:bg-gray-900 ${type.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{type.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
