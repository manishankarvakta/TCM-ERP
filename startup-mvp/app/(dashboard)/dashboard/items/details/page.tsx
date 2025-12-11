import { getItemById } from "../_actions/item.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiEdit, FiArrowLeft, FiImage } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { Decimal } from "@prisma/client/runtime/library";

interface ItemDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function ItemDetailsPage({ searchParams }: ItemDetailsPageProps) {
  const params = await searchParams;
  const id = params.id;

  if (!id) {
    notFound();
  }

  const result = await getItemById(id);

  if (!result.success || !result.item) {
    notFound();
  }

  const item = result.item;

  const formatPrice = (price: Decimal | number) => {
    const numPrice = typeof price === 'number' ? price : Number(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numPrice);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/items">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Item Details</h1>
            <p className="text-sm text-muted-foreground">View item information</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/items/${item.id}`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Item
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Information</CardTitle>
          <CardDescription>Detailed information about the item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Side - Details (3 columns) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Code</label>
                  <p className="text-base font-medium">{item.code}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-base">{item.description}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Unit</label>
                  <p className="text-base">
                    {item.unit.symbol} - {item.unit.details}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
                  <p className="text-base font-medium">{formatPrice(item.unitPrice)}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                  <p className="text-base font-medium">{formatPrice(item.costPrice || 0)}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Categories</label>
                  {item.categories && item.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.categories.map((itemCategory) => (
                        <Badge key={itemCategory.id} variant="secondary">
                          {itemCategory.category.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base">-</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div>
                    {item.status === "trash" ? (
                      <Badge variant="destructive">Trash</Badge>
                    ) : item.status === "inactive" ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-base">{format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-base">{format(new Date(item.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Right Side - Image (1 column) */}
            <div className="lg:col-span-1">
              {item.image ? (
                <div className="sticky top-6">
                  <div className="space-y-2">
                    {/* <label className="text-sm font-medium text-muted-foreground">Item Photo</label> */}
                    <div className="relative w-full aspect-square rounded-lg border overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.description}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sticky top-6">
                  <div className="space-y-2">
                    <div className="relative w-full aspect-square rounded-lg border bg-muted flex flex-col items-center justify-center gap-2">
                      <FiImage className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No photo</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

