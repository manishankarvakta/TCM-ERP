"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FixedAssetTabs() {
  const pathname = usePathname();

  let activeTab = "register";
  if (pathname.includes("/fixed-assets/items")) activeTab = "items";
  else if (pathname.includes("/capitalization")) activeTab = "capitalization";
  else if (pathname.includes("/depreciation")) activeTab = "depreciation";
  else if (pathname.includes("/disposals")) activeTab = "disposals";
  else if (pathname.includes("/transfers")) activeTab = "transfers";

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList>
        <TabsTrigger value="register" asChild>
          <Link href="/dashboard/accounts/fixed-assets">Asset Register</Link>
        </TabsTrigger>
        <TabsTrigger value="items" asChild>
          <Link href="/dashboard/accounts/fixed-assets/items">Itemized Assets (QTY)</Link>
        </TabsTrigger>
        <TabsTrigger value="capitalization" asChild>
          <Link href="/dashboard/accounts/fixed-assets/capitalization">Capitalization</Link>
        </TabsTrigger>
        <TabsTrigger value="depreciation" asChild>
          <Link href="/dashboard/accounts/fixed-assets/depreciation">Depreciation</Link>
        </TabsTrigger>
        <TabsTrigger value="disposals" asChild>
          <Link href="/dashboard/accounts/fixed-assets/disposals">Disposals</Link>
        </TabsTrigger>
        <TabsTrigger value="transfers" asChild>
          <Link href="/dashboard/accounts/fixed-assets/transfers">Transfers</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
