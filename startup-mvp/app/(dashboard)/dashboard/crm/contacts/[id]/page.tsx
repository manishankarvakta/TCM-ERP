import { getContactById } from "@/app/actions/crm/contact.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Mail, Phone, User } from "lucide-react";
import ActivitySection from "../../activities/_components/ActivitySection";
import { listActivitiesByContact } from "@/app/actions/crm/activity.action";

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;

  const [contactResult, activityResult] = await Promise.all([
    getContactById(id),
    listActivitiesByContact(id),
  ]);

  if (!contactResult.success || !contactResult.contact) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {contactResult.error || "Contact not found"}
        </div>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard/crm/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Link>
        </Button>
      </div>
    );
  }

  const { contact } = contactResult;
  const activities = activityResult.success ? activityResult.activities : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/crm/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {contact.firstName} {contact.lastName}
          </h1>
          <p className="text-muted-foreground">{contact.role || "No Role"}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </div>
                  <p>{contact.email || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4" />
                    Phone
                  </div>
                  <p>{contact.phone || "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-2 h-4 w-4" />
                    Primary Contact
                  </div>
                  <p>{contact.isPrimary ? "Yes" : "No"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    Created At
                  </div>
                  <p>{new Date(contact.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivitySection
                activities={activities}
                entityId={contact.id}
                entityType="contact"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Client Card */}
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.client ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Link 
                        href={`/dashboard/crm/clients/${contact.client.id}`}
                        className="font-medium hover:underline"
                      >
                        {contact.client.company || contact.client.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">Client</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No organization linked</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
