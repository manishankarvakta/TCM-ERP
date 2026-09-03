import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAgreement, approveAgreement, recordClientAcceptance, markAgreementSigned, activateAgreement } from "@/app/actions/crm/agreement.action";
import { createServiceSaleFromAgreement } from "@/app/actions/crm/service-sale.action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  FileText,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileSignature,
  CreditCard,
  Briefcase,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AgreementDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAgreement(id);

  if (!result.success || !result.agreement) {
    notFound();
  }

  const { agreement } = result;

  const isLocked =
    agreement.status === "SIGNED" || agreement.status === "ACTIVE" || agreement.status === "TERMINATED";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/crm/agreements" className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Agreements
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">{agreement.agreementNumber}</span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{agreement.title}</h1>
            <Badge className="bg-indigo-600 text-white font-medium">{agreement.status}</Badge>
            {isLocked && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Immutable / Signed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
            <span className="font-mono font-semibold text-indigo-600">{agreement.agreementNumber}</span>
            <span>•</span>
            <span>Version {agreement.version}</span>
            <span>•</span>
            <span>Type: {agreement.agreementType}</span>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {agreement.status === "DRAFT" && (
            <form action={async () => {
              "use server";
              await approveAgreement(agreement.id);
            }}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approve Internally
              </Button>
            </form>
          )}

          {agreement.status === "READY_FOR_CLIENT" && (
            <form action={async () => {
              "use server";
              await recordClientAcceptance({
                id: agreement.id,
                acceptedByName: agreement.Client?.name || "Client Representative",
                acceptanceMethod: "SIGNED_DOCUMENT",
              });
            }}>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2">
                <FileSignature className="h-4 w-4" />
                Record Client Acceptance
              </Button>
            </form>
          )}

          {(agreement.status === "ACCEPTED" || agreement.status === "READY_FOR_CLIENT") && (
            <form action={async () => {
              "use server";
              await markAgreementSigned(agreement.id);
            }}>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                <FileSignature className="h-4 w-4" />
                Mark Signed
              </Button>
            </form>
          )}

          {(agreement.status === "SIGNED" || agreement.status === "ACCEPTED") && (
            <form action={async () => {
              "use server";
              await activateAgreement(agreement.id);
            }}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2">
                <ShieldCheck className="h-4 w-4" />
                Activate Agreement
              </Button>
            </form>
          )}

          {agreement.status === "ACTIVE" && (
            <form action={async () => {
              "use server";
              const res = await createServiceSaleFromAgreement(agreement.id);
              if (res.success && res.serviceSaleId) {
                redirect(`/dashboard/crm/service-sales/${res.serviceSaleId}`);
              }
            }}>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
                <ShoppingBag className="h-4 w-4" />
                Create Service Sale Order
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="scope" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-900 p-1">
              <TabsTrigger value="scope">Commercial Scope</TabsTrigger>
              <TabsTrigger value="terms">Terms & Clauses</TabsTrigger>
              <TabsTrigger value="payment">Payment Schedule</TabsTrigger>
            </TabsList>

            {/* Scope Tab */}
            <TabsContent value="scope" className="mt-4 space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Agreed Commercial Scope</CardTitle>
                  <CardDescription>
                    Summary of work, deliverables, and service commitments snapshot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Subject / Scope Overview</div>
                    <p className="whitespace-pre-wrap">{agreement.scopeSummary || "No explicit scope summary attached."}</p>
                  </div>

                  {agreement.Sections.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Contractual Sections ({agreement.Sections.length})</div>
                      {agreement.Sections.map((sec) => (
                        <div key={sec.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-md">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{sec.title}</div>
                          {sec.content && <p className="text-xs text-slate-600 mt-1">{sec.content}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Terms Tab */}
            <TabsContent value="terms" className="mt-4 space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Contractual Terms & Obligations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Client Responsibilities</div>
                      <p className="text-xs text-slate-600">{agreement.clientResponsibilities || "Standard client cooperation terms apply."}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Company Responsibilities</div>
                      <p className="text-xs text-slate-600">{agreement.companyResponsibilities || "Standard company delivery SLAs apply."}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Payment & Delivery Terms</div>
                    <p className="text-xs text-slate-600">{agreement.paymentTerms || "As per agreed quotation terms."}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Schedule Tab */}
            <TabsContent value="payment" className="mt-4 space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Agreed Payment Schedule</CardTitle>
                  <CardDescription>
                    High-level commercial payment milestone breakdown.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agreement.PaymentSchedules.length === 0 ? (
                    <div className="text-sm text-slate-500 py-6 text-center">
                      No payment milestones structured yet.
                    </div>
                  ) : (
                    agreement.PaymentSchedules.map((ps) => (
                      <div key={ps.id} className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{ps.label}</div>
                          {ps.dueTriggerDescription && <div className="text-xs text-slate-500">{ps.dueTriggerDescription}</div>}
                        </div>
                        <div className="text-right font-semibold text-slate-900">
                          {agreement.currency} {Number(ps.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary & Upstream Traceability */}
        <div className="space-y-6">
          {/* Commercial Summary Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-900">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Commercial Contract Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="flex justify-between items-baseline border-b border-slate-100 pb-3">
                <span className="text-slate-500">Contract Value:</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {agreement.currency} {Number(agreement.contractValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Client:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{agreement.Client?.name || agreement.Client?.company}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Quotation Ref:</span>
                  <Link href={`/dashboard/crm/quotations/${agreement.Quotation?.id}`} className="font-mono text-indigo-600 underline">
                    {agreement.Quotation?.quotationNumber}
                  </Link>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Prepared By:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{agreement.PreparedBy?.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upstream Pipeline Traceability */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" /> Upstream Traceability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border">
                <div className="text-slate-500">Opportunity</div>
                <div className="font-medium text-slate-900">{agreement.Opportunity?.title || "Direct Commercial Offer"}</div>
              </div>
              {agreement.Requirement && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border">
                  <div className="text-slate-500">Requirement Package</div>
                  <div className="font-medium text-slate-900">{agreement.Requirement.title}</div>
                </div>
              )}
              {agreement.Estimation && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border">
                  <div className="text-slate-500">Internal Estimation Ref</div>
                  <div className="font-mono text-slate-900">{agreement.Estimation.estimationNumber} (v{agreement.Estimation.version})</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
