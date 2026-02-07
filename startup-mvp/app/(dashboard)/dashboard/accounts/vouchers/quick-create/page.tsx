import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiArrowRight, FiBriefcase, FiCreditCard, FiDollarSign, FiRefreshCw } from "react-icons/fi";
import PageGuard from "@/components/permissions/page-guard";

export default function QuickCreateVoucherPage() {
  const voucherTypes = [
    {
      title: "Payment Voucher",
      description: "Record money leaving the business (e.g., expenses, vendor payments).",
      icon: FiCreditCard,
      type: "PAYMENT",
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      title: "Receipt Voucher",
      description: "Record money entering the business (e.g., customer payments, refunds).",
      icon: FiDollarSign,
      type: "RECEIPT",
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Contra Voucher",
      description: "Move money between internal accounts (e.g., Bank Deposit, Withdrawals).",
      icon: FiRefreshCw,
      type: "CONTRA",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Journal Voucher",
      description: "Adjustments, depreciations, and non-cash accounting entries.",
      icon: FiBriefcase,
      type: "JOURNAL",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <PageGuard permissionKey="accounts.vouchers">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quick Create Voucher</h1>
          <p className="text-muted-foreground mt-1">
            Select the type of voucher you want to create to proceed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {voucherTypes.map((voucher) => (
            <Link
              key={voucher.type}
              href={`/dashboard/accounts/vouchers/create?type=${voucher.type}`}
              className="block group"
            >
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className={`p-3 rounded-lg ${voucher.bgColor} ${voucher.color} transition-transform group-hover:scale-110`}>
                    <voucher.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{voucher.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {voucher.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        Create {voucher.title} <FiArrowRight className="ml-1 w-4 h-4" />
                    </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageGuard>
  );
}
