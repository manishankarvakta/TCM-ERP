import { getGroupById } from "../../_actions/group.action";
import GroupForm from "../../_components/groupForm";
import { notFound } from "next/navigation";

interface EditGroupPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditGroupPage({ params }: EditGroupPageProps) {
  const { id } = await params;
  const result = await getGroupById(id);

  if (!result.success || !result.group) {
    notFound();
  }
  console.log(result);

  return (
    <div className="space-y-6">
      <GroupForm
        mode="edit"
        initialData={{
          id: result.group.id,
          code: result.group.code || undefined,
          description: result.group.description || undefined,
          sortOrder: result.group.sortOrder,
          status: result.group.status,
          items: result.group.items.map((item) => ({
            id: item.id,
            sl: item.sl,
            code: item.code || undefined,
            description: item.description || undefined,
            height: item.height || undefined,
            width: item.width || undefined,
            depth: item.depth || undefined,
            unit: item.unit || undefined,
            baseUnit: item.baseUnit || undefined,
            baseUnitPrice: item.baseUnitPrice || undefined,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        }}
      />
    </div>
  );
}

