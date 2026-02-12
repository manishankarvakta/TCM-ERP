"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Get contacts for a specific client (account) or all contacts
 */
export async function getContacts(clientId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", contacts: [] };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.contacts", "view"))) {
      return { success: false, error: "Permission Denied: crm.contacts.view", contacts: [] };
    }

    const contacts = await prisma.contact.findMany({
      where: clientId ? { clientId } : {},
      include: {
        // @ts-ignore
        Client: { select: { name: true, company: true } }
      },
      orderBy: { firstName: "asc" },
    });

    const mappedContacts = contacts.map(c => ({
      ...c,
      // @ts-ignore
      client: c.Client,
      Client: undefined,
      name: `${c.firstName} ${c.lastName}`,
    }));

    return { success: true, contacts: mappedContacts };
  } catch (error) {
    console.error("getContacts error:", error);
    return { success: false, error: "Failed to fetch contacts", contacts: [] };
  }
}



/**
 * Get a single contact by ID
 */
export async function getContactById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.contacts", "view"))) {
      return { success: false, error: "Permission Denied: crm.contacts.view" };
    }

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        // @ts-ignore
        Client: { select: { id: true, name: true, company: true } },
      },
    });

    if (!contact) return { success: false, error: "Contact not found" };

    return {
      success: true,
      contact: {
        ...contact,
        // @ts-ignore
        client: contact.Client,
        Client: undefined,
      },
    };
  } catch (error) {
    console.error("getContactById error:", error);
    return { success: false, error: "Failed to fetch contact" };
  }
}

/**
 * Create a new CRM contact person
 */
export async function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  clientId: string;
  isPrimary?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.contacts", "create"))) {
      return { success: false, error: "Permission Denied: crm.contacts.create" };
    }

    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email: data.email || null,
        phone: data.phone || null,
        role: data.designation || null,
        clientId: data.clientId,
        isPrimary: data.isPrimary || false,
      },
    });

    await logItemCreated(session.user.id, "Contact", contact.id, `${firstName} ${lastName}`, contact);
    revalidateBothPaths("crm/contacts");
    revalidateBothPaths("dashboard/contacts");

    return { success: true, contact };
  } catch (error) {
    console.error("createContact error:", error);
    return { success: false, error: "Failed to create contact" };
  }
}

/**
 * Update CRM contact person
 */
export async function updateContact(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  designation: string;
  clientId: string;
  isPrimary: boolean;
}>) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.contacts", "edit"))) {
      return { success: false, error: "Permission Denied: crm.contacts.edit" };
    }

    const updateData: any = {};
    if (data.name) {
      const nameParts = data.name.trim().split(/\s+/);
      updateData.firstName = nameParts[0] || "Unknown";
      updateData.lastName = nameParts.slice(1).join(" ") || "";
    }
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.designation !== undefined) updateData.role = data.designation || null;
    if (data.clientId) updateData.clientId = data.clientId;
    if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });

    await logItemUpdated(session.user.id, "Contact", id, Object.keys(data), `${contact.firstName} ${contact.lastName}`, data);
    revalidateBothPaths("crm/contacts");
    revalidateBothPaths("dashboard/contacts");

    return { success: true, contact };
  } catch (error) {
    console.error("updateContact error:", error);
    return { success: false, error: "Failed to update contact" };
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.contacts", "delete"))) {
      return { success: false, error: "Permission Denied: crm.contacts.delete" };
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    await logItemDeleted(session.user.id, "Contact", contactId);
    revalidateBothPaths("crm/contacts");
    revalidateBothPaths("dashboard/contacts");

    return { success: true };
  } catch (error) {
    console.error("deleteContact error:", error);
    return { success: false, error: "Failed to delete contact" };
  }
}
