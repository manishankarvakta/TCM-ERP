import { redirect } from "next/navigation";

interface PurchasePageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchasePage({ params }: PurchasePageProps) {
  try {
    const { id } = await params;
    if (!id) {
      redirect("/dashboard/procurements/purchases");
      return;
    }
    // Redirect to view page
    redirect(`/dashboard/procurements/purchases/${id}/view`);
  } catch (error) {
    redirect("/dashboard/procurements/purchases");
  }
}


