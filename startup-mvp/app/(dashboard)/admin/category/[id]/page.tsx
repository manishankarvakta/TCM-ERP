import { getCategoryById } from "../_actions/category.action";
import CategoryForm from "../_components/categoryForm";
import { notFound } from "next/navigation";

interface EditCategoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const result = await getCategoryById(id);

  if (!result.success || !result.category) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CategoryForm
        mode="edit"
        initialData={{
          id: result.category.id,
          name: result.category.name,
          description: result.category.description,
          status: result.category.status,
        }}
      />
    </div>
  );
}

