
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClientById } from "../_actions/client.action";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeftIcon, MailIcon, PhoneIcon, BuildingIcon, Clock, Calendar, CheckSquare, FileText, Layout, Hash, Globe, Users, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileManager from "../../activities/_components/FileManager";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const { id } = await params;

  const canView = await checkPermission(session.user.id, "peoples.clients", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Clients.
          </div>
        </div>
      );
  }

  const clientResult = await getClientById(id);

  if (!clientResult.success || !clientResult.client) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {clientResult.error || "Client not found"}
        </div>
      </div>
    );
  }

  const client = clientResult.client;

  // Fetch related data directly to avoid modifying shared actions
  const [contacts, opportunities] = await Promise.all([
    prisma.contact.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.opportunity.findMany({
      where: { clientId: id },
      orderBy: { updatedAt: "desc" },
      include: {
        User: { select: { name: true } }
      }
    })
  ]);

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive" | "success" | null | undefined> = {
    active: "success",
    inactive: "secondary",
    trash: "destructive",
  };

  return (
    <div className="space-y-6 max-w-full mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/crm/clients">
                <ArrowLeftIcon className="h-4 w-4" />
            </Link>
        </Button>
        <div>
           <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{client.name || client.company || client.email}</h1>
            <Badge variant={statusColors[client.status] || "default"}>{client.status}</Badge>
           </div>
           <p className="text-muted-foreground text-sm font-medium">
             {client.clientCode} • {client.company}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content: Tabs */}
        <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="flex w-full justify-start h-auto bg-transparent border-b rounded-none p-0 mb-6 gap-8">
                    <TabsTrigger 
                        value="overview" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <Layout className="h-4 w-4" />
                        <span className="font-semibold">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="contacts" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <Users className="h-4 w-4" />
                        <span className="font-semibold">Contacts</span>
                        {contacts.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {contacts.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="opportunities" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">Opportunities</span>
                        {opportunities.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                                {opportunities.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="files" 
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none gap-2 hover:text-primary transition-all"
                    >
                        <FileText className="h-4 w-4" />
                        <span className="font-semibold">Files</span>
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="overview">
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{opportunities.length}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{contacts.length}</div>
                                </CardContent>
                            </Card>
                         </div>
                    </TabsContent>

                    <TabsContent value="contacts">
                        <div className="grid gap-4">
                            {contacts.length === 0 ? (
                                <div className="text-center py-10 border rounded-lg bg-muted/20">
                                    <p className="text-muted-foreground">No contacts associated with this client.</p>
                                </div>
                            ) : (
                                contacts.map(contact => (
                                    <Card key={contact.id} className="overflow-hidden">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">
                                                  <Link 
                                                    href={`/dashboard/crm/contacts/${contact.id}`} 
                                                    className="hover:underline hover:text-primary transition-colors"
                                                  >
                                                    {contact.firstName} {contact.lastName}
                                                  </Link>
                                                </h4>
                                                <div className="text-sm text-muted-foreground flex gap-3 mt-1">
                                                    {contact.email && <span className="flex items-center gap-1"><MailIcon className="h-3 w-3" /> {contact.email}</span>}
                                                    {contact.phone && <span className="flex items-center gap-1"><PhoneIcon className="h-3 w-3" /> {contact.phone}</span>}
                                                </div>
                                            </div>
                                            {contact.role && <Badge variant="outline">{contact.role}</Badge>}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="opportunities">
                         <div className="grid gap-4">
                            {opportunities.length === 0 ? (
                                <div className="text-center py-10 border rounded-lg bg-muted/20">
                                    <p className="text-muted-foreground">No opportunities associated with this client.</p>
                                </div>
                            ) : (
                                opportunities.map(opp => (
                                    <Card key={opp.id} className="overflow-hidden border-l-4 border-l-primary">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-lg">
                                                        <Link 
                                                          href={`/dashboard/crm/opportunities/${opp.id}`} 
                                                          className="hover:underline hover:text-primary transition-colors"
                                                        >
                                                          {opp.title}
                                                        </Link>
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Value: <span className="font-medium text-foreground">৳{Number(opp.value).toLocaleString("en-BD")}</span>
                                                    </p>
                                                </div>
                                                <Badge>{opp.stage}</Badge>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Owner: {opp.User?.name}</span>
                                                <span>Updated: {format(new Date(opp.updatedAt), "PP")}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="files">
                        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden text-card-foreground">
                            <FileManager 
                                path={`crm/clients/${client.id}`} 
                                title="Client Documents" 
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-4">
                    <CardTitle className="text-base font-semibold">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm pt-4">
                     {client.clientCode && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Hash className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Client Code</p>
                                <span className="font-medium">{client.clientCode}</span>
                            </div>
                        </div>
                    )}

                    {client.email && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <MailIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                                <a href={`mailto:${client.email}`} className="font-medium hover:underline truncate block">
                                    {client.email}
                                </a>
                            </div>
                        </div>
                    )}

                    {client.phone && (
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <PhoneIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone</p>
                                <a href={`tel:${client.phone}`} className="font-medium hover:underline">
                                    {client.phone}
                                </a>
                            </div>
                        </div>
                    )}

                    {client.company && (
                         <div className="pt-4 border-t flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <BuildingIcon className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Company</p>
                                <span className="font-medium">{client.company}</span>
                            </div>
                         </div>
                    )}

                    {client.createdByUser && (
                        <div className="pt-4 border-t flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {/* @ts-ignore */}
                                {client.createdByUser?.name?.[0] || "?"}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Created By</p>
                                {/* @ts-ignore */}
                                <span className="font-medium">{client.createdByUser?.name}</span>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Calendar className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Created At</p>
                                <span className="font-medium">{client.createdAt ? format(new Date(client.createdAt), "PPp") : "-"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded">
                                <Clock className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Updated</p>
                                <span className="font-medium">{client.updatedAt ? format(new Date(client.updatedAt), "PPp") : "-"}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
