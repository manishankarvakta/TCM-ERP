import { redirect } from "next/navigation";
import { getClientPortalContext } from "@/lib/portal-context";
import Link from "next/link";
import React from "react";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getClientPortalContext();
  } catch (error) {
    redirect("/login");
  }

  const menuItems = [
    { label: "Overview", href: "/portal" },
    { label: "Projects", href: "/portal/projects" },
    { label: "Billing", href: "/portal/billing" },
    { label: "Support", href: "/portal/support" },
    { label: "Change Requests", href: "/portal/change-requests" },
    { label: "Files", href: "/portal/files" },
    { label: "Notifications", href: "/portal/notifications" },
    { label: "Profile", href: "/portal/profile" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 text-white">
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <Link href="/portal" className="text-lg font-bold tracking-wider text-teal-400">
            CLIENT PORTAL
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500">Logged in as</div>
          <div className="text-sm font-medium truncate">{ctx.userEmail}</div>
          <Link
            href="/api/auth/signout"
            className="block mt-2 text-xs text-red-400 hover:underline"
          >
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-white px-6 shadow-sm border-b border-slate-200">
          <div className="text-lg font-semibold text-slate-800">Welcome to your Client Portal</div>
          <div className="flex items-center space-x-4 md:hidden">
            <Link href="/portal" className="text-teal-600 font-bold">Portal</Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
