"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated, logItemDeleted } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { type Prisma } from "@prisma/client";

/**
 * Get paginated list of clients with search
 */
export async function getClients(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        clients: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status
    const where: Prisma.ClientWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.status = { not: "trash" };
    }

    // Get total count
    const total = await prisma.client.count({ where });

    // Get clients
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdBy: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getClients error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      clients: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Get client by ID
 */
export async function getClientById(clientId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
      };
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdBy: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!client) {
      return {
        success: false,
        error: "Client not found",
        client: null,
      };
    }

    return {
      success: true,
      client,
    };
  } catch (error) {
    console.error("getClientById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch client",
      client: null,
    };
  }
}

/**
 * Create a new client
 */
export async function createClient(input: {
  name?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  image?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
      };
    }

    // Check if email already exists
    const existingClient = await prisma.client.findUnique({
      where: { email: input.email },
    });

    if (existingClient) {
      return {
        success: false,
        error: "Client with this email already exists",
        client: null,
      };
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name: input.name || null,
        email: input.email,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        country: input.country || null,
        company: input.company || null,
        image: input.image || null,
        status: input.status || "active",
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log client creation
    await logItemCreated(
      session.user.id,
      "Client",
      client.id,
      client.name || client.email,
      { 
        name: client.name, 
        email: client.email,
        phone: client.phone,
        company: client.company,
      }
    );

    // Revalidate clients page
    revalidateBothPaths("clients");

    return {
      success: true,
      client,
    };
  } catch (error) {
    console.error("createClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create client",
      client: null,
    };
  }
}

/**
 * Update a client
 */
export async function updateClient(input: {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  image?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        client: null,
      };
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: input.id },
    });

    if (!existingClient) {
      return {
        success: false,
        error: "Client not found",
        client: null,
      };
    }

    // Check if email is being changed and if new email already exists
    if (input.email !== existingClient.email) {
      const emailExists = await prisma.client.findUnique({
        where: { email: input.email },
      });

      if (emailExists) {
        return {
          success: false,
          error: "Client with this email already exists",
          client: null,
        };
      }
    }

    // Build update data
    const updateData: Prisma.ClientUpdateInput = {
      name: input.name !== undefined ? (input.name || null) : undefined,
      email: input.email,
      phone: input.phone !== undefined ? (input.phone || null) : undefined,
      address: input.address !== undefined ? (input.address || null) : undefined,
      city: input.city !== undefined ? (input.city || null) : undefined,
      state: input.state !== undefined ? (input.state || null) : undefined,
      zip: input.zip !== undefined ? (input.zip || null) : undefined,
      country: input.country !== undefined ? (input.country || null) : undefined,
      company: input.company !== undefined ? (input.company || null) : undefined,
      image: input.image !== undefined ? (input.image || null) : undefined,
    };

    if (input.status) {
      updateData.status = input.status;
    }

    // Update client
    const client = await prisma.client.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        country: true,
        company: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log client update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingClient.name) changes.push("name");
    if (input.email !== existingClient.email) changes.push("email");
    if (input.phone !== existingClient.phone) changes.push("phone");
    if (input.address !== existingClient.address) changes.push("address");
    if (input.city !== existingClient.city) changes.push("city");
    if (input.state !== existingClient.state) changes.push("state");
    if (input.zip !== existingClient.zip) changes.push("zip");
    if (input.country !== existingClient.country) changes.push("country");
    if (input.company !== existingClient.company) changes.push("company");
    if (input.image !== undefined && input.image !== existingClient.image) changes.push("image");
    if (input.status && input.status !== existingClient.status) changes.push("status");

    await logItemUpdated(
      session.user.id,
      "Client",
      client.id,
      changes,
      client.name || client.email,
      { 
        name: client.name, 
        email: client.email,
        phone: client.phone,
        company: client.company,
        changes 
      }
    );

    // Revalidate clients page
    revalidateBothPaths("clients");
    revalidatePath(`/admin/clients/${client.id}`);
    revalidatePath(`/admin/clients/details?id=${client.id}`);

    return {
      success: true,
      client,
    };
  } catch (error) {
    console.error("updateClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update client",
      client: null,
    };
  }
}

/**
 * Delete a client (moves to trash)
 */
export async function deleteClient(clientId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get client info before moving to trash for logging
    const clientToDelete = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, email: true, phone: true, company: true },
    });

    if (!clientToDelete) {
      return {
        success: false,
        error: "Client not found",
      };
    }

    // Move client to trash (soft delete)
    await prisma.client.update({
      where: { id: clientId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logItemDeleted(
      session.user.id,
      "Client",
      clientId,
      clientToDelete.name || clientToDelete.email,
      { 
        name: clientToDelete.name, 
        email: clientToDelete.email,
        phone: clientToDelete.phone,
        company: clientToDelete.company,
      }
    );

    // Revalidate clients page
    revalidateBothPaths("clients");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteClient error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete client",
    };
  }
}

/**
 * Bulk update client status
 */
export async function bulkUpdateClientStatus(
  clientIds: string[],
  status: "active" | "inactive" | "trash"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (clientIds.length === 0) {
      return {
        success: false,
        error: "No clients selected",
      };
    }

    // Get client names for logging
    const clients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
      },
      select: { id: true, name: true, email: true },
    });

    // Update clients
    await prisma.client.updateMany({
      where: {
        id: { in: clientIds },
      },
      data: {
        status,
      },
    });

    // Log bulk update for each client
    for (const client of clients) {
      await logItemUpdated(
        session.user.id,
        "Client",
        client.id,
        ["status"],
        client.name || client.email,
        { name: client.name, email: client.email, status, changes: ["status"] }
      );
    }

    // Revalidate clients page
    revalidateBothPaths("clients");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateClientStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update clients",
    };
  }
}

/**
 * Delete clients permanently
 */
export async function deleteClientsPermanently(clientIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (clientIds.length === 0) {
      return {
        success: false,
        error: "No clients selected",
      };
    }

    // Get client names for logging
    const clients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
        status: "trash", // Only allow deleting clients that are in trash
      },
      select: { id: true, name: true, email: true },
    });

    if (clients.length === 0) {
      return {
        success: false,
        error: "No clients found in trash",
      };
    }

    // Log permanent deletion for each client
    for (const client of clients) {
      await logItemDeleted(
        session.user.id,
        "Client",
        client.id,
        client.name || client.email,
        { name: client.name, email: client.email }
      );
    }

    // Delete clients permanently
    await prisma.client.deleteMany({
      where: {
        id: { in: clientIds },
        status: "trash", // Only allow deleting clients that are in trash
      },
    });

    // Revalidate clients page
    revalidateBothPaths("clients");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteClientsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete clients",
    };
  }
}

