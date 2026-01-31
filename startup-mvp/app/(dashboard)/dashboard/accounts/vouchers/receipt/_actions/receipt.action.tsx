"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ClientForReceipt {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  clientCode: string | null;
  chartOfAccountId: string | null;
  chartOfAccountName: string | null;
}

/**
 * Get clients with their AR accounts for receipt vouchers
 */
export async function getClientsForReceipt(): Promise<{
  success: boolean;
  clients: ClientForReceipt[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", clients: [] };
    }

    const clients = await prisma.client.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        clientCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedClients: ClientForReceipt[] = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company,
      clientCode: c.clientCode,
      chartOfAccountId: c.chartOfAccountId,
      chartOfAccountName: c.ChartOfAccount?.name || null,
    }));

    return { success: true, clients: formattedClients };
  } catch (error) {
    console.error("getClientsForReceipt error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch clients",
      clients: [],
    };
  }
}

/**
 * Get client by ID with AR account
 */
export async function getClientById(clientId: string): Promise<{
  success: boolean;
  client: ClientForReceipt | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", client: null };
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        clientCode: true,
        chartOfAccountId: true,
        ChartOfAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!client) {
      return { success: false, error: "Client not found", client: null };
    }

    return {
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
        clientCode: client.clientCode,
        chartOfAccountId: client.chartOfAccountId,
        chartOfAccountName: client.ChartOfAccount?.name || null,
      },
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
