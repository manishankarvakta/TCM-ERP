import fs from 'fs';

const filePath = 'app/(dashboard)/dashboard/procurements/tpn/_actions/tpn.action.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldGetTPNs = `export async function getTPNs(searchQuery?: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: [] };
    }

    const where: Prisma.TransferPurchaseNoteWhereInput = searchQuery
      ? {
          OR: [
            { tpnNumber: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {};

    const tpns = await prisma.transferPurchaseNote.findMany({
      where,
      include: {
        sourceWarehouse: { select: { name: true } },
        destinationWarehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: tpns };
  } catch (error) {
    console.error("getTPNs error:", error);
    return { success: false, error: "Failed to load TPNs", data: [] };
  }
}`;

const newGetTPNs = `export async function getTPNs(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { 
        success: false, 
        error: "Unauthorized", 
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    const skip = (page - 1) * limit;

    const where: Prisma.TransferPurchaseNoteWhereInput = {
      isTrash: status === "trash",
    };

    if (search) {
      where.OR = [
        { tpnNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.transferPurchaseNote.count({ where });

    const tpns = await prisma.transferPurchaseNote.findMany({
      where,
      skip,
      take: limit,
      include: {
        sourceWarehouse: { select: { name: true } },
        destinationWarehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);

    return { 
      success: true, 
      data: tpns,
      pagination: { page, limit, total, totalPages },
    };
  } catch (error) {
    console.error("getTPNs error:", error);
    return { 
      success: false, 
      error: "Failed to load TPNs", 
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }
}`;

content = content.replace(oldGetTPNs, newGetTPNs);

const additionalFunctions = `

export async function deleteTPN(tpnId: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    const tpn = await prisma.transferPurchaseNote.findUnique({
      where: { id: tpnId },
      select: { 
        id: true, 
        tpnNumber: true, 
        isTrash: true,
        status: true,
      },
    });

    if (!tpn) {
      return { success: false, error: "TPN not found" };
    }

    if (tpn.status !== TransferStatus.DRAFT) {
      return { 
        success: false, 
        error: "Only DRAFT TPNs can be moved to trash. Shipped or Received TPNs cannot be deleted." 
      };
    }

    await prisma.transferPurchaseNote.update({
      where: { id: tpnId },
      data: { isTrash: true },
    });

    await logItemDeleted(
      userId,
      "TransferPurchaseNote",
      tpnId,
      tpn.tpnNumber
    );

    revalidateBothPaths("/dashboard/procurements/tpn");

    return { success: true };
  } catch (error) {
    console.error("deleteTPN error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete TPN",
    };
  }
}

export async function bulkUpdateTPNStatus(
  tpnIds: string[],
  action: "trash" | "restore"
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (tpnIds.length === 0) {
      return { success: false, error: "No TPNs selected" };
    }

    if (action === "trash") {
      // only draft tpns can be trashed
      const tpnsToTrash = await prisma.transferPurchaseNote.findMany({
        where: { id: { in: tpnIds }, status: TransferStatus.DRAFT }
      });
      const validIds = tpnsToTrash.map(t => t.id);
      if (validIds.length === 0) {
        return { success: false, error: "Only DRAFT TPNs can be moved to trash" };
      }
      await prisma.transferPurchaseNote.updateMany({
        where: { id: { in: validIds } },
        data: { isTrash: true },
      });
    } else if (action === "restore") {
      await prisma.transferPurchaseNote.updateMany({
        where: { id: { in: tpnIds } },
        data: { isTrash: false },
      });
    }

    revalidateBothPaths("/dashboard/procurements/tpn");
    return { success: true };
  } catch (error) {
    console.error("bulkUpdateTPNStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update TPNs",
    };
  }
}

export async function deleteTPNsPermanently(tpnIds: string[]) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "system";

    if (tpnIds.length === 0) {
      return { success: false, error: "No TPNs selected" };
    }

    const tpns = await prisma.transferPurchaseNote.findMany({
      where: { id: { in: tpnIds }, isTrash: true },
      select: { id: true, tpnNumber: true },
    });

    if (tpns.length === 0) {
      return { success: false, error: "No TPNs found in trash" };
    }

    for (const tpn of tpns) {
      await logItemDeleted(
        userId,
        "TransferPurchaseNote",
        tpn.id,
        tpn.tpnNumber
      );
    }

    // Must delete items first due to foreign keys, unless cascade delete is set
    await prisma.transferPurchaseNoteItem.deleteMany({
      where: { tpnId: { in: tpnIds } }
    });

    await prisma.transferPurchaseNote.deleteMany({
      where: { id: { in: tpnIds }, isTrash: true },
    });

    revalidateBothPaths("/dashboard/procurements/tpn");
    return { success: true };
  } catch (error) {
    console.error("deleteTPNsPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete TPNs",
    };
  }
}
`;

content += additionalFunctions;

fs.writeFileSync(filePath, content);
console.log("Patched tpn.action.ts successfully.");
