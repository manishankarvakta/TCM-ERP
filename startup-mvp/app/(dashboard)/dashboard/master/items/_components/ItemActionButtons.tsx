"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FiPrinter, FiEdit, FiFileText } from "react-icons/fi";
import Link from "next/link";
import BarcodePrintModal from "./BarcodePrintModal";

interface ItemActionButtonsProps {
  item: {
    id: string;
    code: string;
    name: string;
    barcode: string | null;
    salesPrice: number | null;
    variants?: any[];
    featuredImage?: string | null;
    images?: any;
  };
  canEdit: boolean;
}

export default function ItemActionButtons({ item, canEdit }: ItemActionButtonsProps) {
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" asChild>
        <Link href={`/dashboard/master/items/ledger?id=${item.id}`}>
          <FiFileText className="mr-2 h-4 w-4" />
          Item Ledger
        </Link>
      </Button>

      <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
        <FiPrinter className="mr-2 h-4 w-4" />
        Print Barcodes
      </Button>

      {canEdit && (
        <Button asChild>
          <Link href={`/dashboard/master/items/${item.id}/edit`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Item
          </Link>
        </Button>
      )}

      <BarcodePrintModal
        item={item}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />
    </div>
  );
}
