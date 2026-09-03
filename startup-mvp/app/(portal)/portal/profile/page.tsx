import { getClientPortalContext } from "@/lib/portal-context";
import React from "react";

export default async function PortalProfilePage() {
  const ctx = await getClientPortalContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">Manage your contact name and password settings</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-slate-200 p-6 space-y-6 max-w-xl">
        <h2 className="text-lg font-medium text-slate-900 border-b pb-2">Profile Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <div className="mt-1 block w-full rounded-md border-slate-300 bg-slate-100 p-2 text-slate-500 text-sm">
              {ctx.userEmail}
            </div>
            <p className="text-xs text-slate-400 mt-1">To change your email address, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
