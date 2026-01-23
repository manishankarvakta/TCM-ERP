import { redirect } from "next/navigation";

interface SalePageProps {
  params: Promise<{ id: string }>;
}

export default async function SalePage({ params }: SalePageProps) {
  try {
    const { id } = await params;
    if (!id) {
      redirect("/dashboard/sales");
      return;
    }
    // Redirect to view page
    redirect(`/dashboard/sales/${id}/view`);
  } catch (error) {
    redirect("/dashboard/sales");
  }
}
