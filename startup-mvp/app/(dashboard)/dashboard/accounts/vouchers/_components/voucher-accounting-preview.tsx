import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiAlertCircle } from "react-icons/fi";
import { VoucherType } from "@prisma/client";
import { cn } from "@/lib/utils";

interface VoucherAccountingPreviewProps {
  type: VoucherType;
  title: string;
  impact: string;
  helper: string;
  className?: string;
}

export function VoucherAccountingPreview({ 
  type, 
  title, 
  impact, 
  helper,
  className 
}: VoucherAccountingPreviewProps) {
  // Determine color based on type
  const colorMap = {
    [VoucherType.PAYMENT]: "blue",
    [VoucherType.RECEIPT]: "green",
    [VoucherType.CONTRA]: "blue",
    [VoucherType.JOURNAL]: "purple",
    [VoucherType.SALES]: "slate",
    [VoucherType.PURCHASE]: "slate",
    [VoucherType.ADJUSTMENT]: "amber",
  };

  const color = colorMap[type] || "slate";

  const stylesMap: Record<string, string> = {
    blue: "bg-blue-50/50 border-blue-100 text-blue-800 icon-blue-600 box-blue-900 helper-blue-600",
    green: "bg-green-50/50 border-green-100 text-green-800 icon-green-600 box-green-900 helper-green-600",
    purple: "bg-purple-50/50 border-purple-100 text-purple-800 icon-purple-600 box-purple-900 helper-purple-600",
    slate: "bg-slate-50/50 border-slate-100 text-slate-800 icon-slate-600 box-slate-900 helper-slate-600",
    amber: "bg-amber-50/50 border-amber-100 text-amber-800 icon-amber-600 box-amber-900 helper-amber-600",
  };

  const styles = stylesMap[color];
  const parts = styles.split(" ");

  const bg = parts[0];
  const border = parts[1];
  const titleColor = parts[2];
  const iconColor = parts[3].replace("icon-", "text-");
  const boxTitleColor = parts[4].replace("box-", "text-");
  const boxHelperColor = parts[5].replace("helper-", "text-");

  return (
    <Card className={cn(bg, border, className)}>
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <FiAlertCircle className={cn("w-4 h-4", iconColor)} />
          <CardTitle className={cn("text-xs font-semibold uppercase tracking-wider", titleColor)}>
            Accounting Impact: {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="p-3 bg-white rounded border border-inherit shadow-sm">
          <p className={cn("text-sm font-semibold", boxTitleColor)}>
            {impact}
          </p>
          <p className={cn("text-xs mt-1 leading-relaxed", boxHelperColor)}>
            {helper}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
