import { getItemById } from "../_actions/item.action";
import ItemForm from "../_components/itemForm";
import { notFound } from "next/navigation";

interface EditItemPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const result = await getItemById(id);

  if (!result.success || !result.item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ItemForm
        mode="edit"
        initialData={{
          id: result.item.id,
          code: result.item.code,
          description: result.item.description,
          unitId: result.item.unitId,
          unitPrice: Number(result.item.unitPrice),
          categoryId: result.item.categoryId,
          category: result.item.category,
          image: result.item.image,
          status: result.item.status,
        }}
      />
    </div>
  );
}

