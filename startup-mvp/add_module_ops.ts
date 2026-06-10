import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const tpnOperations = [
    { operation: "create", label: "Create TPN" },
    { operation: "view", label: "View TPN" },
    { operation: "edit", label: "Edit TPN" },
    { operation: "approve", label: "Approve/Receive TPN" },
    { operation: "move-to-trash", label: "Move TPN to Trash" },
    { operation: "delete-permanently", label: "Delete TPN Permanently" },
  ];

  for (const op of tpnOperations) {
    await prisma.moduleOperation.upsert({
      where: {
        module_operation: {
          module: "inventory.tpn",
          operation: op.operation,
        },
      },
      update: {
        label: op.label,
        isActive: true,
      },
      create: {
        module: "inventory.tpn",
        operation: op.operation,
        label: op.label,
        isActive: true,
      },
    });
  }
  console.log("Added ModuleOperation records for inventory.tpn");
}
main().catch(console.error).finally(() => prisma.$disconnect());
