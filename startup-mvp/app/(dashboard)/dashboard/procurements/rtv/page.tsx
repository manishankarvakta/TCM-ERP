import React from "react";
import { getReturnsToVendor } from "./_actions/rtv.action";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RTVListClient from "./_components/rtv-list-client";

export default async function RTVPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const result = await getReturnsToVendor(page, 10, search);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Returns to Vendor (RTV)</h1>
        <div className="text-destructive">{result.error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Returns to Vendor (RTV)</h1>
          <p className="text-sm text-muted-foreground">Manage supplier returns</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/procurements/rtv/new">
            <FiPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Return
          </Link>
        </Button>
      </div>

      <RTVListClient 
        initialData={result.rtvs || []} 
        pagination={result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }} 
        searchStr={search} 
      />
    </div>
  );
}
