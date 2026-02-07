import { ProjectLedgerView } from "./_components/project-ledger-view";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Project Ledger | Dashboard",
  description: "View project-wise financial status for clients",
};

export default async function ProjectLedgerPage() {
  // Fetch clients for the dropdown
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      company: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Transform data for the component
  const clientOptions = clients.map(c => ({
    id: c.id,
    name: c.name || "Unnamed Client",
    company: c.company
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Track advanced billing, invoice application, and outstanding balances per project.
          </p>
        </div>
      </div>
      
      <ProjectLedgerView clients={clientOptions} />
    </div>
  );
}
