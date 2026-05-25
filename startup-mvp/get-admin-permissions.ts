import { prisma } from "./lib/prisma";

async function main() {
  const adminId = "cmp0zwqbd0000nr01hw91k609";
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    include: {
      PermissionTemplate: true,
      UserPermission: true
    }
  });

  if (!user) {
    console.log("Admin User not found!");
    return;
  }

  console.log("Admin User role:", user.role);
  console.log("Admin User designationTemplateId:", user.designationTemplateId);
  console.log("Admin User template:", user.PermissionTemplate?.name);
  console.log("Admin User UserPermission records count:", user.UserPermission.length);
  
  const timelinePermission = user.UserPermission.find(p => p.module === "projects.timeline");
  console.log("Direct projects.timeline record:", timelinePermission);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
