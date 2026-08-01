"use client";

import Link from "next/link";
import { 
  FiArrowDownCircle, 
  FiArrowUpCircle, 
  FiRefreshCw, 
  FiFileText
} from "react-icons/fi";

interface VoucherQuickCreateProps {
  basePath?: string;
}

const voucherTypes = [
  {
    id: "payment",
    title: "Payment",
    subtitle: "Suppliers & Vendors",
    icon: FiArrowUpCircle,
    href: "/payment/add",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50/80 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50",
    borderColor: "border-red-200 dark:border-red-800/60",
  },
  {
    id: "receipt",
    title: "Receipt",
    subtitle: "Clients & Income",
    icon: FiArrowDownCircle,
    href: "/receipt/add",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50/80 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/50",
    borderColor: "border-green-200 dark:border-green-800/60",
  },
  {
    id: "contra",
    title: "Transfer",
    subtitle: "Cash & Bank",
    icon: FiRefreshCw,
    href: "/contra/add",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50",
    borderColor: "border-blue-200 dark:border-blue-800/60",
  },
  {
    id: "expenses",
    title: "Expenses",
    subtitle: "Operational Costs",
    icon: FiArrowUpCircle,
    href: "/expenses/add",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50",
    borderColor: "border-amber-200 dark:border-amber-800/60",
  },
  {
    id: "journal",
    title: "Journal",
    subtitle: "General Entries",
    icon: FiFileText,
    href: "/journal/add",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50",
    borderColor: "border-purple-200 dark:border-purple-800/60",
  },
];

export default function VoucherQuickCreate({ basePath = "/dashboard/accounts/vouchers" }: VoucherQuickCreateProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
                flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150
                hover:shadow-sm hover:scale-[1.02] cursor-pointer ${type.bgColor} ${type.borderColor}
              `}
            >
              <Icon className={`h-4 w-4 shrink-0 ${type.color}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold leading-tight whitespace-nowrap">{type.title}</span>
                <span className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">{type.subtitle}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
