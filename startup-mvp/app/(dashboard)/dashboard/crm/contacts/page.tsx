import ContactManager from "./_components/ContactManager";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getContacts } from "@/app/actions/crm/contact.action";
import { getActiveClients } from "@/app/actions/clients";
import { Card, CardContent } from "@/components/ui/card";

export default async function CRM_ContactsPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  const canView = await checkPermission(session.user.id, "crm.contacts", "view");
  if (!canView) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          You do not have permission to view Contacts.
        </div>
      </div>
    );
  }

  const [contactsResult, clientsResult, canCreate] = await Promise.all([
    getContacts(),
    getActiveClients(),
    checkPermission(session.user.id, "peoples.contacts", "create")
  ]);

  if (!contactsResult.success) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load contacts: {contactsResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className=" h-full flex flex-col">
      <ContactManager 
        initialContacts={contactsResult.contacts || []} 
        clients={clientsResult.clients || []}
        canCreate={canCreate}
      />
    </div>
  );
}
