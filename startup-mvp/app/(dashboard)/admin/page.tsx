"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, GripVertical } from "lucide-react";
import { FiDollarSign, FiUsers, FiTrendingUp, FiActivity } from "react-icons/fi";

const stats = [
  {
    title: "Total Revenue",
    value: "$1,250.00",
    change: "+12.5%",
    trend: "up",
    description: "Trending up this month",
    icon: FiDollarSign,
  },
  {
    title: "New Customers",
    value: "1,234",
    change: "-20%",
    trend: "down",
    description: "Down 20% this period",
    subDescription: "Acquisition needs attention",
    icon: FiUsers,
  },
  {
    title: "Active Accounts",
    value: "45,678",
    change: "+12.5%",
    trend: "up",
    description: "Strong user retention",
    subDescription: "Engagement exceed targets",
    icon: FiActivity,
  },
  {
    title: "Growth Rate",
    value: "4.5%",
    change: "+4.5%",
    trend: "up",
    description: "Steady performance increase",
    subDescription: "Meets growth projections",
    icon: FiTrendingUp,
  },
];

const tableData = [
  {
    id: 1,
    header: "Cover page",
    sectionType: "Cover page",
    status: "In Process",
    target: "Target",
    limit: "Limit",
    reviewer: "Eddie Lake",
  },
  {
    id: 2,
    header: "Table of contents",
    sectionType: "Table of contents",
    status: "Done",
    target: "Target",
    limit: "Limit",
    reviewer: "Eddie Lake",
  },
  {
    id: 3,
    header: "Executive summary",
    sectionType: "Narrative",
    status: "Done",
    target: "Target",
    limit: "Limit",
    reviewer: "Eddie Lake",
  },
  {
    id: 4,
    header: "Technical approach",
    sectionType: "Narrative",
    status: "Done",
    target: "Target",
    limit: "Limit",
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 5,
    header: "Design",
    sectionType: "Narrative",
    status: "In Process",
    target: "Target",
    limit: "Limit",
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 6,
    header: "Capabilities",
    sectionType: "Narrative",
    status: "In Process",
    target: "Target",
    limit: "Limit",
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 7,
    header: "Integration with existing systems",
    sectionType: "Narrative",
    status: "In Process",
    target: "Target",
    limit: "Limit",
    reviewer: "Jamik Tashpulatov",
  },
  {
    id: 8,
    header: "Innovation and Advantages",
    sectionType: "Narrative",
    status: "Done",
    target: "Target",
    limit: "Limit",
    reviewer: "Reviewer",
  },
  {
    id: 9,
    header: "Overview of EMR's Innovative Solutions",
    sectionType: "Technical content",
    status: "Done",
    target: "Target",
    limit: "Limit",
    reviewer: "Reviewer",
  },
  {
    id: 10,
    header: "Advanced Algorithms and Machine Learning",
    sectionType: "Narrative",
    status: "Done",
    target: "Target",
    limit: "Limit",
    reviewer: "Reviewer",
  },
];

const getStatusBadge = (status: string) => {
  if (status === "Done") {
    return <Badge variant="default" className="text-xs font-normal">Done</Badge>;
  }
  return <Badge variant="outline" className="text-xs font-normal">In Process</Badge>;
};

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button>Quick Create</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span
                    className={`flex items-center gap-0.5 font-medium ${
                      stat.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">{stat.description}</span>
                </p>
                {stat.subDescription && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {stat.subDescription}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Visitors for the last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Chart visualization will be displayed here
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Total Visitors</CardTitle>
              <div className="flex items-center gap-2">
                <Select defaultValue="3months">
                  <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">Last 3 months</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8">
                  View
                </Button>
              </div>
            </div>
            <CardDescription className="text-sm">Total for the last 3 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              Chart will be displayed here
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <CardDescription className="text-sm">Outline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium leading-none">Past Performance</span>
                  <Badge variant="outline" className="font-normal">3</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium leading-none">Key Personnel</span>
                  <Badge variant="outline" className="font-normal">2</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium leading-none">Focus Documents</span>
                  <Badge variant="outline" className="font-normal">1</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Documents</CardTitle>
              <CardDescription className="text-sm mt-1">Customize Columns</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8">
                Columns
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                Add Section
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] h-10"></TableHead>
                  <TableHead className="h-10 text-sm font-medium">Header</TableHead>
                  <TableHead className="h-10 text-sm font-medium">Section Type</TableHead>
                  <TableHead className="h-10 text-sm font-medium">Status</TableHead>
                  <TableHead className="h-10 text-sm font-medium">Target</TableHead>
                  <TableHead className="h-10 text-sm font-medium">Limit</TableHead>
                  <TableHead className="h-10 text-sm font-medium">Reviewer</TableHead>
                  <TableHead className="w-[50px] h-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id} className="h-12">
                    <TableCell className="py-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-move hover:text-muted-foreground transition-colors" />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{row.header}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.sectionType}</TableCell>
                    <TableCell>
                      {getStatusBadge(row.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.target}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.limit}</TableCell>
                    <TableCell>
                      {row.reviewer === "Reviewer" ? (
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Assign reviewer
                        </Button>
                      ) : (
                        <span className="text-sm">{row.reviewer}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="text-sm">Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-sm">Delete</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-sm">View details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              0 of {tableData.length} row(s) selected.
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select defaultValue="10">
                <SelectTrigger className="w-[70px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Go to first page
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Go to previous page
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Go to next page
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Go to last page
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
