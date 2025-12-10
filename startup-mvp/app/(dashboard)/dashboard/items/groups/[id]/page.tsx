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
              <CardTitle>{group.code || "Untitled Group"}</CardTitle>
              <CardDescription>
                {group.description || "No description"}
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-6">

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
                      <TableHead className="w-12">SL</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      {(group.items.some(item => item.height || item.width || item.depth)) && (
                        <>
                          <TableHead className="w-16">H</TableHead>
                          <TableHead className="w-16">W</TableHead>
                          <TableHead className="w-16">D</TableHead>
                        </>
                      )}
                      <TableHead>Unit</TableHead>
                      {(group.items.some(item => item.baseUnit && item.baseUnitPrice)) && (
                        <>
                          <TableHead>Base Unit</TableHead>
                          <TableHead>Base Price</TableHead>
                        </>
                      )}
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sl}</TableCell>
                        <TableCell className="font-medium">{item.code || "-"}</TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        {(group.items.some(i => i.height || i.width || i.depth)) && (
                          <>
                            <TableCell>{item.height ? item.height.toFixed(2) : "-"}</TableCell>
                            <TableCell>{item.width ? item.width.toFixed(2) : "-"}</TableCell>
                            <TableCell>{item.depth ? item.depth.toFixed(2) : "-"}</TableCell>
                          </>
                        )}
                        <TableCell>{item.unit || "-"}</TableCell>
                        {(group.items.some(i => i.baseUnit && i.baseUnitPrice)) && (
                          <>
                            <TableCell>{item.baseUnit || "-"}</TableCell>
                            <TableCell>
                              {item.baseUnitPrice ? formatCurrency(item.baseUnitPrice) : "-"}
                            </TableCell>
                          </>
                        )}
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
        </CardContent>
      </Card>
    </div>
  );
}

