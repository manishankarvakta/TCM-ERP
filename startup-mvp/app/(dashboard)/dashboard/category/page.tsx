import { redirect } from "next/navigation";

export default function LegacyCategoriesPage() {
  redirect("/dashboard/items/category");
}
