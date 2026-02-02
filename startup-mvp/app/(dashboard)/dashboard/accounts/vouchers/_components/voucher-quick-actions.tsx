"use client";


import Link from "next/link";
import { FiArrowUpCircle, FiArrowDownCircle, FiRefreshCw, FiFileText } from "react-icons/fi";

export default function VoucherQuickActions() {
  const voucherTypes = [
    {
      title: "Payment Voucher",
      description: "Record payments to suppliers, vendors, or expenses",
      icon: FiArrowUpCircle,
      type: "PAYMENT",
      color: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
    },
    {
      title: "Receipt Voucher",
      description: "Record money received from clients or income",
      icon: FiArrowDownCircle,
      type: "RECEIPT",
      color: "text-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
    },
    {
      title: "Contra Voucher",
      description: "Transfer between Cash and Bank accounts",
      icon: FiRefreshCw,
      type: "CONTRA",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
    },
    {
      title: "Journal Voucher",
      description: "General entries for adjustments and corrections",
      icon: FiFileText,
      type: "JOURNAL",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
    },
  ];

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-xl">+</span> Quick Create Voucher
        </h3>
        <p className="text-muted-foreground text-sm">
          Select the type of voucher you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {voucherTypes.map((voucher) => (
          <Link
            key={voucher.type}
            href={`/dashboard/accounts/vouchers/add?type=${voucher.type}`}
            className="block h-full"
          >
            <div
              className={`h-full p-4 rounded-lg border ${voucher.bgColor} ${voucher.borderColor} hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${voucher.color}`}>
                  <voucher.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-foreground">{voucher.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {voucher.description}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
