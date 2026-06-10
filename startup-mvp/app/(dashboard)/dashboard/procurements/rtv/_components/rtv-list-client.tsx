"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye } from "react-icons/fi";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

interface RTVListClientProps {
  initialData: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchStr: string;
}

export default function RTVListClient({ initialData, pagination, searchStr }: RTVListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchStr);
  
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch !== searchStr) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`/dashboard/procurements/rtv?${params.toString()}`);
    }
  }, [debouncedSearch, searchStr, searchParams, router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/procurements/rtv?${params.toString()}`);
  };

  return (
    <Card>
      <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center border-b">
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search RTVs..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search returns to vendor"
          />
        </div>
      </div>
      <CardContent className="p-0">
        <div className="rounded-md border-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>RTV Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No returns found.
                  </TableCell>
                </TableRow>
              ) : (
                initialData.map((rtv) => (
                  <TableRow key={rtv.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{rtv.rtvNumber}</TableCell>
                    <TableCell>{new Date(rtv.date).toLocaleDateString()}</TableCell>
                    <TableCell>{rtv.supplier.name}</TableCell>
                    <TableCell>{rtv.warehouse.name}</TableCell>
                    <TableCell className="text-right">৳{Number(rtv.grandTotal).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rtv.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {rtv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild aria-label={`View RTV ${rtv.rtvNumber}`}>
                        <Link href={`/dashboard/procurements/rtv/${rtv.id}/view`}>
                          <FiEye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Previous page"
              >
                <FiChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Next page"
              >
                Next
                <FiChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
