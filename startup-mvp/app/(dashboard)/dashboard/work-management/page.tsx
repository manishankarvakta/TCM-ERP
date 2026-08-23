import { redirect } from "next/navigation";

export default function WorkManagementRedirectPage() {
  redirect("/dashboard/projects");
}
