"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess, verifyParentTenantAccess } from "@/lib/tenant-context";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Get contacts for a specific client (account) or all contacts with pagination
 */
export async function getContacts(clientId?: string, search?: string, page: number = 1, limit: number = 10) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", contacts: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    // Permission Check
    const { checkPermission } = await import("@/lib/permissions");
    if (!(await checkPermission(session.user.id, "crm.contacts", "view"))) {
      return { success: false, error: "Permission Denied: crm.contacts.view", contacts: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (clientId && clientId !== "all") {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.contact.count({ where });

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        // @ts-ignore
        Client: { select: { name: true, company: true, clientCode: true } }
      },
      orderBy: { 
        Client: { 
          clientCode: "asc" 
        } 
      },
      skip,
      take: limit,
    });

    const mappedContacts = contacts.map(c => ({
      ...c,
      client: (c as any).Client,
      Client: undefined,
      name: `${c.firstName} ${c.lastName}`,
      designation: c.role,
    }));

    const totalPages = Math.ceil(total / limit);

    return { 
      success: true, 
      contacts: mappedContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  } catch (error) {
    console.error("getContacts error:", error);
    return { 
      success: false, 
      error: "Failed to fetch contacts", 
      contacts: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
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
        Client: { select: { id: true, name: true, company: true, clientCode: true } },
      },
    });

    if (!contact) return { success: false, error: "Contact not found" };

    return {
      success: true,
      contact: {
        ...contact,
        client: (contact as any).Client,
        Client: undefined,
        name: `${contact.firstName} ${contact.lastName}`,
        designation: contact.role,
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
// @ts-expect-error - Legacy compatibility
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
    
    // Emit System Event for Timeline
    const { emitSystemEvent } = await import("@/lib/system/hooks");
    await emitSystemEvent({
      entityType: "contact",
      entityId: contact.id,
      eventType: "CONTACT_CREATED",
      actorId: session.user.id,
      description: `Contact created: ${firstName} ${lastName}`,
    });

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

    const oldContact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!oldContact) return { success: false, error: "Contact not found" };

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
    
    // Structured change tracking
    const changes: any[] = [];
    const newFirstName = updateData.firstName;
    const newLastName = updateData.lastName;
    
    // Name check is a bit tricky since we split it.
    if (newFirstName && newFirstName !== oldContact.firstName) {
        changes.push({ field: "firstName", from: oldContact.firstName, to: newFirstName });
    }
    if (newLastName !== undefined && newLastName !== oldContact.lastName) { // lastName can be empty string
        changes.push({ field: "lastName", from: oldContact.lastName, to: newLastName });
    }

    if (updateData.email !== undefined && updateData.email !== oldContact.email) {
         changes.push({ field: "email", from: oldContact.email, to: updateData.email });
    }
    if (updateData.phone !== undefined && updateData.phone !== oldContact.phone) {
         changes.push({ field: "phone", from: oldContact.phone, to: updateData.phone });
    }
    if (updateData.role !== undefined && updateData.role !== oldContact.role) {
         changes.push({ field: "role", from: oldContact.role, to: updateData.role });
    }
    if (updateData.clientId && updateData.clientId !== oldContact.clientId) {
         changes.push({ field: "clientId", from: oldContact.clientId, to: updateData.clientId });
    }
    if (updateData.isPrimary !== undefined && updateData.isPrimary !== oldContact.isPrimary) {
         changes.push({ field: "isPrimary", from: oldContact.isPrimary, to: updateData.isPrimary });
    }

    if (changes.length > 0) {
        // Emit System Event for Timeline
        const { emitSystemEvent } = await import("@/lib/system/hooks");
        await emitSystemEvent({
        entityType: "contact",
        entityId: contact.id,
        eventType: "CONTACT_UPDATED",
        actorId: session.user.id,
        description: `Contact updated: ${contact.firstName} ${contact.lastName}`,
        metadata: { changes }
        });
    }

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
