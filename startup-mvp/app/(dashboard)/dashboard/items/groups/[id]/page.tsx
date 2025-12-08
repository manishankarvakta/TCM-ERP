import { getGroupById } from "../_actions/group.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FiEdit, FiArrowLeft } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/formatters";

interface GroupDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GroupDetailsPage({ params }: GroupDetailsPageProps) {
  const { id } = await params;
  const result = await getGroupById(id);

  if (!result.success || !result.group) {
    notFound();
  }

  const group = result.group;
  const groupStatus = group.status || "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/items/groups">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Group Details</h1>
            <p className="text-sm text-muted-foreground">View group information</p>
          </div>
        </div>
        {groupStatus !== "trash" && (
          <Button asChild>
            <Link href={`/dashboard/items/groups/${group.id}/edit`}>
              <FiEdit className="mr-2 h-4 w-4" />
              Edit Group
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>Detailed information about the group</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-base font-medium">{group.name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Code</label>
              <p className="text-base">{group.code || "-"}</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-base">{group.description || "-"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <p className="text-base">{group.quantity || "-"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Number</label>
              <p className="text-base">{group.number || "-"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                {groupStatus === "trash" ? (
                  <Badge variant="destructive">Trash</Badge>
                ) : groupStatus === "inactive" ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Created By</label>
              <p className="text-base">{group.creator.name || group.creator.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <p className="text-base">{format(new Date(group.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-base">{format(new Date(group.updatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
          </div>

          {/* Items Table */}
          {group.items && group.items.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Items ({group.items.length})</h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SL</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sl}</TableCell>
                        <TableCell>{item.code || "-"}</TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

