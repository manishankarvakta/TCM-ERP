import React from "react";
import { getBrandById } from "../_actions/brand.action";
import PageGuard from "@/components/permissions/page-guard";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiEdit, FiArrowLeft } from "react-icons/fi";

interface BrandDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BrandDetailsPage({ params }: BrandDetailsPageProps) {
  const { id } = await params;
  const result = await getBrandById(id);

  if (!result.success || !result.brand) {
    notFound();
  }

  const { brand } = result;

  return (
    <PageGuard permissionKey="master.brands" requiredOperation="view">
      <div className="space-y-6">
        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard/master/brands">
                <FiArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Brand Details</h1>
              <p className="text-sm text-muted-foreground">
                Detailed information about the brand
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href={`/dashboard/master/brands/${brand.id}/edit`}>
              <FiEdit className="mr-2 h-4 w-4" />
              Edit Brand
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{brand.name}</CardTitle>
                <CardDescription>Created on {format(new Date(brand.createdAt), "PPP")}</CardDescription>
              </div>
              <Badge variant={brand.status === "active" ? "default" : "secondary"}>
                {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {brand.image && (
                <div className="w-full md:w-48 h-48 rounded-lg border overflow-hidden shrink-0 bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brand.image} alt={brand.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <p className="text-base">{brand.description || "No description provided."}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                  <p className="text-base">{format(new Date(brand.updatedAt), "PPP p")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
