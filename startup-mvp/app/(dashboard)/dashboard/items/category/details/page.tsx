import { getCategoryById } from "../_actions/category.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiEdit, FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";

interface CategoryDetailsPageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function CategoryDetailsPage({ searchParams }: CategoryDetailsPageProps) {
  const params = await searchParams;
  const id = params.id;

  if (!id) {
    notFound();
  }

  const result = await getCategoryById(id);

  if (!result.success || !result.category) {
    notFound();
  }

  const category = result.category;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/category">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Category Details</h1>
            <p className="text-sm text-muted-foreground">View category information</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/category/${category.id}`}>
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Category
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
          <CardDescription>Detailed information about the category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-base font-medium">{category.name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                {category.status === "trash" ? (
                  <Badge variant="destructive">Trash</Badge>
                ) : category.status === "inactive" ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-base">{category.description || "-"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="text-base">{format(new Date(category.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-base">{format(new Date(category.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

