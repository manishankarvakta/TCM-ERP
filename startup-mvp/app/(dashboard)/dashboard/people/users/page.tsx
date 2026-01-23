import { redirect } from "next/navigation";

// Redirect /dashboard/people/users to /dashboard/users
export default function PeopleUsersPage() {
  redirect("/dashboard/users");
}
