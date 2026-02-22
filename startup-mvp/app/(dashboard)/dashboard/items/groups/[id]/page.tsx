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
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/items/groups">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        {groupStatus !== "trash" && (
          <Button asChild>
            <Link href={`/dashboard/items/groups/${group.id}/edit`}>
              <FiEdit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{group.name}</CardTitle>
                <Badge variant="outline">{group.type}</Badge>
              </div>
              <CardDescription className="mt-1">
                {group.code && <span className="mr-2 font-mono text-xs">[{group.code}]</span>}
                {group.description || "No description"}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary mb-1">
                {formatCurrency(group.price)}
              </div>
              {groupStatus === "trash" ? (
                <Badge variant="destructive">Trash</Badge>
              ) : groupStatus === "inactive" ? (
                <Badge variant="secondary">Inactive</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-y">
            <div>
              <span className="text-sm text-muted-foreground block">Created By</span>
              <span className="font-medium">{(group as any).creator?.name || (group as any).creator?.email || "Unknown"}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground block">Created At</span>
              <span className="font-medium">{format(new Date(group.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground block">Last Updated</span>
              <span className="font-medium">{format(new Date(group.updatedAt), "MMM d, yyyy")}</span>
            </div>
          </div>

          {/* Items Table */}
          {group.items && group.items.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Included Items ({group.items.length})</h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">SL</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sl}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.code}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity} {item.unit}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {(!group.items || group.items.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No items included in this group.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
