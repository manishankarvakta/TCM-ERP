import { getChartOfAccountById } from "../_actions/chart-of-accounts.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { FiArrowLeft, FiEdit, FiExternalLink } from "react-icons/fi";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import PageGuard from "@/components/permissions/page-guard";
import ProtectedAction from "@/components/permissions/protected-action";

interface ChartOfAccountDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "inactive":
      return "bg-yellow-100 text-yellow-800";
    case "trash":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getAccountTypeColor(type: string) {
  switch (type) {
    case "ASSET":
      return "bg-blue-100 text-blue-800";
    case "LIABILITY":
      return "bg-red-100 text-red-800";
    case "EQUITY":
      return "bg-green-100 text-green-800";
    case "REVENUE":
      return "bg-purple-100 text-purple-800";
    case "EXPENSE":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function ChartOfAccountDetailPage({ params }: ChartOfAccountDetailPageProps) {
  const { id } = await params;
  const result = await getChartOfAccountById(id);

  if (!result.success || !result.account) {
    notFound();
  }

  const account = result.account;

  return (
    <PageGuard permissionKey="accounts.chart-of-accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/accounts/chart-of-accounts">
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Back to Chart of Accounts
            </Link>
          </Button>
          <div className="flex gap-2">
            <ProtectedAction
              permissionKey="accounts.chart-of-accounts"
              action="edit"
              href={`/dashboard/accounts/chart-of-accounts/${account.id}/edit`}
            >
              <Button variant="outline" size="sm">
                <FiEdit className="mr-2 h-4 w-4" />
                Edit Account
              </Button>
            </ProtectedAction>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <span>{account.code}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{account.name}</span>
                </CardTitle>
                <CardDescription>Account Details</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={getAccountTypeColor(account.type)}>{account.type}</Badge>
                <Badge className={getStatusColor(account.status)}>{account.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Account Code</p>
                <p className="font-medium">{account.code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Type</p>
                <p className="font-medium">{account.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{account.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{format(new Date(account.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>
            {account.description && (
              <div className="mt-4">
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="mt-1">{account.description}</p>
              </div>
            )}
            {account.parent && (
              <div className="mt-4">
                <p className="text-muted-foreground text-sm">Parent Account</p>
                <div className="mt-1">
                  <Link
                    href={`/dashboard/accounts/chart-of-accounts/${account.parent.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    {account.parent.code} - {account.parent.name}
                    <FiExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
            <div className="mt-4">
              <p className="text-muted-foreground text-sm">Created By</p>
              <p className="mt-1 font-medium">{account.creator.name}</p>
              <p className="text-xs text-muted-foreground">{account.creator.email}</p>
            </div>
          </CardContent>
        </Card>

        {account.children && account.children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Child Accounts</CardTitle>
              <CardDescription>
                {account.children.length} child account{account.children.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {account.children.map((child: any) => (
                      <TableRow key={child.id}>
                        <TableCell className="font-medium">{child.code}</TableCell>
                        <TableCell>{child.name}</TableCell>
                        <TableCell>
                          <Badge className={getAccountTypeColor(child.type)} variant="outline">
                            {child.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(child.status)} variant="outline">
                            {child.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <ProtectedAction
                            permissionKey="accounts.chart-of-accounts"
                            action="view"
                            href={`/dashboard/accounts/chart-of-accounts/${child.id}`}
                            buttonProps={{
                              variant: "ghost",
                              size: "sm",
                              className: "h-8 w-8 p-0",
                              title: "View",
                            }}
                          >
                            <FiExternalLink className="h-4 w-4" />
                          </ProtectedAction>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common actions for this account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/accounts/ledgers?accountId=${account.id}`}>
                  <FiExternalLink className="mr-2 h-4 w-4" />
                  View Ledger
                </Link>
              </Button>
              <ProtectedAction
                permissionKey="accounts.chart-of-accounts"
                action="edit"
                href={`/dashboard/accounts/chart-of-accounts/${account.id}/edit`}
              >
                <Button variant="outline">
                  <FiEdit className="mr-2 h-4 w-4" />
                  Edit Account
                </Button>
              </ProtectedAction>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}

