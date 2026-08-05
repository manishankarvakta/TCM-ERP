import { redirect } from "next/navigation";

export default function BiometricDevicesRedirectPage() {
  redirect("/dashboard/hr/attendance/devices");
}
