import React from "react";
import Link from "next/link";
import { getEstimation, addEstimationSection, addEstimationItem, approveEstimation, markReadyForQuotation, deleteEstimation } from "@/app/actions/crm/estimation.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calculator, CheckCircle2, ShieldAlert, FileText, Layers, Trash2, Send } from "lucide-react";

interface EstimationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EstimationDetailPage({ params }: EstimationDetailPageProps) {
  const { id } = await params;
  const res = await getEstimation(id);

  if (!res.success || !res.estimation) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-lg text-destructive">Estimation Not Found</h3>
              <p className="text-sm text-muted-foreground">{res.error || "Estimation package does not exist."}</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/crm/estimations">Back to Estimations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const estimation = res.estimation;
  const isReadOnly = estimation.status === "APPROVED" || estimation.status === "READY_FOR_QUOTATION" || estimation.isTrash;

  // Server action handlers
  async function handleAddSection(formData: FormData) {
    "use server";
    const estId = formData.get("estimationId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    await addEstimationSection({
      estimationId: estId,
      title,
      description,
    });
  }

  async function handleAddItem(formData: FormData) {
    "use server";
    const estId = formData.get("estimationId") as string;
    const sectionId = formData.get("sectionId") as string || undefined;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const quantity = parseFloat(formData.get("quantity") as string || "1");
    const unit = formData.get("unit") as string || "Hours";
    const internalRate = parseFloat(formData.get("internalRate") as string || "0");
    const commercialRate = formData.get("commercialRate") ? parseFloat(formData.get("commercialRate") as string) : undefined;
    const notes = formData.get("notes") as string;

    await addEstimationItem({
      estimationId: estId,
      sectionId,
      title,
      description,
      quantity,
      unit,
      internalRate,
      commercialRate,
      notes,
    });
  }

  async function handleApprove() {
    "use server";
    await approveEstimation(estimation.id);
  }

  async function handleReadyForQuotation() {
    "use server";
    await markReadyForQuotation(estimation.id);
  }

  async function handleDelete() {
    "use server";
    await deleteEstimation(estimation.id);
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-900">Draft</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700">In Progress</Badge>;
      case "READY_FOR_REVIEW":
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700">Review</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
      case "READY_FOR_QUOTATION":
        return <Badge className="bg-indigo-600 text-white">Ready for Quotation</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-2">
            <Link href="/dashboard/crm/estimations">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Directory
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{estimation.estimationNumber}</h1>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">v{estimation.version}</span>
                {getStatusBadge(estimation.status)}
              </div>
              <p className="text-muted-foreground text-sm mt-1">{estimation.title}</p>
            </div>
          </div>
        </div>

        {/* Action Header Controls */}
        <div className="flex items-center gap-3">
          {estimation.status === "DRAFT" || estimation.status === "IN_PROGRESS" || estimation.status === "READY_FOR_REVIEW" ? (
            <form action={handleApprove}>
              <Button type="submit" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Estimate
              </Button>
            </form>
          ) : null}

          {estimation.status === "APPROVED" || estimation.status === "READY_FOR_REVIEW" ? (
            <form action={handleReadyForQuotation}>
              <Button type="submit" variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Send className="h-4 w-4 mr-2" /> Mark Ready for Quotation
              </Button>
            </form>
          ) : null}

          {!isReadOnly && (
            <form action={handleDelete}>
              <Button type="submit" variant="ghost" className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Base Internal Cost</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {estimation.baseInternalCost !== undefined ? (
                `${estimation.currency} ${Number(estimation.baseInternalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
              ) : (
                <span className="text-xs text-muted-foreground font-normal italic">Confidential (Restricted)</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Contingency Buffer ({Number(estimation.contingencyPercent || 0)}%)</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {estimation.contingencyAmount !== undefined ? (
                `${estimation.currency} ${Number(estimation.contingencyAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
              ) : (
                <span className="text-xs text-muted-foreground font-normal italic">Confidential (Restricted)</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="py-3">
            <CardDescription>Total Internal Cost</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {estimation.totalInternalCost !== undefined ? (
                `${estimation.currency} ${Number(estimation.totalInternalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
              ) : (
                <span className="text-xs text-muted-foreground font-normal italic">Confidential (Restricted)</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20">
          <CardHeader className="py-3">
            <CardDescription className="text-indigo-900 dark:text-indigo-300 font-medium">Rec. Selling Price</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {estimation.currency} {Number(estimation.recommendedPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="breakdown" className="space-y-6">
        <TabsList>
          <TabsTrigger value="breakdown">
            <Layers className="h-4 w-4 mr-2" /> Work Breakdown Builder
          </TabsTrigger>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" /> Context & Assumptions
          </TabsTrigger>
        </TabsList>

        {/* Work Breakdown Builder Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          {/* Add Section / Item Controls if editable */}
          {!isReadOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <form action={handleAddSection}>
                  <input type="hidden" name="estimationId" value={estimation.id} />
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Add Section / Module</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input name="title" required placeholder="Section Title (e.g. Backend Architecture)" />
                    <Input name="description" placeholder="Optional description..." />
                    <Button type="submit" size="sm" variant="secondary" className="w-full">
                      Add Section
                    </Button>
                  </CardContent>
                </form>
              </Card>

              <Card>
                <form action={handleAddItem}>
                  <input type="hidden" name="estimationId" value={estimation.id} />
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">Add Estimation Item</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="title" required placeholder="Item Title *" />
                      <select
                        name="sectionId"
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">No Section (Root)</option>
                        {estimation.Sections?.map((sec) => (
                          <option key={sec.id} value={sec.id}>{sec.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input name="quantity" type="number" step="0.1" defaultValue="1" placeholder="Qty / Hours" />
                      <Input name="unit" defaultValue="Hours" placeholder="Unit" />
                      <Input name="internalRate" type="number" step="0.01" placeholder="Internal Rate" />
                    </div>
                    <Button type="submit" size="sm" className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                      Add Work Item
                    </Button>
                  </CardContent>
                </form>
              </Card>
            </div>
          )}

          {/* Render Sections & Items */}
          <div className="space-y-4">
            {estimation.Sections?.length === 0 && estimation.Items?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No sections or estimation line items created yet. Add work items to build commercial cost breakdown.
                </CardContent>
              </Card>
            ) : (
              estimation.Sections?.map((section) => (
                <Card key={section.id}>
                  <CardHeader className="py-3 bg-muted/30 border-b">
                    <CardTitle className="text-md font-semibold">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Work Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          {estimation.baseInternalCost !== undefined && <TableHead className="text-right">Int. Rate</TableHead>}
                          {estimation.baseInternalCost !== undefined && <TableHead className="text-right">Int. Cost</TableHead>}
                          <TableHead className="text-right">Rec. Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.Items?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                              No line items in this section.
                            </TableCell>
                          </TableRow>
                        ) : (
                          section.Items?.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.title}</TableCell>
                              <TableCell>{Number(item.quantity)}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              {estimation.baseInternalCost !== undefined && (
                                <TableCell className="text-right font-mono text-xs">
                                  {Number(item.internalRate).toFixed(2)}
                                </TableCell>
                              )}
                              {estimation.baseInternalCost !== undefined && (
                                <TableCell className="text-right font-mono text-xs font-semibold">
                                  {Number(item.internalCost).toFixed(2)}
                                </TableCell>
                              )}
                              <TableCell className="text-right font-semibold text-indigo-600">
                                {Number(item.recommendedPrice).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Root Items without Section */}
            {estimation.Items && estimation.Items.length > 0 && (
              <Card>
                <CardHeader className="py-3 bg-muted/20 border-b">
                  <CardTitle className="text-md font-semibold">General Work Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Work Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        {estimation.baseInternalCost !== undefined && <TableHead className="text-right">Int. Rate</TableHead>}
                        {estimation.baseInternalCost !== undefined && <TableHead className="text-right">Int. Cost</TableHead>}
                        <TableHead className="text-right">Rec. Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estimation.Items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{Number(item.quantity)}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          {estimation.baseInternalCost !== undefined && (
                            <TableCell className="text-right font-mono text-xs">
                              {Number(item.internalRate).toFixed(2)}
                            </TableCell>
                          )}
                          {estimation.baseInternalCost !== undefined && (
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {Number(item.internalCost).toFixed(2)}
                            </TableCell>
                          )}
                          <TableCell className="text-right font-semibold text-indigo-600">
                            {Number(item.recommendedPrice).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commercial Overview & Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Requirement Reference</Label>
                <div className="font-semibold text-sm">
                  <Link href={`/dashboard/crm/requirements/${estimation.Requirement?.id}`} className="text-blue-600 hover:underline">
                    {estimation.Requirement?.requirementNumber} - {estimation.Requirement?.title}
                  </Link>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Client</Label>
                <div className="font-semibold text-sm">{estimation.Client?.company || estimation.Client?.name}</div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Internal Assumptions</Label>
                <p className="text-sm bg-muted/40 p-3 rounded-md whitespace-pre-wrap mt-1">
                  {estimation.assumptions || "No assumptions specified."}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Technical Risk Buffer Notes</Label>
                <p className="text-sm bg-muted/40 p-3 rounded-md whitespace-pre-wrap mt-1">
                  {estimation.riskNotes || "No risk notes specified."}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Reviewer / Management Notes</Label>
                <p className="text-sm bg-muted/40 p-3 rounded-md whitespace-pre-wrap mt-1">
                  {estimation.notes || "No notes specified."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
