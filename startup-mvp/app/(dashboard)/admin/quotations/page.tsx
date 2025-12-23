import React from "react";
import { getQuotations } from "@/app/actions/quotations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import QuotationsListClient from "@/components/quotation/quotations-list-client";

interface QuotationsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    tab?: string;
  }>;
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const tab = params.tab || "all";

  const result = await getQuotations(page, 10, search, tab);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Quotations</h1>
            <p className="text-sm text-muted-foreground">Manage quotations in your system</p>
          </div>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {result.error || "Error loading quotations"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage quotations in your system</p>
        </div>
        {tab !== "trash" && (
          <Button asChild>
            <Link href="/admin/quotations/new">
              <FiPlus className="mr-2 h-4 w-4" />
              New Quotation
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/admin/quotations?tab=all&page=1">All</Link>
          </TabsTrigger>
          <TabsTrigger value="DRAFT" asChild>
            <Link href="/admin/quotations?tab=DRAFT&page=1">Draft</Link>
          </TabsTrigger>
          <TabsTrigger value="SENT" asChild>
            <Link href="/admin/quotations?tab=SENT&page=1">Sent</Link>
          </TabsTrigger>
          <TabsTrigger value="ACCEPTED" asChild>
            <Link href="/admin/quotations?tab=ACCEPTED&page=1">Accepted</Link>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" asChild>
            <Link href="/admin/quotations?tab=REJECTED&page=1">Rejected</Link>
          </TabsTrigger>
          <TabsTrigger value="EXPIRED" asChild>
            <Link href="/admin/quotations?tab=EXPIRED&page=1">Expired</Link>
          </TabsTrigger>
          <TabsTrigger value="REVISED" asChild>
            <Link href="/admin/quotations?tab=REVISED&page=1">Revised</Link>
          </TabsTrigger>
          <TabsTrigger value="trash" asChild>
            <Link href="/admin/quotations?tab=trash&page=1">Trash</Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="DRAFT" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="SENT" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="ACCEPTED" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="REJECTED" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="EXPIRED" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="REVISED" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={false}
          />
        </TabsContent>
        <TabsContent value="trash" className="mt-4">
          <QuotationsListClient
            initialQuotations={result.quotations || []}
            initialPagination={result.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            }}
            initialSearch={search}
            isTrash={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
