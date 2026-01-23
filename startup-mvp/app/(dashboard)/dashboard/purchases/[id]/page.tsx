import { redirect } from "next/navigation";

interface PurchasePageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchasePage({ params }: PurchasePageProps) {
  try {
    const { id } = await params;
    if (!id) {
      redirect("/dashboard/purchases");
      return;
    }
    // Redirect to view page
    redirect(`/dashboard/purchases/${id}/view`);
  } catch (error) {
    redirect("/dashboard/purchases");
  }
}


