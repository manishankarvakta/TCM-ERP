import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getContactById } from "@/app/actions/crm/contact.action";
import { listActivitiesByContact } from "@/app/actions/crm/activity.action";
import { checkPermission } from "@/lib/permissions";
import ActivitySection from "../../activities/_components/ActivitySection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeftIcon, MailIcon, PhoneIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "peoples.contacts", "view");
  if (!canView) {
      return (
        <div className="p-6">
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            You do not have permission to view Contacts.
          </div>
        </div>
      );
  }

  const { id } = params;

  const [contactResult, activityResult] = await Promise.all([
    getContactById(id),
    listActivitiesByContact(id)
  ]);

  if (!contactResult.success || !contactResult.contact) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {contactResult.error || "Contact not found"}
        </div>
      </div>
    );
  }

  const contact = contactResult.contact;
  const activities = activityResult.success ? activityResult.activities : [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/crm/contacts">
                <ArrowLeftIcon className="h-4 w-4" />
            </Link>
        </Button>
        <div className="flex items-center gap-4">
           <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                    {contact.firstName?.[0]}{contact.lastName?.[0]}
                </AvatarFallback>
           </Avatar>
           <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {contact.firstName} {contact.lastName}
                </h1>
                <p className="text-muted-foreground">{contact.role || "No Role"}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content: Activities */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <ActivitySection 
                        entityId={contact.id} 
                        entityType="contact" 
                        activities={activities}
                    />
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Details */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {contact.email && (
                        <div className="flex items-center gap-2">
                            <MailIcon className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${contact.email}`} className="hover:underline">
                                {contact.email}
                            </a>
                        </div>
                    )}
                    {contact.phone && (
                        <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                                {contact.phone}
                            </a>
                        </div>
                    )}
                    {contact.client && (
                         <div className="pt-4 border-t">
                            <span className="text-muted-foreground block mb-2">Company</span>
                            <div className="flex items-center gap-2">
                                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{contact.client.name}</span>
                            </div>
                         </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
