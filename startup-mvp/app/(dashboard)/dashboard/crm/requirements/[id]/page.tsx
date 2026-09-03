import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getRequirement,
  addRequirementSection,
  addRequirementItem,
  removeRequirementItem,
  addRequirementClarification,
  answerRequirementClarification,
  markReadyForEstimation,
} from "@/app/actions/crm/requirement.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementItemType, RequirementPriority } from "@prisma/client";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  FileText,
  Building2,
  Clock,
  User,
  AlertCircle,
  Calculator,
} from "lucide-react";

interface RequirementDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RequirementDetailPage({ params }: RequirementDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const res = await getRequirement(id);

  if (!res.success || !res.requirement) {
    return (
      <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Requirement Package Not Found</h2>
        <p className="text-sm text-muted-foreground">{res.error || "Requested requirement does not exist or access was denied."}</p>
        <Link href="/dashboard/crm/requirements">
          <Button variant="outline">Back to Requirements</Button>
        </Link>
      </div>
    );
  }

  const req = res.requirement;

  // Server Actions for Form Submission inside components
  async function handleAddSection(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    if (!title) return;
    await addRequirementSection({ requirementId: req.id, title, description });
  }

  async function handleAddItem(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const sectionId = formData.get("sectionId") as string;
    const type = (formData.get("type") as RequirementItemType) || RequirementItemType.FEATURE;
    const priority = (formData.get("priority") as RequirementPriority) || RequirementPriority.MEDIUM;
    const acceptanceCriteria = formData.get("acceptanceCriteria") as string;
    if (!title) return;

    await addRequirementItem({
      requirementId: req.id,
      sectionId: sectionId || undefined,
      title,
      description,
      type,
      priority,
      acceptanceCriteria,
    });
  }

  async function handleRemoveItem(formData: FormData) {
    "use server";
    const itemId = formData.get("itemId") as string;
    if (itemId) await removeRequirementItem(itemId);
  }

  async function handleAddClarification(formData: FormData) {
    "use server";
    const question = formData.get("question") as string;
    if (question) await addRequirementClarification({ requirementId: req.id, question });
  }

  async function handleAnswerClarification(formData: FormData) {
    "use server";
    const clarificationId = formData.get("clarificationId") as string;
    const answer = formData.get("answer") as string;
    if (clarificationId && answer) {
      await answerRequirementClarification({ clarificationId, answer, status: "ANSWERED" });
    }
  }

  async function handleMarkReady() {
    "use server";
    await markReadyForEstimation(req.id);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/crm/requirements">
            <Button variant="outline" size="sm" className="h-9 px-3">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{req.requirementNumber}</span>
              <Badge variant="outline" className="text-xs font-semibold">{req.priority}</Badge>
              {req.status === "READY_FOR_ESTIMATION" ? (
                <Badge className="bg-emerald-600 text-white font-semibold">READY FOR ESTIMATION</Badge>
              ) : (
                <Badge variant="secondary">{req.status}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-0.5">{req.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {req.status === "READY_FOR_ESTIMATION" && (
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow">
              <Link href={`/dashboard/crm/estimations/new?requirementId=${req.id}`}>
                <Calculator className="h-4 w-4" /> Create Internal Estimation
              </Link>
            </Button>
          )}

          {req.status !== "READY_FOR_ESTIMATION" && (
            <form action={handleMarkReady}>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow">
                <CheckCircle2 className="h-4 w-4" /> Mark Ready for Estimation
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Overview Metadata Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 shadow-sm flex items-center gap-3">
          <Building2 className="h-8 w-8 text-indigo-500 p-1.5 bg-indigo-50 rounded-lg dark:bg-indigo-950" />
          <div>
            <div className="text-xs text-muted-foreground font-medium">Client</div>
            <div className="text-sm font-semibold">{req.Client?.company || req.Client?.name}</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-500 p-1.5 bg-blue-50 rounded-lg dark:bg-blue-950" />
          <div>
            <div className="text-xs text-muted-foreground font-medium">Opportunity</div>
            <div className="text-sm font-semibold">{req.Opportunity?.title}</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-3">
          <User className="h-8 w-8 text-emerald-500 p-1.5 bg-emerald-50 rounded-lg dark:bg-emerald-950" />
          <div>
            <div className="text-xs text-muted-foreground font-medium">Owner / Prepared By</div>
            <div className="text-sm font-semibold">{req.Owner?.name}</div>
          </div>
        </Card>

        <Card className="p-4 shadow-sm flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500 p-1.5 bg-amber-50 rounded-lg dark:bg-amber-950" />
          <div>
            <div className="text-xs text-muted-foreground font-medium">Budget Expectation</div>
            <div className="text-sm font-semibold">
              {req.budgetExpectation ? `${req.currency} ৳${Number(req.budgetExpectation).toLocaleString()}` : "Not specified"}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="scope" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border">
          <TabsTrigger value="scope" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" /> Scope Builder ({req.Sections.reduce((acc, s) => acc + s.Items.length, 0) + req.Items.length} items)
          </TabsTrigger>
          <TabsTrigger value="clarifications" className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" /> Clarifications & Q&A ({req.Clarifications.length})
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Executive Overview
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Scope Builder */}
        <TabsContent value="scope" className="space-y-6">
          {/* Add Section / Item Quick Forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-600" /> Add Requirement Section
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <form action={handleAddSection} className="flex gap-2">
                  <Input name="title" required placeholder="Section Title (e.g. User Authentication)" className="h-9 text-sm" />
                  <Button type="submit" size="sm" className="bg-indigo-600 text-white">Add</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-emerald-600" /> Quick Add Item
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <form action={handleAddItem} className="space-y-2">
                  <div className="flex gap-2">
                    <Input name="title" required placeholder="Requirement Title (e.g. OAuth2 SSO Login)" className="h-9 text-sm" />
                    <select name="sectionId" className="h-9 px-2 border rounded text-xs bg-background">
                      <option value="">(No Section)</option>
                      {req.Sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <select name="type" defaultValue="FEATURE" className="h-8 px-2 border rounded text-xs bg-background">
                      <option value="FEATURE">FEATURE</option>
                      <option value="INTEGRATION">INTEGRATION</option>
                      <option value="REPORT">REPORT</option>
                      <option value="MOBILE">MOBILE</option>
                      <option value="WEB">WEB</option>
                      <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    </select>
                    <select name="priority" defaultValue="MEDIUM" className="h-8 px-2 border rounded text-xs bg-background">
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                    <Button type="submit" size="sm" className="bg-emerald-600 text-white ml-auto h-8 px-3">Add Item</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Section & Item Hierarchy Display */}
          {req.Sections.map((sec) => (
            <Card key={sec.id} className="shadow">
              <CardHeader className="py-3 bg-muted/30 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-indigo-950 dark:text-indigo-200">{sec.title}</CardTitle>
                  {sec.description && <CardDescription className="text-xs">{sec.description}</CardDescription>}
                </div>
                <Badge variant="outline" className="text-xs font-mono">{sec.Items.length} Items</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {sec.Items.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic py-2">No items added to this section yet.</div>
                ) : (
                  sec.Items.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg bg-card hover:border-indigo-300 transition-colors space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{item.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">{item.priority}</Badge>
                        </div>
                        <form action={handleRemoveItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      {item.acceptanceCriteria && (
                        <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Acceptance Criteria: </span>
                          <span className="text-slate-600 dark:text-slate-400">{item.acceptanceCriteria}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}

          {/* Unsectioned Items */}
          {req.Items.length > 0 && (
            <Card className="shadow border-dashed">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-base font-bold">Uncategorized Items ({req.Items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {req.Items.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{item.title}</span>
                        <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
                      </div>
                      <form action={handleRemoveItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <Button type="submit" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Clarifications */}
        <TabsContent value="clarifications" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-500" /> Ask Discovery Question / Clarification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleAddClarification} className="flex gap-2">
                <Input name="question" required placeholder="Enter discovery question for client or technical team..." className="h-10 text-sm" />
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">Post Question</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {req.Clarifications.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No clarifications recorded for this requirement package.</Card>
            ) : (
              req.Clarifications.map((clar) => (
                <Card key={clar.id} className="shadow-sm border">
                  <CardHeader className="py-3 bg-muted/20 border-b flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={clar.status === "OPEN" ? "outline" : "default"} className={clar.status === "OPEN" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-emerald-600"}>
                        {clar.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Asked by {clar.AskedBy?.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{new Date(clar.createdAt).toLocaleDateString()}</span>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="font-semibold text-sm text-foreground">Q: {clar.question}</div>
                    {clar.answer ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 text-xs">
                        <div className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Answer (by {clar.AnsweredBy?.name || "Team"}):</div>
                        <div className="text-emerald-900 dark:text-emerald-200">{clar.answer}</div>
                      </div>
                    ) : (
                      <form action={handleAnswerClarification} className="space-y-2 pt-2">
                        <input type="hidden" name="clarificationId" value={clar.id} />
                        <Textarea name="answer" required rows={2} placeholder="Provide clarification answer..." className="text-xs" />
                        <Button type="submit" size="sm" className="bg-emerald-600 text-white text-xs">Submit Answer</Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Executive Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow">
            <CardHeader>
              <CardTitle className="text-base font-bold">Executive Discovery Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-muted-foreground text-xs uppercase mb-1">Executive Summary</h4>
                <p className="p-3 bg-muted/40 rounded-lg">{req.summary || "No executive summary recorded."}</p>
              </div>

              <div>
                <h4 className="font-semibold text-muted-foreground text-xs uppercase mb-1">Business Objective & Outcomes</h4>
                <p className="p-3 bg-muted/40 rounded-lg">{req.businessObjective || "No business objective specified."}</p>
              </div>

              <div>
                <h4 className="font-semibold text-muted-foreground text-xs uppercase mb-1">Scope Overview</h4>
                <p className="p-3 bg-muted/40 rounded-lg">{req.scopeOverview || "No high-level scope overview specified."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
