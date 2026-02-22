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

  const group = result.group;

  return (
    <div className="space-y-6">
      <GroupForm
        mode="edit"
        initialData={{
          id: group.id,
          code: group.code || undefined,
          name: group.name,
          type: group.type,
          price: group.price,
          description: group.description || undefined,
          sortOrder: group.sortOrder,
          status: group.status,
          items: group.items.map((item: any) => ({
            id: item.id,
            sl: item.sl,
            itemId: item.itemId,
            code: item.code || undefined,
            description: item.description || undefined,
            unit: item.unit || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        }}
      />
    </div>
  );
}
